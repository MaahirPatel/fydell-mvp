//! Submission through the real platform route.
//!
//! `POST /api/sim/sessions/{id}/submit` (src/app/api/sim/sessions/[id]/submit/route.ts)
//! accepts `{ externalAiDisclosed, answers, fileSnapshot? }` and is idempotent —
//! it returns `{ ok, submissionId, alreadySubmitted, receiptHash? }`.
//!
//! W4 (implemented): when the session was materialized from a verified file
//! package (`.fydell/package.json` pin present), the desktop sends the full
//! file snapshot in the submit body. The server recomputes every manifest
//! hash, rejects any mismatch, computes the receipt hash itself, and stores
//! everything transactionally via `submit_session_atomic` — all files or
//! none. The server receipt hash is the authoritative tamper-evidence handle;
//! the local SHA-256 receipt covers the exact local bytes plus the event log.
//!
//! Fallback: sessions without a package pin (older sessions, non-scenario
//! templates) fold the file snapshot into `state.workspace` via PATCH
//! (optimistic concurrency; one retry on conflict) before submitting, and
//! keep the local receipt only.
//!
//! The workspace becomes read-only after a successful submit.
//!
//! Integrity model (stated precisely): the receipt proves the stored artifact
//! is byte-identical to what the client sent, and which scenario version the
//! work started from. It does not prove who typed the bytes.

use crate::error::{AppError, AppResult};
use crate::platform::{FileSnapshot, Platform, StatePatch};
use crate::session;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize)]
pub struct Receipt {
    /// Platform submission id (durable handle for the submission).
    pub submission_id: String,
    /// SHA-256 over the exact local file bytes + event log at submit time.
    pub sha256: String,
    /// W4: server-computed receipt hash (authoritative tamper-evidence handle).
    /// None for the legacy PATCH-fold path.
    pub server_receipt_hash: Option<String>,
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

    // 4. Submit the file artifact.
    //
    // W4 primary path: the session was materialized from a verified package
    // (`.fydell/package.json` pin). Build the file snapshot with per-file
    // SHA-256 over the CURRENT contents and send it in the submit body; the
    // server validates every hash, computes the receipt itself, and stores
    // everything transactionally. The PATCH-fold is superseded here.
    let package_pin: Option<serde_json::Value> =
        std::fs::read_to_string(dir.join(".fydell").join("package.json"))
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok());

    let (submission_id, already_submitted, server_receipt_hash) = if let Some(pin) = package_pin {
        let scenario_id = pin
            .get("scenarioId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let scenario_version = pin
            .get("scenarioVersion")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let snapshot = build_file_snapshot(&files, scenario_id, scenario_version);
        let mut answers = serde_json::Map::new();
        answers.insert("handoff".to_string(), handoff);
        answers.insert(
            "__aiDisclosure".to_string(),
            serde_json::json!({ "used": external_ai_disclosed }),
        );
        let (sid, already, receipt) = platform
            .submit(
                &session_id,
                &serde_json::Value::Object(answers),
                external_ai_disclosed,
                Some(&snapshot),
            )
            .await?;
        (sid, already, receipt)
    } else {
        // Legacy path: fold the file snapshot into platform state (PATCH, one
        // conflict retry), then submit without a file snapshot.
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
        let (sid, already, receipt) = platform
            .submit(
                &session_id,
                &serde_json::Value::Object(answers),
                external_ai_disclosed,
                None,
            )
            .await?;
        (sid, already, receipt)
    };

    // 6. Persist the local receipt and lock the session.
    let submitted_at = chrono::Utc::now().to_rfc3339();
    let info = crate::session::session_status().unwrap();
    let receipt = Receipt {
        submission_id: submission_id.clone(),
        sha256: digest,
        server_receipt_hash,
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

/// Build the W4 file snapshot: per-file SHA-256 over the current contents,
/// keyed by path, plus the pinned scenario id/version the work started from.
fn build_file_snapshot(
    files: &[(String, String)],
    scenario_id: String,
    scenario_version: String,
) -> FileSnapshot {
    use sha2::{Digest, Sha256};
    let mut files_map = HashMap::new();
    let mut manifest = HashMap::new();
    for (path, content) in files {
        manifest.insert(
            path.clone(),
            hex::encode(Sha256::digest(content.as_bytes())),
        );
        files_map.insert(path.clone(), content.clone());
    }
    FileSnapshot {
        scenario_id,
        scenario_version,
        files: files_map,
        manifest,
    }
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
