//! Session state machine: idle → joined → active → submitted.
//!
//! The desktop is a client of the platform's session API
//! (`src/app/api/sim/sessions/[id]/*`). Joining an assignment:
//!
//! 1. `join_session(invite_token)`: public invitation preview → accept
//!    (requires sign-in) → fetch the full session payload. Status: joined.
//! 2. `accept_consent()`: records the platform consent policy. Status: joined.
//! 3. `begin_session()`: records a desktop preflight, starts the session
//!    (server timing starts here), and materializes the local workspace.
//!    Status: active.
//!
//! Everything the candidate does is scoped to the active session; nothing is
//! recorded outside one.

use crate::error::{AppError, AppResult};
use crate::platform::{FullSession, Platform, StatePatch};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

static APP_DATA: OnceLock<PathBuf> = OnceLock::new();
static SESSION: OnceLock<Mutex<SessionState>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Idle,
    Joined,
    Active,
    Submitted,
}

#[derive(Debug, Serialize, Clone)]
pub struct SessionInfo {
    pub status: SessionStatus,
    pub platform_session_id: Option<String>,
    pub title: Option<String>,
    pub organization: Option<String>,
    pub duration_minutes: Option<u32>,
    pub ends_at: Option<String>,
    pub started_at: Option<String>,
    pub consent_accepted: bool,
    /// Kept for the workspace header; the platform's candidate view exposes a
    /// content `slug`, not a versioned scenario package (see ARCHITECTURE.md W3).
    pub scenario_id: Option<String>,
    pub scenario_version: Option<String>,
}

struct SessionState {
    status: SessionStatus,
    platform_session_id: Option<String>,
    title: Option<String>,
    organization: Option<String>,
    duration_minutes: Option<u32>,
    ends_at: Option<String>,
    started_at: Option<String>,
    consent_accepted: bool,
    consent_policy_version: Option<String>,
    workspace_dir: Option<PathBuf>,
    /// Last server-acknowledged state revision (PATCH baseRevision).
    server_revision: u64,
    revs: HashMap<String, u64>,
}

impl SessionState {
    fn idle() -> Self {
        SessionState {
            status: SessionStatus::Idle,
            platform_session_id: None,
            title: None,
            organization: None,
            duration_minutes: None,
            ends_at: None,
            started_at: None,
            consent_accepted: false,
            consent_policy_version: None,
            workspace_dir: None,
            server_revision: 0,
            revs: HashMap::new(),
        }
    }

    fn info(&self) -> SessionInfo {
        SessionInfo {
            status: self.status,
            platform_session_id: self.platform_session_id.clone(),
            title: self.title.clone(),
            organization: self.organization.clone(),
            duration_minutes: self.duration_minutes,
            ends_at: self.ends_at.clone(),
            started_at: self.started_at.clone(),
            consent_accepted: self.consent_accepted,
            scenario_id: self.title.clone(),
            scenario_version: None,
        }
    }
}

pub fn init(app_data: PathBuf) {
    let _ = APP_DATA.set(app_data);
    let _ = SESSION.set(Mutex::new(SessionState::idle()));
}

fn session() -> &'static Mutex<SessionState> {
    SESSION.get().expect("session must be initialized in setup")
}

/// Read-only access to the active workspace directory, if any.
pub fn workspace_dir() -> AppResult<PathBuf> {
    let s = session().lock().unwrap();
    s.workspace_dir.clone().ok_or(AppError::NoSession)
}

pub fn platform_session_id() -> AppResult<String> {
    let s = session().lock().unwrap();
    s.platform_session_id.clone().ok_or(AppError::NoSession)
}

pub fn server_revision() -> u64 {
    session().lock().unwrap().server_revision
}

pub fn set_server_revision(rev: u64) {
    session().lock().unwrap().server_revision = rev;
}

pub fn require_active() -> AppResult<()> {
    let s = session().lock().unwrap();
    match s.status {
        SessionStatus::Active => Ok(()),
        SessionStatus::Idle | SessionStatus::Joined => Err(AppError::NoSession),
        SessionStatus::Submitted => Err(AppError::AlreadySubmitted),
    }
}

fn require_joined() -> AppResult<()> {
    let s = session().lock().unwrap();
    match s.status {
        SessionStatus::Joined => Ok(()),
        SessionStatus::Idle => Err(AppError::NoSession),
        SessionStatus::Active => Err(AppError::Execution("session already started".into())),
        SessionStatus::Submitted => Err(AppError::AlreadySubmitted),
    }
}

fn content_str(content: &serde_json::Value, key: &str) -> Option<String> {
    content
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// Tauri command: preview the invitation, accept it, and fetch the session.
/// Requires sign-in first (`auth_sign_in`).
#[tauri::command]
pub async fn join_session(invite_token: String) -> AppResult<SessionInfo> {
    {
        let s = session().lock().unwrap();
        if s.status != SessionStatus::Idle {
            return Err(AppError::Execution(
                "a session is already in progress; restart the app to join another".into(),
            ));
        }
    }
    // Fail fast with a clear message when not signed in.
    crate::auth::access_token()
        .await
        .map_err(|_| AppError::Auth("sign in first, then enter your invite code".to_string()))?;

    let token = invite_token.trim();
    if token.is_empty() {
        return Err(AppError::Execution("invite code is required".into()));
    }

    let platform = Platform::new();

    // 1. Public preview: shows org + simulation before any auth'd action.
    let preview = platform.invitation_preview(token).await?;
    if !preview.ok {
        return Err(AppError::Execution(format!(
            "invitation not available: {}",
            preview
                .reason
                .unwrap_or_else(|| "unknown reason".to_string())
        )));
    }
    let detail = preview.invitation.ok_or_else(|| {
        AppError::Platform("invitation preview missing invitation detail".to_string())
    })?;

    // 2. Accept → platform session id (auth required).
    let session_id = platform.accept_invitation(token).await?;

    // 3. Fetch the full candidate payload.
    let full = platform.fetch_session(&session_id).await?;
    if !full.gate.desktop_required {
        return Err(AppError::Execution(
            "this assignment is not configured for the desktop app".to_string(),
        ));
    }

    let title = content_str(&full.content, "title").unwrap_or(detail.simulation.title.clone());

    {
        let mut s = session().lock().unwrap();
        s.status = SessionStatus::Joined;
        s.platform_session_id = Some(session_id);
        s.title = Some(title);
        s.organization = Some(detail.organization_name.clone());
        s.duration_minutes = Some(full.session.duration_minutes);
        s.ends_at = full.session.ends_at.clone();
        s.started_at = full.session.started_at.clone();
        s.consent_accepted = full.gate.consent_accepted;
        s.consent_policy_version = Some(full.gate.consent_policy_version.clone());
        s.server_revision = full.state.revision;
    }

    crate::events::log_system_event(
        "session_joined",
        serde_json::json!({ "title": detail.simulation.title }),
    )?;

    Ok(session().lock().unwrap().info())
}

/// Tauri command: record the platform consent policy, then start the session.
///
/// The consent screen in the UI shows the assignment title/org; accepting here
/// POSTs `{ accepted: true, policyVersion }` to the platform (409 if the
/// policy changed under us).
#[tauri::command]
pub async fn accept_consent() -> AppResult<SessionInfo> {
    require_joined()?;
    let (session_id, policy_version, already) = {
        let s = session().lock().unwrap();
        (
            s.platform_session_id.clone().ok_or(AppError::NoSession)?,
            s.consent_policy_version
                .clone()
                .ok_or(AppError::NoSession)?,
            s.consent_accepted,
        )
    };
    if !already {
        Platform::new()
            .accept_consent(&session_id, &policy_version)
            .await?;
        session().lock().unwrap().consent_accepted = true;
    }
    Ok(session().lock().unwrap().info())
}

/// Tauri command: preflight → start (server timing begins) → materialize the
/// local workspace. After this the session is active.
#[tauri::command]
pub async fn begin_session() -> AppResult<SessionInfo> {
    require_joined()?;
    {
        let s = session().lock().unwrap();
        if !s.consent_accepted {
            return Err(AppError::Execution(
                "consent must be accepted before starting".to_string(),
            ));
        }
    }
    let session_id = platform_session_id()?;
    let platform = Platform::new();

    // 1. Desktop preflight (truthful: this device, this app).
    let can_start = platform.record_preflight(&session_id).await?;
    if !can_start {
        return Err(AppError::Execution(
            "preflight did not pass; check your connection and try again".to_string(),
        ));
    }

    // 2. Start: the server clock starts here.
    let (started_at, ends_at) = platform.start_session(&session_id).await?;

    // 3. Re-fetch for the latest content/state, then materialize the workspace.
    let full = platform.fetch_session(&session_id).await?;
    let dir = materialize_workspace(&full)?;

    {
        let mut s = session().lock().unwrap();
        s.status = SessionStatus::Active;
        s.workspace_dir = Some(dir);
        s.started_at = Some(started_at.clone());
        s.ends_at = Some(ends_at.clone());
        s.server_revision = full.state.revision;
    }

    crate::events::log_system_event("session_started", serde_json::json!({}))?;

    Ok(session().lock().unwrap().info())
}

/// Materialize the local workspace from the session payload.
///
/// W3: when the session carries a versioned file package (`filePackage`), every
/// file is verified against the package manifest BEFORE anything is written.
/// A single hash mismatch aborts materialization with a clear integrity error
/// — the app never silently continues on tampered content. The verified
/// manifest is pinned to `.fydell/package.json` so the submit path can prove
/// which scenario version the work started from.
///
/// Without a package (older sessions / non-scenario templates), the legacy
/// path materializes `state.workspace.files` as before.
fn materialize_workspace(full: &FullSession) -> AppResult<PathBuf> {
    let app_data = APP_DATA.get().expect("app data dir set in setup");
    let dir = app_data.join("sessions").join(&full.session.id);
    std::fs::create_dir_all(&dir)?;
    std::fs::create_dir_all(dir.join(".fydell"))?;

    let mut revs = HashMap::new();

    // Read-only brief from the candidate-safe content view.
    let mut brief = String::new();
    if let Some(title) = content_str(&full.content, "title") {
        brief.push_str(&format!("# {}\n\n", title));
    }
    for key in ["scenarioSummary", "mission"] {
        if let Some(text) = content_str(&full.content, key) {
            brief.push_str(&text);
            brief.push_str("\n\n");
        }
    }
    if let Some(tasks) = full.content.get("tasks").and_then(|t| t.as_array()) {
        brief.push_str("## Tasks\n\n");
        for (i, t) in tasks.iter().enumerate() {
            let title = t.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let detail = t.get("detail").and_then(|v| v.as_str()).unwrap_or("");
            brief.push_str(&format!("{}. **{}** — {}\n", i + 1, title, detail));
        }
        brief.push('\n');
    }
    if let Some(fields) = full
        .content
        .get("deliverableFields")
        .and_then(|f| f.as_array())
    {
        brief.push_str("## Deliverable\n\n");
        for f in fields {
            let label = f.get("label").and_then(|v| v.as_str()).unwrap_or("");
            let req = f.get("required").and_then(|v| v.as_bool()).unwrap_or(false);
            brief.push_str(&format!(
                "- {} {}\n",
                label,
                if req { "(required)" } else { "(optional)" }
            ));
        }
    }
    std::fs::write(dir.join("BRIEF.md"), &brief)?;
    revs.insert("BRIEF.md".to_string(), 0); // read-only: rev 0 pins it

    if let Some(pkg) = &full.file_package {
        materialize_package(&dir, pkg, &full.state.workspace, &mut revs)?;
    } else {
        // Editable files, if the scenario ships them via state.workspace.files.
        if let Some(files) = full
            .state
            .workspace
            .get("files")
            .and_then(|f| f.as_object())
        {
            for (path, content) in files {
                if let Some(text) = content.as_str() {
                    write_scoped(&dir, path, text)?;
                    revs.insert(path.clone(), 1);
                }
            }
        }

        // Test command, if the scenario declares one via state.workspace.testCommand
        // (part of the W3 scenario-package contract — see ARCHITECTURE.md).
        if let Some(cmd) = full.state.workspace.get("testCommand") {
            std::fs::write(
                dir.join(".fydell").join("test-command.json"),
                serde_json::to_string_pretty(cmd)?,
            )?;
        }
    }

    let revs_json = serde_json::to_string_pretty(&revs)?;
    std::fs::write(dir.join(".fydell").join("revs.json"), revs_json)?;

    Ok(dir)
}

/// Verify-then-write materialization of a W3 file package.
///
/// Every file's SHA-256 is checked against the manifest before a single byte
/// is written. Any mismatch — or a manifest entry with no file, or a file
/// with no manifest entry — aborts with `AppError::Integrity` and the
/// workspace is left unmaterialized.
fn materialize_package(
    dir: &PathBuf,
    pkg: &crate::platform::FilePackage,
    state_workspace: &serde_json::Value,
    revs: &mut HashMap<String, u64>,
) -> AppResult<()> {
    use sha2::{Digest, Sha256};

    if pkg.files.is_empty() {
        return Err(AppError::Integrity(
            "the assignment package contains no files".to_string(),
        ));
    }
    for (path, content) in &pkg.files {
        let expected = pkg.manifest.get(path).ok_or_else(|| {
            AppError::Integrity(format!(
                "file '{}' is missing from the package manifest",
                path
            ))
        })?;
        let actual = hex::encode(Sha256::digest(content.as_bytes()));
        if &actual != expected {
            return Err(AppError::Integrity(format!(
                "file '{}' failed integrity verification (hash mismatch): \
                 the assignment package may be corrupted or tampered with. \
                 Please re-join the session to download a fresh copy.",
                path
            )));
        }
    }
    for path in pkg.manifest.keys() {
        if !pkg.files.contains_key(path) {
            return Err(AppError::Integrity(format!(
                "manifest entry '{}' has no file in the package",
                path
            )));
        }
    }

    // Pin the verified manifest: the submit path uses it to prove which
    // scenario version the work started from.
    let pin = serde_json::json!({
        "scenarioId": pkg.scenario_id,
        "scenarioVersion": pkg.scenario_version,
        "manifest": pkg.manifest,
    });
    std::fs::write(
        dir.join(".fydell").join("package.json"),
        serde_json::to_string_pretty(&pin)?,
    )?;

    for (path, content) in &pkg.files {
        write_scoped(dir, path, content)?;
        revs.insert(path.clone(), 1);
    }

    // Canonical test command from the package; fall back to the state value
    // for sessions whose package declares none.
    let cmd: Option<serde_json::Value> = if !pkg.test_command.is_empty() {
        Some(serde_json::to_value(&pkg.test_command)?)
    } else {
        state_workspace.get("testCommand").cloned()
    };
    if let Some(cmd) = cmd {
        std::fs::write(
            dir.join(".fydell").join("test-command.json"),
            serde_json::to_string_pretty(&cmd)?,
        )?;
    }

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

/// Tauri command: current session status (for UI boot / recovery).
#[tauri::command]
pub fn session_status() -> AppResult<SessionInfo> {
    Ok(session().lock().unwrap().info())
}

/// Tauri command: push local notes/workspace snapshot to the platform with
/// optimistic concurrency. Returns the new server revision.
#[tauri::command]
pub async fn sync_state(
    notes: Option<String>,
    workspace_snapshot: Option<serde_json::Value>,
) -> AppResult<u64> {
    require_active()?;
    let session_id = platform_session_id()?;
    let base = server_revision();
    let patch = StatePatch {
        base_revision: base,
        notes,
        workspace: workspace_snapshot,
        ..Default::default()
    };
    match Platform::new().patch_state(&session_id, &patch).await? {
        Ok(rev) => {
            set_server_revision(rev);
            Ok(rev)
        }
        Err(conflict) => {
            // Take the server's revision so the next attempt is based correctly.
            set_server_revision(conflict.revision);
            Err(AppError::RevisionConflict {
                expected: base,
                actual: conflict.revision,
            })
        }
    }
}

/// Internal: bump a file's revision after a successful write.
pub fn bump_rev(path: &str) -> AppResult<u64> {
    let mut s = session().lock().unwrap();
    let rev = s.revs.entry(path.to_string()).or_insert(0);
    *rev += 1;
    let new_rev = *rev;
    if let Some(dir) = s.workspace_dir.clone() {
        let revs_json = serde_json::to_string_pretty(&s.revs)?;
        std::fs::write(dir.join(".fydell").join("revs.json"), revs_json)?;
    }
    Ok(new_rev)
}

/// Internal: current revision of a file.
pub fn current_rev(path: &str) -> AppResult<u64> {
    let s = session().lock().unwrap();
    s.revs
        .get(path)
        .copied()
        .ok_or(AppError::NotFound(path.into()))
}

/// Read-only access to the scenario's declared test command, if any.
pub fn test_command() -> AppResult<Vec<String>> {
    let dir = workspace_dir()?;
    let path = dir.join(".fydell").join("test-command.json");
    let raw = std::fs::read_to_string(&path).map_err(|_| {
        AppError::Execution("this assignment does not declare a local test command".to_string())
    })?;
    let argv: Vec<String> =
        serde_json::from_str(&raw).map_err(|_| AppError::Execution("bad test command".into()))?;
    if argv.is_empty() {
        return Err(AppError::Execution("scenario has no test command".into()));
    }
    Ok(argv)
}

/// Internal: mark the session submitted (called by submission.rs on success).
pub fn mark_submitted() -> AppResult<()> {
    let mut s = session().lock().unwrap();
    s.status = SessionStatus::Submitted;
    Ok(())
}
