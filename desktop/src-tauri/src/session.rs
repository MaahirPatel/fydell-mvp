//! Session state machine: idle → active → submitted.
//!
//! The session owns the workspace directory on disk. Everything the candidate
//! does is scoped to the active session; nothing persists or is recorded
//! outside one.

use crate::error::{AppError, AppResult};
use crate::platform::{self, ScenarioFile};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use uuid::Uuid;

static APP_DATA: OnceLock<PathBuf> = OnceLock::new();
static SESSION: OnceLock<Mutex<SessionState>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Idle,
    Active,
    Submitted,
}

#[derive(Debug, Serialize, Clone)]
pub struct SessionInfo {
    pub status: SessionStatus,
    pub scenario_id: Option<String>,
    pub scenario_version: Option<String>,
    pub scenario_label: Option<String>,
    pub started_at: Option<String>,
}

struct SessionState {
    status: SessionStatus,
    workspace_dir: Option<PathBuf>,
    scenario_id: Option<String>,
    scenario_version: Option<String>,
    scenario_label: Option<String>,
    test_command: Vec<String>,
    capability_token: Option<String>,
    started_at: Option<String>,
    revs: HashMap<String, u64>,
}

impl SessionState {
    fn idle() -> Self {
        SessionState {
            status: SessionStatus::Idle,
            workspace_dir: None,
            scenario_id: None,
            scenario_version: None,
            scenario_label: None,
            test_command: Vec::new(),
            capability_token: None,
            started_at: None,
            revs: HashMap::new(),
        }
    }

    fn info(&self) -> SessionInfo {
        SessionInfo {
            status: self.status,
            scenario_id: self.scenario_id.clone(),
            scenario_version: self.scenario_version.clone(),
            scenario_label: self.scenario_label.clone(),
            started_at: self.started_at.clone(),
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

/// Read-only access to the capability token, if any.
pub fn capability_token() -> AppResult<String> {
    let s = session().lock().unwrap();
    s.capability_token.clone().ok_or(AppError::NoSession)
}

pub fn test_command() -> AppResult<Vec<String>> {
    let s = session().lock().unwrap();
    if s.test_command.is_empty() {
        return Err(AppError::NoSession);
    }
    Ok(s.test_command.clone())
}

pub fn require_active() -> AppResult<()> {
    let s = session().lock().unwrap();
    match s.status {
        SessionStatus::Active => Ok(()),
        SessionStatus::Idle => Err(AppError::NoSession),
        SessionStatus::Submitted => Err(AppError::AlreadySubmitted),
    }
}

/// Tauri command: validate the invite code, download the scenario package,
/// and materialize a local workspace.
#[tauri::command]
pub async fn join_session(invite_code: String) -> AppResult<SessionInfo> {
    {
        let s = session().lock().unwrap();
        if s.status != SessionStatus::Idle {
            return Err(AppError::Execution(
                "a session is already in progress; restart the app to join another".into(),
            ));
        }
    }

    let invite_code = invite_code.trim().to_uppercase();
    if invite_code.is_empty() {
        return Err(AppError::Execution("invite code is required".into()));
    }

    // 1. Fetch the package from the platform.
    let pkg = platform::fetch_package(&invite_code).await?;

    // 2. Materialize the workspace.
    let app_data = APP_DATA.get().expect("app data dir set in setup");
    let session_id = Uuid::new_v4().to_string();
    let dir = app_data.join("sessions").join(&session_id);
    std::fs::create_dir_all(&dir)?;
    std::fs::create_dir_all(dir.join(".fydell"))?;

    let mut revs = HashMap::new();
    for ScenarioFile { path, content } in &pkg.files {
        write_scoped(&dir, path, content)?;
        revs.insert(path.clone(), 1);
    }
    // Persist revs so a restart can recover them.
    let revs_json = serde_json::to_string_pretty(&revs)?;
    std::fs::write(dir.join(".fydell").join("revs.json"), revs_json)?;
    // Persist the package manifest for the test runner.
    std::fs::write(
        dir.join(".fydell").join("package.json"),
        serde_json::to_string_pretty(&pkg.manifest)?,
    )?;

    // 3. Record session state.
    let started_at = chrono::Utc::now().to_rfc3339();
    {
        let mut s = session().lock().unwrap();
        s.status = SessionStatus::Active;
        s.workspace_dir = Some(dir);
        s.scenario_id = Some(pkg.manifest.scenario_id.clone());
        s.scenario_version = Some(pkg.manifest.scenario_version.clone());
        s.scenario_label = Some(pkg.manifest.label.clone());
        s.test_command = pkg.manifest.test_command.clone();
        s.capability_token = Some(pkg.capability_token);
        s.started_at = Some(started_at);
        s.revs = revs;
    }

    crate::events::log_system_event("session_started", serde_json::json!({
        "scenario_id": pkg.manifest.scenario_id,
        "scenario_version": pkg.manifest.scenario_version,
    }))?;

    let info = session().lock().unwrap().info();
    Ok(info)
}

fn write_scoped(dir: &PathBuf, path: &str, content: &str) -> AppResult<()> {
    let target = dir.join(path);
    // Reject absolute paths and parent traversal before touching disk.
    if path.starts_with('/') || path.contains("..") {
        return Err(AppError::PathEscape);
    }
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
    s.revs.get(path).copied().ok_or(AppError::NotFound(path.into()))
}

/// Internal: mark the session submitted (called by submission.rs on success).
pub fn mark_submitted() -> AppResult<()> {
    let mut s = session().lock().unwrap();
    s.status = SessionStatus::Submitted;
    Ok(())
}

/// Internal: full session info for the submission packager.
pub fn submission_context() -> AppResult<(String, String, String)> {
    let s = session().lock().unwrap();
    Ok((
        s.scenario_id.clone().ok_or(AppError::NoSession)?,
        s.scenario_version.clone().ok_or(AppError::NoSession)?,
        s.capability_token.clone().ok_or(AppError::NoSession)?,
    ))
}
