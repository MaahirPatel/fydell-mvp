//! Submission: freeze a snapshot, compute the SHA-256 receipt, upload.
//!
//! The workspace becomes read-only after a successful submit. The receipt is
//! shown to the candidate and is the durable handle for the submission.

use crate::error::{AppError, AppResult};
use crate::platform::ScenarioFile;
use crate::session;
use serde::Serialize;
use uuid::Uuid;

#[derive(Serialize)]
pub struct Receipt {
    pub submission_id: String,
    pub sha256: String,
    pub scenario_id: String,
    pub scenario_version: String,
    pub submitted_at: String,
    pub file_count: usize,
    pub event_count: usize,
    pub platform_receipt_id: Option<String>,
}

/// Tauri command: submit the session.
#[tauri::command]
pub async fn submit(handoff: serde_json::Value) -> AppResult<Receipt> {
    session::require_active()?;
    let dir = session::workspace_dir()?;
    let (scenario_id, scenario_version, token) = session::submission_context()?;

    // 1. Snapshot every workspace file (excluding .fydell internals).
    let mut files: Vec<ScenarioFile> = Vec::new();
    collect_files(&dir, &dir, &mut files)?;
    files.sort_by(|a, b| a.path.cmp(&b.path));

    // 2. Load the evidence log.
    let events = crate::events::get_events()?;

    // 3. Compute the receipt hash over sorted (path, content) + events.
    let digest = {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        for f in &files {
            h.update(f.path.as_bytes());
            h.update([0u8]);
            h.update(f.content.as_bytes());
            h.update([0u8]);
        }
        for e in &events {
            h.update(e.seq.to_string().as_bytes());
            h.update([0u8]);
            h.update(e.kind.as_bytes());
            h.update([0u8]);
            h.update(serde_json::to_string(&e.payload).unwrap_or_default().as_bytes());
            h.update([0u8]);
        }
        hex::encode(h.finalize())
    };

    let submission_id = Uuid::new_v4().to_string();
    let submitted_at = chrono::Utc::now().to_rfc3339();

    // 4. Upload.
    let upload = crate::platform::SubmissionUpload {
        scenario_id: &scenario_id,
        scenario_version: &scenario_version,
        submission_id: &submission_id,
        sha256: &digest,
        submitted_at: &submitted_at,
        files: &files,
        events: &events,
        handoff: &handoff,
    };
    let ack = crate::platform::upload_submission(&token, &upload).await?;

    // 5. Persist the receipt locally and lock the session.
    let receipt = Receipt {
        submission_id: submission_id.clone(),
        sha256: digest,
        scenario_id,
        scenario_version,
        submitted_at,
        file_count: files.len(),
        event_count: events.len(),
        platform_receipt_id: Some(ack.receipt_id),
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
    out: &mut Vec<ScenarioFile>,
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
            let content = std::fs::read_to_string(&p).map_err(|e| {
                AppError::Io(format!("cannot snapshot {}: {e}", rel))
            })?;
            out.push(ScenarioFile { path: rel, content });
        }
    }
    Ok(())
}
