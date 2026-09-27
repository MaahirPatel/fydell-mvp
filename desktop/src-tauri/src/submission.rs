//! Submission through the real platform route.
//!
//! `POST /api/sim/sessions/{id}/submit` (src/app/api/sim/sessions/[id]/submit/route.ts)
//! accepts `{ externalAiDisclosed, answers }` and is idempotent — it returns
//! `{ ok, submissionId, alreadySubmitted }`. The platform scores deliverable
//! fields, not file snapshots, so before submitting the desktop folds the
//! local file snapshot into `state.workspace` via PATCH (optimistic
//! concurrency; one retry on conflict), and passes the handoff plus the AI
//! disclosure through `answers` (the route honors the `__aiDisclosure` key).
//!
//! Web addition W4 (see ARCHITECTURE.md) would let the platform accept the
//! file snapshot natively; until then the PATCH-then-submit sequence is the
//! honest mapping, and the local SHA-256 receipt covers the exact bytes.
//!
//! The workspace becomes read-only after a successful submit.

use crate::error::{AppError, AppResult};
use crate::platform::{Platform, StatePatch};
use crate::session;
use serde::Serialize;

#[derive(Serialize)]
pub struct Receipt {
    /// Platform submission id (durable handle for the submission).
    pub submission_id: String,
    /// SHA-256 over the exact local file bytes + event log at submit time.
    pub sha256: String,
    pub title: Option<String>,
    pub submitted_at: String,
    pub file_count: usize,
    pub event_count: usize,
    pub already_submitted: bool,
    // Kept for the existing receipt UI.
    pub scenario_id: Option<String>,
    pub scenario_version: Option<String>,
    pub platform_receipt_id: Option<String>,
}

/// Tauri command: submit the session.
#[tauri::command]
pub async fn submit(handoff: serde_json::Value, external_ai_disclosed: bool) -> AppResult<Receipt> {
    session::require_active()?;
    let dir = session::workspace_dir()?;
    let session_id = session::platform_session_id()?;
    let platform = Platform::new();

    // 1. Snapshot every workspace file (excluding .fydell internals).
    let mut files: Vec<(String, String)> = Vec::new();
    collect_files(&dir, &dir, &mut files)?;
    files.sort_by(|a, b| a.0.cmp(&b.0));

    // 2. Load the evidence log.
    let events = crate::events::get_events()?;

    // 3. Local receipt hash over sorted (path, content) + events.
    let digest = {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        for (path, content) in &files {
            h.update(path.as_bytes());
            h.update([0u8]);
            h.update(content.as_bytes());
            h.update([0u8]);
        }
        for e in &events {
            h.update(e.seq.to_string().as_bytes());
            h.update([0u8]);
            h.update(e.kind.as_bytes());
            h.update([0u8]);
            h.update(
                serde_json::to_string(&e.payload)
                    .unwrap_or_default()
                    .as_bytes(),
            );
            h.update([0u8]);
        }
        hex::encode(h.finalize())
    };

    // 4. Fold the file snapshot into platform state (PATCH, one conflict retry).
    let files_obj: serde_json::Map<String, serde_json::Value> = files
        .iter()
        .map(|(p, c)| (p.clone(), serde_json::Value::String(c.clone())))
        .collect();
    let mut patch = StatePatch {
        base_revision: session::server_revision(),
        workspace: Some(serde_json::json!({ "files": files_obj })),
        ..Default::default()
    };
    // Carry the handoff text as notes so reviewers see it in the session state.
    if let Some(summary) = handoff.get("summary").and_then(|v| v.as_str()) {
        patch.notes = Some(summary.to_string());
    }
    let mut attempts = 0;
    let new_rev = loop {
        match platform.patch_state(&session_id, &patch).await? {
            Ok(rev) => break rev,
            Err(conflict) => {
                attempts += 1;
                if attempts > 1 {
                    return Err(AppError::RevisionConflict {
                        expected: patch.base_revision,
                        actual: conflict.revision,
                    });
                }
                session::set_server_revision(conflict.revision);
                patch.base_revision = conflict.revision;
            }
        }
    };
    session::set_server_revision(new_rev);

    // 5. Submit (idempotent). The handoff travels in `answers`; the AI
    //    disclosure uses the route's honored `__aiDisclosure` key.
    let mut answers = serde_json::Map::new();
    answers.insert("handoff".to_string(), handoff);
    answers.insert(
        "__aiDisclosure".to_string(),
        serde_json::json!({ "used": external_ai_disclosed }),
    );
    let (submission_id, already_submitted) = platform
        .submit(
            &session_id,
            &serde_json::Value::Object(answers),
            external_ai_disclosed,
        )
        .await?;

    // 6. Persist the local receipt and lock the session.
    let submitted_at = chrono::Utc::now().to_rfc3339();
    let info = crate::session::session_status().unwrap();
    let receipt = Receipt {
        submission_id: submission_id.clone(),
        sha256: digest,
        title: info.title.clone(),
        submitted_at,
        file_count: files.len(),
        event_count: events.len(),
        already_submitted,
        scenario_id: info.scenario_id.clone(),
        scenario_version: info.scenario_version.clone(),
        platform_receipt_id: Some(submission_id.clone()),
    };
    std::fs::write(
        dir.join(".fydell").join("receipt.json"),
        serde_json::to_string_pretty(&receipt)?,
    )?;
    let _ = crate::events::log_system_event(
        "session_submitted",
        serde_json::json!({ "submission_id": submission_id, "sha256": receipt.sha256 }),
    );
    session::mark_submitted()?;

    Ok(receipt)
}

fn collect_files(
    dir: &std::path::Path,
    root: &std::path::Path,
    out: &mut Vec<(String, String)>,
) -> AppResult<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_dir() {
            if p.file_name().and_then(|n| n.to_str()) == Some(".fydell") {
                continue;
            }
            collect_files(&p, root, out)?;
        } else {
            let rel = p
                .strip_prefix(root)
                .map_err(|_| AppError::PathEscape)?
                .to_string_lossy()
                .replace('\\', "/");
            // BRIEF.md is generated read-only content, not candidate work.
            if rel == "BRIEF.md" {
                continue;
            }
            let content = std::fs::read_to_string(&p)
                .map_err(|e| AppError::Io(format!("cannot snapshot {}: {e}", rel)))?;
            out.push((rel, content));
        }
    }
    Ok(())
}
