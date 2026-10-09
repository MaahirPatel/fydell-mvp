//! Session evidence log.
//!
//! Two layers:
//!
//! 1. Local append-only JSONL in the workspace — the candidate's own,
//!    inspectable evidence trail. Recorded only while a session exists.
//! 2. Platform events — `POST /api/sim/sessions/{id}/events`
//!    (src/app/api/sim/sessions/[id]/events/route.ts). The route enforces a
//!    whitelist (`ALLOWED_CANDIDATE_EVENTS`); the desktop maps its local kinds
//!    onto it. Posting is best-effort: the local log is the source of truth
//!    and a failed post never blocks the candidate.
//!
//! Nothing is recorded outside a session. No keystroke logging, no screen
//! capture, no process monitoring.

use crate::error::{AppError, AppResult};
use crate::platform::{Platform, PlatformEvent, ALLOWED_EVENT_TYPES};
use crate::session;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(1);

#[derive(Serialize, Deserialize)]
pub struct Event {
    pub seq: u64,
    pub ts: String,
    pub kind: String,
    pub payload: serde_json::Value,
    /// Platform event id when the post succeeded; None when local-only.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform_event_id: Option<String>,
}

fn log_path() -> AppResult<std::path::PathBuf> {
    Ok(session::workspace_dir()?
        .join(".fydell")
        .join("events.jsonl"))
}

fn write_event(event: &Event) -> AppResult<()> {
    let mut line = serde_json::to_string(event)?;
    line.push('\n');
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path()?)?;
    f.write_all(line.as_bytes())?;
    Ok(())
}

/// Map a local event kind onto the platform whitelist.
/// Returns None for local-only events (session lifecycle markers the
/// platform already knows about).
fn map_to_platform(kind: &str, payload: &serde_json::Value) -> Option<PlatformEvent> {
    let (event_type, resource_id, task_id) = match kind {
        "brief_opened" => ("resource_opened", Some("brief".to_string()), None),
        "curveball_acknowledged" => ("curveball_acknowledged", None, None),
        "task_completed" => ("task_completed", None, None),
        "task_reopened" => ("task_reopened", None, None),
        // Everything else the desktop observes is generic workspace activity.
        "file_saved" | "tests_run" | "milestone_acknowledged" | "message_sent" => {
            ("workspace_action", None, None)
        }
        _ => return None,
    };
    debug_assert!(ALLOWED_EVENT_TYPES.contains(&event_type));
    let mut merged = payload.clone();
    if kind != "workspace_action" {
        // Keep the local kind visible inside the payload for the reviewer.
    }
    if merged.get("local_kind").is_none() {
        merged["local_kind"] = serde_json::Value::String(kind.to_string());
    }
    Some(PlatformEvent {
        event_type: event_type.to_string(),
        resource_id,
        task_id,
        payload: Some(merged),
        client_event_id: Some(format!("fydell-desktop-{}", uuid::Uuid::new_v4())),
    })
}

/// Record an event locally and, when the session is active, on the platform.
pub(crate) async fn record(kind: &str, payload: serde_json::Value) -> AppResult<u64> {
    let seq = SEQ.fetch_add(1, Ordering::SeqCst);

    // Best-effort platform post. Only when the local session is active (the
    // route 409s otherwise) — and never blocking the candidate on failure.
    let mut platform_event_id = None;
    let is_active = session::require_active().is_ok();
    if is_active {
        if let Some(platform_event) = map_to_platform(kind, &payload) {
            if let Ok(session_id) = session::platform_session_id() {
                match Platform::new()
                    .post_event(&session_id, &platform_event)
                    .await
                {
                    Ok((id, _)) => platform_event_id = Some(id),
                    Err(_) => { /* local log remains the source of truth */ }
                }
            }
        }
    }

    let event = Event {
        seq,
        ts: chrono::Utc::now().to_rfc3339(),
        kind: kind.to_string(),
        payload,
        platform_event_id,
    };
    write_event(&event)?;
    Ok(seq)
}

/// Internal helper for Rust-side events (session lifecycle, file saves, ...).
pub fn log_system_event(kind: &str, payload: serde_json::Value) -> AppResult<()> {
    // System events fire during join/begin too, when there is no workspace
    // yet — write them only once a workspace exists.
    if session::workspace_dir().is_err() {
        return Ok(());
    }
    let seq = SEQ.fetch_add(1, Ordering::SeqCst);
    let event = Event {
        seq,
        ts: chrono::Utc::now().to_rfc3339(),
        kind: kind.to_string(),
        payload,
        platform_event_id: None,
    };
    write_event(&event)
}

#[derive(serde::Deserialize)]
pub struct FrontendEvent {
    pub kind: String,
    pub payload: serde_json::Value,
}

/// Tauri command: let the frontend record session events.
/// Only known local kinds are accepted; unknown kinds are rejected rather
/// than silently dropped.
#[tauri::command]
pub async fn append_event(event: FrontendEvent) -> AppResult<u64> {
    const ALLOWED: &[&str] = &[
        "brief_opened",
        "tests_run",
        "milestone_acknowledged",
        "message_sent",
        "curveball_acknowledged",
        "task_completed",
        "task_reopened",
    ];
    if !ALLOWED.contains(&event.kind.as_str()) {
        return Err(AppError::Execution(format!(
            "event kind not allowed: {}",
            event.kind
        )));
    }
    record(&event.kind, event.payload).await
}

/// Tauri command: read the full event log (the candidate's own evidence trail).
#[tauri::command]
pub fn get_events() -> AppResult<Vec<Event>> {
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
        // Tolerate older entries written before platform_event_id existed.
        let mut value: serde_json::Value = serde_json::from_str(line)?;
        if value.get("platform_event_id").is_none() {
            value["platform_event_id"] = serde_json::Value::Null;
        }
        let event: Event = serde_json::from_value(value)?;
        if event.seq >= SEQ.load(Ordering::SeqCst) {
            SEQ.store(event.seq + 1, Ordering::SeqCst);
        }
        out.push(event);
    }
    Ok(out)
}
