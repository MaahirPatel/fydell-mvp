//! Save/sync state machine (DESK-09) and competing-session fencing (DESK-11).
//!
//! Two different things are tracked, and the UI must never conflate them:
//!
//! - **Local save**: `write_file` persists bytes to disk on the candidate's
//!   machine. States: saving → saved-on-device | save-failed.
//! - **Remote sync**: the local file set is PATCHed to the platform with
//!   optimistic concurrency (`baseRevision`). States:
//!   `saved_local → syncing → synced | sync_failed`, plus `conflict` when the
//!   server's revision moved under us (another device/window wrote first).
//!
//! The journal (`.fydell/sync-journal.json`) is durable: a force-close with
//! unsynced work still shows that work as unsynced after restart (DESK-10).
//! Sync never silently overwrites: a 409 becomes the `conflict` state and the
//! candidate explicitly chooses keep-local or take-remote (DESK-11).

use crate::error::{AppError, AppResult};
use crate::session;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

static PHASE: OnceLock<Mutex<SyncPhase>> = OnceLock::new();

fn phase() -> &'static Mutex<SyncPhase> {
    PHASE.get_or_init(|| Mutex::new(SyncPhase::Synced))
}

/// The remote-sync phase. Serialized snake_case for the frontend.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncPhase {
    /// Local files changed since the last acknowledged sync.
    SavedLocal,
    /// A sync PATCH is in flight.
    Syncing,
    /// The server acknowledged the current local file set.
    Synced,
    /// The last sync attempt failed (network/server). Retryable.
    SyncFailed,
    /// The server revision moved under us — another writer. The candidate
    /// must explicitly resolve; nothing is overwritten silently.
    Conflict,
}

/// Events that drive the machine. Pure transition table below is unit-tested.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncEvent {
    MarkedDirty,
    SyncStarted,
    SyncSucceeded,
    SyncFailed,
    ConflictDetected,
    Resolved,
    /// Fresh workspace (join/begin): nothing to sync yet.
    Reset,
}

/// Pure state transition. The one rule that matters: `Conflict` is sticky —
/// only an explicit `Resolved` leaves it.
pub fn next_phase(current: SyncPhase, event: SyncEvent) -> SyncPhase {
    use SyncPhase as P;
    use SyncEvent as E;
    match (current, event) {
        (_, E::Reset) => P::Synced,
        (P::Conflict, E::Resolved) => P::Synced,
        // Nothing leaves Conflict except explicit resolution.
        (P::Conflict, _) => P::Conflict,
        (_, E::ConflictDetected) => P::Conflict,
        (_, E::MarkedDirty) => P::SavedLocal,
        (_, E::SyncStarted) => P::Syncing,
        (P::Syncing, E::SyncSucceeded) => P::Synced,
        (P::Syncing, E::SyncFailed) => P::SyncFailed,
        // A success/failure arriving with no sync in flight is a no-op.
        (s, E::SyncSucceeded) => s,
        (s, E::SyncFailed) => s,
        (s, E::Resolved) => s,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Journal {
    #[serde(default)]
    dirty_paths: Vec<String>,
    #[serde(default)]
    last_synced_rev: Option<u64>,
    #[serde(default)]
    attempts: u32,
    #[serde(default)]
    last_error: Option<String>,
    #[serde(default)]
    conflict_server_rev: Option<u64>,
    #[serde(default)]
    last_synced_at: Option<String>,
}

fn journal_path() -> AppResult<PathBuf> {
    Ok(session::workspace_dir()?
        .join(".fydell")
        .join("sync-journal.json"))
}

fn read_journal() -> Journal {
    journal_path()
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_journal(j: &Journal) -> AppResult<()> {
    let p = journal_path()?;
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    // Atomic-ish: write temp, then rename, so a crash mid-write cannot leave
    // a half-written journal behind.
    let tmp = p.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_string_pretty(j)?)?;
    std::fs::rename(&tmp, &p)?;
    Ok(())
}

fn set_phase(p: SyncPhase) {
    *phase().lock().unwrap() = p;
}

fn emit_changed(app: Option<&AppHandle>) {
    if let Ok(view) = status_view() {
        if let Some(app) = app {
            let _ = app.emit("sync-changed", &view);
        }
    }
}

/// What the frontend renders. `phase` drives the exact wording (DESK-09):
/// saved_local → "Saved on this device", syncing → "Syncing…",
/// synced → "Saved remotely", sync_failed → "Sync failed", conflict →
/// "Sync conflict — review".
#[derive(Debug, Clone, Serialize)]
pub struct SyncView {
    pub phase: SyncPhase,
    pub dirty_paths: Vec<String>,
    pub last_error: Option<String>,
    pub server_revision: u64,
    pub conflict_server_rev: Option<u64>,
    pub last_synced_at: Option<String>,
}

pub fn status_view() -> AppResult<SyncView> {
    let j = read_journal();
    Ok(SyncView {
        phase: *phase().lock().unwrap(),
        dirty_paths: j.dirty_paths,
        last_error: j.last_error,
        server_revision: session::server_revision(),
        conflict_server_rev: j.conflict_server_rev,
        last_synced_at: j.last_synced_at,
    })
}

/// Tauri command: current sync state (DESK-09).
#[tauri::command]
pub fn sync_status() -> AppResult<SyncView> {
    status_view()
}

/// Internal: label for diagnostics (no AppHandle needed).
pub fn current_phase_label() -> String {
    let p = *phase().lock().unwrap();
    serde_json::to_value(p)
        .and_then(|v| {
            v.as_str()
                .map(|s| s.to_string())
                .ok_or_else(|| serde::de::Error::custom("bad phase"))
        })
        .unwrap_or_else(|_| "unknown".to_string())
}

/// Internal: number of locally-dirty paths (for diagnostics / exit warning).
pub fn dirty_count() -> usize {
    read_journal().dirty_paths.len()
}

/// Internal: is there unsynced work?
pub fn has_unsynced() -> bool {
    let j = read_journal();
    !j.dirty_paths.is_empty() || *phase().lock().unwrap() == SyncPhase::Conflict
}

/// Called by `write_file` after the bytes are durably on disk.
/// The save itself already succeeded; a journal failure must not fail the
/// save, so errors are swallowed (the next write retries the journal).
pub fn mark_dirty(path: &str) {
    let mut j = read_journal();
    if !j.dirty_paths.iter().any(|p| p == path) {
        j.dirty_paths.push(path.to_string());
    }
    j.dirty_paths.sort();
    let _ = write_journal(&j);
    let cur = *phase().lock().unwrap();
    set_phase(next_phase(cur, SyncEvent::MarkedDirty));
}

/// Called on join/begin: the workspace is fresh from the server.
pub fn reset_for_new_workspace() {
    let _ = write_journal(&Journal::default());
    set_phase(SyncPhase::Synced);
}

/// Called by the submit path: the submission snapshot supersedes the journal.
pub fn mark_clean_after_submit() {
    let _ = write_journal(&Journal::default());
    set_phase(SyncPhase::Synced);
}

/// Restore the in-memory phase from the durable journal at boot (DESK-10).
pub fn restore_from_journal() {
    let j = read_journal();
    let p = if j.conflict_server_rev.is_some() {
        SyncPhase::Conflict
    } else if !j.dirty_paths.is_empty() {
        SyncPhase::SavedLocal
    } else {
        SyncPhase::Synced
    };
    set_phase(p);
}

/// Build the PATCH body for a file sync. Pure: unit-tested.
pub fn build_sync_body(files: &[(String, String)]) -> serde_json::Value {
    let map: serde_json::Map<String, serde_json::Value> = files
        .iter()
        .map(|(p, c)| (p.clone(), serde_json::Value::String(c.clone())))
        .collect();
    serde_json::json!({ "files": map })
}

/// Tauri command: push the local file set to the platform now (DESK-09).
///
/// Optimistic concurrency: `baseRevision` is the last server-acknowledged
/// revision. A 409 means someone else wrote first → `conflict` state, never a
/// silent overwrite (DESK-11). Returns the resulting view either way; the
/// phase (not an exception) is the source of truth for the UI.
#[tauri::command]
pub async fn sync_now(app: AppHandle) -> AppResult<SyncView> {
    session::require_active()?;
    let journal = read_journal();
    if journal.dirty_paths.is_empty() && *phase().lock().unwrap() != SyncPhase::SyncFailed {
        return status_view();
    }

    let cur = *phase().lock().unwrap();
    set_phase(next_phase(cur, SyncEvent::SyncStarted));
    emit_changed(Some(&app));

    let dir = session::workspace_dir()?;
    let mut files: Vec<(String, String)> = Vec::new();
    crate::submission::collect_files(&dir, &dir, &mut files)?;
    files.sort_by(|a, b| a.0.cmp(&b.0));

    let platform = crate::platform::Platform::new();
    let patch = crate::platform::StatePatch {
        base_revision: session::server_revision(),
        workspace: Some(serde_json::json!({ "files": build_sync_body(&files)["files"] })),
        ..Default::default()
    };

    match platform
        .patch_state(&session::platform_session_id()?, &patch)
        .await
    {
        Ok(Ok(rev)) => {
            session::set_server_revision(rev);
            let mut j = read_journal();
            j.dirty_paths.clear();
            j.last_synced_rev = Some(rev);
            j.attempts = 0;
            j.last_error = None;
            j.conflict_server_rev = None;
            j.last_synced_at = Some(chrono::Utc::now().to_rfc3339());
            let _ = write_journal(&j);
            let cur = *phase().lock().unwrap();
            set_phase(next_phase(cur, SyncEvent::SyncSucceeded));
            let _ = crate::events::record(
                "sync_completed",
                serde_json::json!({ "revision": rev, "files": files.len() }),
            )
            .await;
        }
        Ok(Err(conflict)) => {
            // DESK-11: another writer got there first. Sticky conflict state;
            // the candidate resolves explicitly via resolve_sync_conflict.
            session::set_server_revision(conflict.revision);
            let mut j = read_journal();
            j.conflict_server_rev = Some(conflict.revision);
            j.last_error = Some(format!(
                "another session changed this assignment (server revision {}); \
                 your local work is untouched",
                conflict.revision
            ));
            let _ = write_journal(&j);
            let cur = *phase().lock().unwrap();
            set_phase(next_phase(cur, SyncEvent::ConflictDetected));
            let _ = crate::events::record(
                "sync_conflict",
                serde_json::json!({ "server_revision": conflict.revision }),
            )
            .await;
        }
        Err(e) => {
            let mut j = read_journal();
            j.attempts += 1;
            j.last_error = Some(e.to_string());
            let _ = write_journal(&j);
            let cur = *phase().lock().unwrap();
            set_phase(next_phase(cur, SyncEvent::SyncFailed));
        }
    }

    emit_changed(Some(&app));
    status_view()
}

/// Tauri command: resolve a sync conflict explicitly (DESK-11).
///
/// - `keep_local`: re-PATCH with the server's current revision as base — an
///   explicit, logged overwrite of the other writer's state change (the other
///   writer's *files* are untouched; only the shared state blob is replaced).
/// - `take_remote`: discard local file changes in favor of the server's file
///   snapshot, then continue from the server revision.
#[tauri::command]
pub async fn resolve_sync_conflict(app: AppHandle, strategy: String) -> AppResult<SyncView> {
    session::require_active()?;
    if *phase().lock().unwrap() != SyncPhase::Conflict {
        return Err(AppError::Execution(
            "there is no pending sync conflict to resolve".to_string(),
        ));
    }
    let conflict_rev = read_journal()
        .conflict_server_rev
        .ok_or_else(|| AppError::Execution("conflict state without a server revision".to_string()))?;

    match strategy.as_str() {
        "keep_local" => {
            let dir = session::workspace_dir()?;
            let mut files: Vec<(String, String)> = Vec::new();
            crate::submission::collect_files(&dir, &dir, &mut files)?;
            files.sort_by(|a, b| a.0.cmp(&b.0));
            let platform = crate::platform::Platform::new();
            let patch = crate::platform::StatePatch {
                base_revision: conflict_rev,
                workspace: Some(serde_json::json!({ "files": build_sync_body(&files)["files"] })),
                ..Default::default()
            };
            match platform
                .patch_state(&session::platform_session_id()?, &patch)
                .await?
            {
                Ok(rev) => {
                    session::set_server_revision(rev);
                    finish_resolution(
                        Some(&app),
                        "keep_local",
                        serde_json::json!({ "revision": rev, "overrode_server_rev": conflict_rev }),
                    )
                    .await?;
                }
                Err(conflict) => {
                    // Someone wrote *again* while resolving. Stay in conflict
                    // with the newest revision; still nothing overwritten.
                    session::set_server_revision(conflict.revision);
                    let mut j = read_journal();
                    j.conflict_server_rev = Some(conflict.revision);
                    j.last_error = Some(format!(
                        "the server changed again while resolving (revision {}); \
                         choose again — nothing was overwritten",
                        conflict.revision
                    ));
                    let _ = write_journal(&j);
                }
            }
        }
        "take_remote" => {
            let full = crate::platform::Platform::new()
                .fetch_session(&session::platform_session_id()?)
                .await?;
            let server_files = full
                .state
                .workspace
                .get("files")
                .and_then(|f| f.as_object())
                .cloned()
                .unwrap_or_default();
            if server_files.is_empty() {
                return Err(AppError::Execution(
                    "the server has no file snapshot to restore; your local \
                     work is unchanged — use “Keep my version” to push it"
                        .to_string(),
                ));
            }
            let dir = session::workspace_dir()?;
            // Write the server's files; remove local files the server no
            // longer has (BRIEF.md and .fydell internals are never touched).
            let mut wanted: Vec<String> = Vec::new();
            for (path, content) in &server_files {
                let text = content.as_str().unwrap_or("");
                write_scoped(&dir, path, text)?;
                crate::session::set_rev(path, conflict_rev)?;
                wanted.push(path.clone());
            }
            remove_extra_files(&dir, &dir, &wanted)?;
            session::set_server_revision(conflict_rev);
            finish_resolution(
                Some(&app),
                "take_remote",
                serde_json::json!({ "revision": conflict_rev, "files": wanted.len() }),
            )
            .await?;
        }
        other => {
            return Err(AppError::Execution(format!(
                "unknown conflict strategy: {other} (expected keep_local or take_remote)"
            )))
        }
    }

    emit_changed(Some(&app));
    status_view()
}

async fn finish_resolution(
    app: Option<&AppHandle>,
    strategy: &str,
    payload: serde_json::Value,
) -> AppResult<()> {
    let mut j = read_journal();
    j.dirty_paths.clear();
    j.last_synced_rev = Some(session::server_revision());
    j.attempts = 0;
    j.last_error = None;
    j.conflict_server_rev = None;
    j.last_synced_at = Some(chrono::Utc::now().to_rfc3339());
    let _ = write_journal(&j);
    let cur = *phase().lock().unwrap();
    set_phase(next_phase(cur, SyncEvent::Resolved));
    let mut p = payload;
    p["strategy"] = serde_json::Value::String(strategy.to_string());
    let _ = crate::events::record("sync_conflict_resolved", p).await;
    emit_changed(app);
    Ok(())
}

fn write_scoped(dir: &PathBuf, path: &str, content: &str) -> AppResult<()> {
    if path.starts_with('/') || path.is_empty() || path.contains("..") {
        return Err(AppError::PathEscape);
    }
    let target = dir.join(path);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&target, content)?;
    Ok(())
}

fn remove_extra_files(
    dir: &std::path::Path,
    root: &std::path::Path,
    wanted: &[String],
) -> AppResult<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_dir() {
            if p.file_name().and_then(|n| n.to_str()) == Some(".fydell") {
                continue;
            }
            remove_extra_files(&p, root, wanted)?;
            // Prune directories left empty.
            let _ = std::fs::remove_dir(&p);
        } else {
            let rel = p
                .strip_prefix(root)
                .map_err(|_| AppError::PathEscape)?
                .to_string_lossy()
                .replace('\\', "/");
            if rel == "BRIEF.md" {
                continue;
            }
            if !wanted.contains(&rel) {
                std::fs::remove_file(&p)?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conflict_is_sticky_until_explicitly_resolved() {
        let c = SyncPhase::Conflict;
        assert_eq!(next_phase(c, SyncEvent::MarkedDirty), c);
        assert_eq!(next_phase(c, SyncEvent::SyncStarted), c);
        assert_eq!(next_phase(c, SyncEvent::SyncSucceeded), c);
        assert_eq!(next_phase(c, SyncEvent::SyncFailed), c);
        assert_eq!(next_phase(c, SyncEvent::ConflictDetected), c);
        assert_eq!(next_phase(c, SyncEvent::Resolved), SyncPhase::Synced);
    }

    #[test]
    fn happy_path_transitions() {
        use SyncEvent::*;
        use SyncPhase::*;
        assert_eq!(next_phase(Synced, MarkedDirty), SavedLocal);
        assert_eq!(next_phase(SavedLocal, SyncStarted), Syncing);
        assert_eq!(next_phase(Syncing, SyncSucceeded), Synced);
        assert_eq!(next_phase(Synced, SyncStarted), Syncing);
        assert_eq!(next_phase(Syncing, SyncFailed), SyncFailed);
        assert_eq!(next_phase(SyncFailed, MarkedDirty), SavedLocal);
        assert_eq!(next_phase(SyncFailed, SyncStarted), Syncing);
        assert_eq!(next_phase(Syncing, ConflictDetected), Conflict);
        assert_eq!(next_phase(SavedLocal, ConflictDetected), Conflict);
        assert_eq!(next_phase(Synced, Reset), Synced);
        assert_eq!(next_phase(Conflict, Reset), Synced);
    }

    #[test]
    fn stray_events_are_noops() {
        // A success/failure arriving with no sync in flight changes nothing.
        assert_eq!(next_phase(SyncPhase::SavedLocal, SyncEvent::SyncSucceeded), SyncPhase::SavedLocal);
        assert_eq!(next_phase(SyncPhase::Synced, SyncEvent::SyncFailed), SyncPhase::Synced);
    }

    #[test]
    fn sync_body_shape() {
        let files = vec![
            ("b.py".to_string(), "print(2)".to_string()),
            ("a.py".to_string(), "print(1)".to_string()),
        ];
        let body = build_sync_body(&files);
        assert_eq!(body["files"]["a.py"], serde_json::Value::String("print(1)".to_string()));
        assert_eq!(body["files"]["b.py"], serde_json::Value::String("print(2)".to_string()));
    }

    #[test]
    fn journal_round_trips() {
        let j = Journal {
            dirty_paths: vec!["a.py".to_string()],
            last_synced_rev: Some(7),
            attempts: 2,
            last_error: Some("boom".to_string()),
            conflict_server_rev: Some(9),
            last_synced_at: None,
        };
        let s = serde_json::to_string(&j).unwrap();
        let back: Journal = serde_json::from_str(&s).unwrap();
        assert_eq!(back.dirty_paths, vec!["a.py".to_string()]);
        assert_eq!(back.conflict_server_rev, Some(9));
        // Missing fields default (forward compatibility with older journals).
        let old: Journal = serde_json::from_str(r#"{"dirty_paths":[]}"#).unwrap();
        assert_eq!(old.attempts, 0);
        assert!(old.conflict_server_rev.is_none());
    }
}
