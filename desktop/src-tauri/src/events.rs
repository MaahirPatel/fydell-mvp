//! Append-only session evidence log (JSONL).
//!
//! Recorded while a session is active, viewable by the candidate at any time,
//! and shipped with the submission as the evidence trail. Nothing is recorded
//! outside an active session.

use crate::error::{AppError, AppResult};
use crate::session;
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(1);

#[derive(Serialize)]
pub struct Event {
    pub seq: u64,
    pub ts: String,
    pub kind: String,
    pub payload: serde_json::Value,
}

fn log_path() -> AppResult<std::path::PathBuf> {
    Ok(session::workspace_dir()?.join(".fydell").join("events.jsonl"))
}

/// Internal helper for Rust-side events (session start, file saves, ...).
pub fn log_system_event(kind: &str, payload: serde_json::Value) -> AppResult<()> {
    session::require_active()?;
    let event = Event {
        seq: SEQ.fetch_add(1, Ordering::SeqCst),
        ts: chrono::Utc::now().to_rfc3339(),
        kind: kind.to_string(),
        payload,
    };
    let mut line = serde_json::to_string(&event)?;
    line.push('\n');
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path()?)?;
    f.write_all(line.as_bytes())?;
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct FrontendEvent {
    pub kind: String,
    pub payload: serde_json::Value,
}

/// Tauri command: let the frontend record session events (test runs from the
/// UI, milestone acknowledgements, simulated-teammate messages, ...).
#[tauri::command]
pub fn append_event(event: FrontendEvent) -> AppResult<u64> {
    // Allowlist: the frontend may only record known session event kinds.
    const ALLOWED: &[&str] = &[
        "tests_run",
        "milestone_acknowledged",
        "message_sent",
        "brief_opened",
        "report_viewed",
    ];
    if !ALLOWED.contains(&event.kind.as_str()) {
        return Err(AppError::Execution(format!(
            "event kind not allowed: {}",
            event.kind
        )));
    }
    let seq = SEQ.fetch_add(1, Ordering::SeqCst);
    let full = Event {
        seq,
        ts: chrono::Utc::now().to_rfc3339(),
        kind: event.kind,
        payload: event.payload,
    };
    let mut line = serde_json::to_string(&full)?;
    line.push('\n');
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path()?)?;
    f.write_all(line.as_bytes())?;
    Ok(seq)
}

/// Tauri command: read the full event log (the candidate's own evidence trail).
#[tauri::command]
pub fn get_events() -> AppResult<Vec<Event>> {
    session::require_active()?;
    let path = log_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path)?;
    let mut out = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let event: Event = serde_json::from_str(line)?;
        if event.seq >= SEQ.load(Ordering::SeqCst) {
            SEQ.store(event.seq + 1, Ordering::SeqCst);
        }
        out.push(event);
    }
    Ok(out)
}
