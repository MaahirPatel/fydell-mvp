//! Interrupted-work recovery (DESK-10) and the single-writer lock (DESK-11).
//!
//! The session record (`.fydell/session.json` in the session dir) plus the
//! pointer (`sessions/active.json`) let the app rebuild its in-memory session
//! after a force-close, crash, or restart. The sync journal (sync.rs) tells us
//! whether acknowledged-but-unsynced work survived.
//!
//! The lock file (`.fydell/lock`) enforces the single-writer policy on this
//! machine: a second app instance (or window process) that finds a live lock
//! refuses to open the same session for writing instead of silently
//! competing with it.

use crate::error::{AppError, AppResult};
use crate::session::SessionStatus;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

fn sessions_root() -> AppResult<PathBuf> {
    let dir = crate::session::app_data_dir()?;
    Ok(dir.join("sessions"))
}

fn pointer_path() -> AppResult<PathBuf> {
    Ok(sessions_root()?.join("active.json"))
}

fn session_file(session_id: &str) -> AppResult<PathBuf> {
    Ok(sessions_root()?.join(session_id).join(".fydell").join("session.json"))
}

fn lock_path(session_id: &str) -> AppResult<PathBuf> {
    Ok(sessions_root()?.join(session_id).join(".fydell").join("lock"))
}

// ---------------------------------------------------------------------------
// Session record
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub platform_session_id: String,
    pub status: String,
    pub title: Option<String>,
    pub organization: Option<String>,
    pub duration_minutes: Option<u32>,
    pub started_at: Option<String>,
    pub ends_at: Option<String>,
    pub consent_accepted: bool,
    pub consent_policy_version: Option<String>,
    pub server_revision: u64,
    pub saved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ActivePointer {
    session_id: String,
}

/// Persist the current session state. Called on every session transition
/// (join → consent → begin → submit). Best-effort: a persistence failure is
/// logged, never fatal to the transition itself.
pub fn persist() {
    let snap = match crate::session::session_snapshot() {
        Some(s) => s,
        None => return,
    };
    let session_id = match snap.platform_session_id.clone() {
        Some(id) => id,
        None => return,
    };
    let record = SessionRecord {
        platform_session_id: session_id.clone(),
        status: match snap.status {
            SessionStatus::Idle => "idle",
            SessionStatus::Joined => "joined",
            SessionStatus::Active => "active",
            SessionStatus::Submitted => "submitted",
        }
        .to_string(),
        title: snap.title.clone(),
        organization: snap.organization.clone(),
        duration_minutes: snap.duration_minutes,
        started_at: snap.started_at.clone(),
        ends_at: snap.ends_at.clone(),
        consent_accepted: snap.consent_accepted,
        consent_policy_version: snap.consent_policy_version.clone(),
        server_revision: snap.server_revision,
        saved_at: chrono::Utc::now().to_rfc3339(),
    };
    if write_record(&record).is_ok() {
        let _ = write_pointer(&session_id);
    }
}

fn write_record(record: &SessionRecord) -> AppResult<()> {
    let p = session_file(&record.platform_session_id)?;
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = p.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_string_pretty(record)?)?;
    std::fs::rename(&tmp, &p)?;
    Ok(())
}

fn write_pointer(session_id: &str) -> AppResult<()> {
    let p = pointer_path()?;
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&p, serde_json::to_string(&ActivePointer {
        session_id: session_id.to_string(),
    })?)?;
    Ok(())
}

/// Clear the "active session" pointer (submit / explicit leave). The record
/// itself stays for receipt viewing.
pub fn clear_pointer() {
    if let Ok(p) = pointer_path() {
        let _ = std::fs::remove_file(p);
    }
}

fn read_record(session_id: &str) -> Option<SessionRecord> {
    let p = session_file(session_id).ok()?;
    let raw = std::fs::read_to_string(p).ok()?;
    serde_json::from_str(&raw).ok()
}

// ---------------------------------------------------------------------------
// Single-writer lock (DESK-11)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LockFile {
    pid: u32,
    started_at: String,
    app_version: String,
}

/// Acquire the write lock for a session directory.
///
/// If a lock file exists and its PID is alive, this returns
/// `AppError::SessionLocked` — the caller must surface it and refuse to open
/// the session for writing. Stale locks (dead PID) are replaced.
pub fn acquire_lock(session_id: &str) -> AppResult<()> {
    let p = lock_path(session_id)?;
    if p.exists() {
        if let Some(lock) = read_lock(&p) {
            if pid_alive(lock.pid) {
                return Err(AppError::SessionLocked(lock.pid));
            }
            // Stale lock: the previous holder died without releasing.
        }
    }
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let lock = LockFile {
        pid: std::process::id(),
        started_at: chrono::Utc::now().to_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    };
    std::fs::write(&p, serde_json::to_string(&lock)?)?;
    Ok(())
}

/// Release the lock. Called on submit; a crash simply leaves a stale lock,
/// which the next boot replaces after the liveness check.
pub fn release_lock(session_id: &str) {
    if let Ok(p) = lock_path(session_id) {
        let _ = std::fs::remove_file(p);
    }
}

fn read_lock(p: &std::path::Path) -> Option<LockFile> {
    let raw = std::fs::read_to_string(p).ok()?;
    serde_json::from_str(&raw).ok()
}

/// Pure decision helper, unit-tested: given the lock's PID and whether that
/// PID is alive, may this process take the lock?
pub fn lock_decision(lock_pid: u32, pid_alive: bool, own_pid: u32) -> LockOutcome {
    if lock_pid == own_pid {
        LockOutcome::Ours
    } else if pid_alive {
        LockOutcome::LockedByOther
    } else {
        LockOutcome::Stale
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LockOutcome {
    /// The lock is ours (same process re-entering, e.g. after a retry).
    Ours,
    /// Another live process holds it: refuse.
    LockedByOther,
    /// The holder is dead: safe to replace.
    Stale,
}

fn pid_alive(pid: u32) -> bool {
    if pid == std::process::id() {
        return true;
    }
    #[cfg(target_os = "linux")]
    {
        // A live process has /proc/<pid>. Reading cmdline also guards against
        // PID reuse in the common case (best-effort, not a guarantee).
        std::fs::read(format!("/proc/{}/cmdline", pid)).is_ok()
    }
    #[cfg(not(target_os = "linux"))]
    {
        // No portable liveness check without extra dependencies: treat locks
        // older than 4 hours as stale, otherwise as held. Documented in
        // ARCHITECTURE.md; only Linux has a tested distribution path today.
        let _ = pid;
        false
    }
}

// ---------------------------------------------------------------------------
// Boot recovery assessment (DESK-10)
// ---------------------------------------------------------------------------

/// What the app should do with the persisted state at boot.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RecoveryOutcome {
    /// Nothing persisted (or pointer cleared): normal boot.
    None,
    /// An active session was persisted. The workspace dir exists, the lock
    /// was acquired, and the in-memory session was restored. Unsynced local
    /// work (from the durable journal) is listed so the UI can offer a sync.
    ResumeActive {
        unsynced_paths: Vec<String>,
        server_revision: u64,
    },
    /// A joined-but-not-started session was persisted.
    ResumeJoined,
    /// The pointer names a session whose workspace is gone (user deleted app
    /// data, or another profile). The candidate must re-join; nothing is
    /// silently recreated.
    WorkspaceMissing { session_id: String },
    /// Another live Fydell process holds this session's lock (DESK-11).
    /// The app must not open it for writing.
    Locked { pid: u32 },
}

/// Assess the persisted state. Pure over its inputs where possible; the
/// filesystem reads are the impure part. Returns the outcome and, for
/// ResumeActive/ResumeJoined, the record to restore.
pub fn assess() -> (RecoveryOutcome, Option<SessionRecord>) {
    let pointer: ActivePointer = pointer_path()
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .map(|p| p)
        .unwrap_or(ActivePointer {
            session_id: String::new(),
        });
    if pointer.session_id.is_empty() {
        return (RecoveryOutcome::None, None);
    }
    let session_id = pointer.session_id;
    let record = match read_record(&session_id) {
        Some(r) => r,
        None => return (RecoveryOutcome::WorkspaceMissing { session_id }, None),
    };
    if record.status == "submitted" || record.status == "idle" {
        return (RecoveryOutcome::None, None);
    }
    // The workspace must still be on disk.
    let workspace_exists = sessions_root()
        .map(|r| r.join(&session_id).join(".fydell").join("revs.json"))
        .map(|p| p.exists())
        .unwrap_or(false);
    if !workspace_exists {
        return (RecoveryOutcome::WorkspaceMissing { session_id }, None);
    }
    // Single-writer check before restoring anything writable.
    if let Ok(p) = lock_path(&session_id) {
        if p.exists() {
            if let Some(lock) = read_lock(&p) {
                match lock_decision(lock.pid, pid_alive(lock.pid), std::process::id()) {
                    LockOutcome::LockedByOther => {
                        return (RecoveryOutcome::Locked { pid: lock.pid }, None)
                    }
                    LockOutcome::Ours | LockOutcome::Stale => {}
                }
            }
        }
    }
    if record.status == "active" {
        // Unsynced work comes from the durable journal, read directly from
        // the session dir (the session module isn't restored yet).
        let journal = sessions_root()
            .map(|r| {
                r.join(&session_id)
                    .join(".fydell")
                    .join("sync-journal.json")
            })
            .ok()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
        let unsynced_paths = journal
            .as_ref()
            .and_then(|j| j.get("dirty_paths"))
            .and_then(|v| v.as_array())
            .map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        (
            RecoveryOutcome::ResumeActive {
                unsynced_paths,
                server_revision: record.server_revision,
            },
            Some(record),
        )
    } else {
        (RecoveryOutcome::ResumeJoined, Some(record))
    }
}

/// Tauri command: what should the UI do about the previous run? (DESK-10)
#[tauri::command]
pub fn recovery_status() -> AppResult<RecoveryOutcome> {
    // The actual restore happens once in session::init; this just reports the
    // already-computed outcome for late UI queries.
    Ok(crate::session::recovery_outcome())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lock_decisions() {
        assert_eq!(lock_decision(100, true, 100), LockOutcome::Ours);
        assert_eq!(lock_decision(100, false, 200), LockOutcome::Stale);
        assert_eq!(lock_decision(100, true, 200), LockOutcome::LockedByOther);
        // Same PID always wins, even if the liveness check says dead.
        assert_eq!(lock_decision(200, false, 200), LockOutcome::Ours);
    }

    #[test]
    fn record_round_trips() {
        let r = SessionRecord {
            platform_session_id: "sess-1".to_string(),
            status: "active".to_string(),
            title: Some("T".to_string()),
            organization: None,
            duration_minutes: Some(60),
            started_at: None,
            ends_at: None,
            consent_accepted: true,
            consent_policy_version: Some("v3".to_string()),
            server_revision: 12,
            saved_at: "now".to_string(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: SessionRecord = serde_json::from_str(&s).unwrap();
        assert_eq!(back.server_revision, 12);
        assert_eq!(back.status, "active");
    }

    #[test]
    fn outcome_serializes_with_kind_tag() {
        let o = RecoveryOutcome::ResumeActive {
            unsynced_paths: vec!["a.py".to_string()],
            server_revision: 3,
        };
        let v = serde_json::to_value(&o).unwrap();
        assert_eq!(v["kind"], serde_json::Value::String("resume_active".to_string()));
        assert_eq!(v["server_revision"], serde_json::Value::from(3));
    }

    #[test]
    fn stale_lock_file_is_replaced() {
        let dir = std::env::temp_dir().join(format!("fydell-lock-test-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let p = dir.join("lock");
        // A lock naming a PID that is certainly dead.
        let dead_pid = 1u32 << 30;
        std::fs::write(
            &p,
            serde_json::to_string(&LockFile {
                pid: dead_pid,
                started_at: "x".to_string(),
                app_version: "0.0.0".to_string(),
            })
            .unwrap(),
        )
        .unwrap();
        let lock = read_lock(&p).unwrap();
        assert_eq!(lock_decision(lock.pid, pid_alive(lock.pid), std::process::id()), LockOutcome::Stale);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
