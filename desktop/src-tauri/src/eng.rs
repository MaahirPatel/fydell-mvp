//! Engineering assessments (the `/assess/[attemptId]` flow on the web).
//!
//! The desktop is a client of the platform's engineering attempt API
//! (`src/app/api/eng/*`, server logic in `src/lib/eng/*`). Every shape below
//! cites its route. The flow:
//!
//! list (`GET /api/eng/attempts`) → accept a pending invitation
//! (`POST /api/eng/invitations/accept`) → read the candidate view
//! (`GET /api/eng/attempts/{id}`) → consent → download the starter and
//! materialize it locally (hash-verified) → the candidate runs the setup
//! check in their own terminal and pastes the code (`preflight`) → start
//! (server clock) → team thread through the platform → requirement update →
//! package the project folder as a ZIP and upload it (`uploads`, signed
//! storage URL, `finalize`) → handoff answers + submit → receipt → released
//! report.
//!
//! The desktop never executes candidate code and never calls a model
//! provider: teammate replies are composed by the platform server. Tokens
//! stay in Rust (`Platform::authed`); the signed storage URL is used once
//! and never logged or returned to the renderer.

use std::collections::{BTreeMap, HashMap};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::eng_package::{self, PackagePlan, StarterFile};
use crate::error::{AppError, AppResult};
use crate::platform::Platform;

static WORKSPACES: OnceLock<PathBuf> = OnceLock::new();
static STATE_DIR: OnceLock<PathBuf> = OnceLock::new();

/// `workspaces`: where project folders are created (the user's Documents
/// folder when the OS reports one). `state_dir`: app-private bookkeeping.
pub fn init(app_data: &Path, documents: Option<PathBuf>) {
    let workspaces = documents
        .map(|d| d.join("Fydell"))
        .unwrap_or_else(|| app_data.join("eng-workspaces"));
    let _ = WORKSPACES.set(workspaces);
    let _ = STATE_DIR.set(app_data.join("eng"));
}

fn workspaces_root() -> AppResult<PathBuf> {
    WORKSPACES.get().cloned().ok_or(AppError::NoSession)
}

fn state_path(attempt_id: &str) -> AppResult<PathBuf> {
    Ok(STATE_DIR
        .get()
        .ok_or(AppError::NoSession)?
        .join(format!("{attempt_id}.json")))
}

/// Attempt ids are UUIDs; anything else never reaches a URL or a path.
pub fn valid_attempt_id(id: &str) -> AppResult<String> {
    let id = id.trim();
    let ok = id.len() == 36
        && id.char_indices().all(|(i, c)| match i {
            8 | 13 | 18 | 23 => c == '-',
            _ => c.is_ascii_hexdigit(),
        });
    if ok {
        Ok(id.to_ascii_lowercase())
    } else {
        Err(AppError::NotFound("engineering task".into()))
    }
}

fn attempt_folder_name(attempt_id: &str) -> String {
    format!("engineering-{}", &attempt_id[..8])
}

fn planned_project_dir(attempt_id: &str, root: &str) -> AppResult<PathBuf> {
    if !eng_package::is_safe_segment(root) {
        return Err(AppError::Integrity("the starter folder name is not valid".into()));
    }
    Ok(workspaces_root()?.join(attempt_folder_name(attempt_id)).join(root))
}

// ---------------------------------------------------------------------------
// Task list — src/app/api/eng/attempts/route.ts (GET, candidate-scoped)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngAttemptSummary {
    pub id: String,
    pub status: String,
    pub role_title: String,
    #[serde(default)]
    pub organization_name: String,
    pub allowed_minutes: u32,
    pub started_at: Option<String>,
    pub due_at: Option<String>,
    pub submitted_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngInvitationSummary {
    pub id: String,
    pub role_title: String,
    #[serde(default)]
    pub organization_name: String,
    pub allowed_minutes: u32,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngTaskList {
    #[serde(default)]
    pub attempts: Vec<EngAttemptSummary>,
    #[serde(default)]
    pub invitations: Vec<EngInvitationSummary>,
}

// ---------------------------------------------------------------------------
// Candidate view — src/lib/eng/candidate-view.ts (CandidateView), served by
// GET /api/eng/attempts/{id} and returned by consent/preflight/start as
// `{ view }`. Messages and uploads keep the server's snake_case field names.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngAttemptState {
    pub id: String,
    pub status: String,
    pub consented_at: Option<String>,
    pub preflight_passed_at: Option<String>,
    pub preflight_runtime: Option<String>,
    pub started_at: Option<String>,
    pub due_at: Option<String>,
    pub extension_minutes: u32,
    pub allowed_minutes: u32,
    pub submitted_at: Option<String>,
    pub update_released_at: Option<String>,
    pub update_acknowledged_at: Option<String>,
    pub window: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngRoleSnapshot {
    pub title: String,
    #[serde(default)]
    pub company_context: String,
    #[serde(default)]
    pub organization_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngResource {
    pub path: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngCommands {
    pub windows: String,
    pub unix: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngEnvironment {
    pub label: String,
    pub status: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngTeammate {
    pub id: String,
    pub name: String,
    pub title: String,
    #[serde(default)]
    pub ask_about: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngHandoffPrompt {
    pub field: String,
    pub label: String,
    pub help: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngScenario {
    pub title: String,
    pub summary: String,
    #[serde(default)]
    pub candidate_brief: Vec<String>,
    #[serde(default)]
    pub initial_requirements: Vec<String>,
    #[serde(default)]
    pub resources: Vec<EngResource>,
    pub test_commands: EngCommands,
    pub setup_commands: EngCommands,
    pub update_after_minutes: u32,
    pub kickoff_from: String,
    #[serde(default)]
    pub stack: Vec<String>,
    pub target_minutes: u32,
    pub submission_grace_minutes: u32,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    #[serde(default)]
    pub supported_environments: Vec<EngEnvironment>,
    #[serde(default)]
    pub ai_policy: Vec<String>,
    #[serde(default)]
    pub packaging: Vec<String>,
    #[serde(default)]
    pub accommodations: Vec<String>,
    #[serde(default)]
    pub known_issues: Vec<String>,
    #[serde(default)]
    pub teammates: Vec<EngTeammate>,
    #[serde(default)]
    pub handoff_prompts: Vec<EngHandoffPrompt>,
    pub starter_root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngUpdate {
    pub title: String,
    pub body: String,
    pub from: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngMessage {
    pub id: String,
    pub seq: i64,
    pub sender: String,
    pub teammate_id: Option<String>,
    pub body: String,
    pub client_msg_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngDraft {
    pub body: String,
    pub revision: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngUploadFile {
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngUpload {
    pub id: String,
    pub status: String,
    pub original_filename: Option<String>,
    pub byte_size: Option<u64>,
    pub sha256: Option<String>,
    #[serde(default)]
    pub file_list: Vec<EngUploadFile>,
    pub rejection_code: Option<String>,
    pub rejection_detail: Option<String>,
    pub created_at: String,
}

/// src/lib/eng/submissions.ts — Receipt.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngReceipt {
    pub attempt_id: String,
    pub submission_id: String,
    pub archive_sha256: String,
    pub archive_bytes: u64,
    pub submitted_at: String,
    pub late: bool,
    pub processing: String,
    pub already_submitted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngView {
    pub server_now: String,
    pub attempt: EngAttemptState,
    pub role: EngRoleSnapshot,
    pub scenario: EngScenario,
    pub update: Option<EngUpdate>,
    #[serde(default)]
    pub messages: Vec<EngMessage>,
    #[serde(default)]
    pub drafts: HashMap<String, EngDraft>,
    #[serde(default)]
    pub uploads: Vec<EngUpload>,
    pub receipt: Option<EngReceipt>,
}

#[derive(Deserialize)]
struct ViewEnvelope {
    view: EngView,
}

// ---------------------------------------------------------------------------
// Candidate report — src/lib/eng/candidate-report.ts (CandidateReport),
// served by GET /api/eng/attempts/{id}/report as `{ report }` (null until
// the hiring team releases one).
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EngCitation {
    File {
        path: String,
        #[serde(rename = "lineStart")]
        line_start: Option<u32>,
        #[serde(rename = "lineEnd")]
        line_end: Option<u32>,
    },
    Message {
        #[serde(rename = "messageId")]
        message_id: String,
    },
    Handoff {
        field: String,
    },
    PublicCheck {
        id: String,
        title: String,
        outcome: String,
    },
    HiddenCheck {
        outcome: String,
    },
    #[serde(other)]
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngReportDimension {
    pub label: String,
    pub level: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngReportCriterion {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub requirement: String,
    pub state: String,
    pub state_key: String,
    pub observed: Option<String>,
    pub rationale: String,
    #[serde(default)]
    pub not_covered: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngReportFinding {
    pub id: String,
    pub dimension: String,
    pub kind: String,
    pub basis: String,
    pub statement: String,
    #[serde(default)]
    pub citations: Vec<EngCitation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngPublicCheck {
    pub id: String,
    pub title: String,
    pub outcome: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngHiddenChecks {
    pub passed: u32,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngImprovement {
    pub criterion_id: String,
    pub label: String,
    pub observation: String,
    pub why_it_matters: String,
    pub next_step: String,
    pub recheck: Option<String>,
    pub limit: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngReportVersion {
    pub version: u32,
    pub released_at: Option<String>,
    pub change_reason: Option<String>,
    pub current: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngReportResponse {
    pub id: String,
    pub report_version: u32,
    pub target_kind: String,
    pub target_id: String,
    pub kind: String,
    pub body: String,
    pub status: String,
    pub resolution: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngReport {
    pub version: u32,
    pub released_at: Option<String>,
    pub rubric_version: String,
    pub change_reason: Option<String>,
    pub summary: String,
    #[serde(default)]
    pub dimensions: Vec<EngReportDimension>,
    #[serde(default)]
    pub criteria: Vec<EngReportCriterion>,
    #[serde(default)]
    pub strengths: Vec<String>,
    #[serde(default)]
    pub gaps: Vec<String>,
    #[serde(default)]
    pub limitations: Vec<String>,
    #[serde(default)]
    pub findings: Vec<EngReportFinding>,
    #[serde(default)]
    pub public_checks: Vec<EngPublicCheck>,
    pub hidden_checks: Option<EngHiddenChecks>,
    #[serde(default)]
    pub not_assessed: Vec<String>,
    #[serde(default)]
    pub improvements: Vec<EngImprovement>,
    #[serde(default)]
    pub versions: Vec<EngReportVersion>,
    #[serde(default)]
    pub responses: Vec<EngReportResponse>,
}

// ---------------------------------------------------------------------------
// Local bookkeeping (app data, never inside the project folder)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPackage {
    pub sha256: String,
    pub bytes: u64,
    pub file_count: usize,
    pub created_at: String,
    pub upload_id: Option<String>,
    pub upload_status: Option<String>,
    pub server_sha256: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngLocalState {
    pub attempt_id: String,
    pub project_dir: String,
    pub starter_root: String,
    pub starter_sha256: String,
    pub materialized_at: String,
    pub starter_files: Vec<StarterFile>,
    #[serde(default)]
    pub last_package: Option<LocalPackage>,
    #[serde(default)]
    pub receipt: Option<EngReceipt>,
}

fn load_local(attempt_id: &str) -> AppResult<Option<EngLocalState>> {
    let path = state_path(attempt_id)?;
    match std::fs::read_to_string(&path) {
        Ok(text) => Ok(serde_json::from_str(&text).ok()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

fn save_local(state: &EngLocalState) -> AppResult<()> {
    let path = state_path(&state.attempt_id)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(state)?)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

fn require_local(attempt_id: &str) -> AppResult<EngLocalState> {
    load_local(attempt_id)?.ok_or_else(|| {
        AppError::NotFound("the project folder for this task (download the starter first)".into())
    })
}

/// The local record is trusted only for paths inside the workspace root.
fn local_project_dir(state: &EngLocalState) -> AppResult<PathBuf> {
    let expected = planned_project_dir(&state.attempt_id, &state.starter_root)?;
    if PathBuf::from(&state.project_dir) != expected {
        return Err(AppError::PathEscape);
    }
    Ok(expected)
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

// ---------------------------------------------------------------------------
// HTTP — reuses the platform client's auth (cookie + Bearer, tokens stay in
// Rust) and error mapping (`{ error }` bodies become readable messages).
// ---------------------------------------------------------------------------

fn reach(e: reqwest::Error) -> AppError {
    AppError::Platform(format!("could not reach Fydell: {}", e.without_url()))
}

async fn get_json<T: serde::de::DeserializeOwned>(path: &str, what: &str) -> AppResult<T> {
    let p = Platform::new();
    let res = p
        .authed(reqwest::Method::GET, path)
        .await?
        .send()
        .await
        .map_err(reach)?;
    let res = p.check(res, what).await?;
    res.json()
        .await
        .map_err(|e| AppError::Platform(format!("{what}: unexpected response ({})", e.without_url())))
}

async fn post_json<T: serde::de::DeserializeOwned>(
    path: &str,
    body: serde_json::Value,
    what: &str,
    timeout_secs: u64,
) -> AppResult<T> {
    let p = Platform::new();
    let res = p
        .authed(reqwest::Method::POST, path)
        .await?
        .json(&body)
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .send()
        .await
        .map_err(reach)?;
    let res = p.check(res, what).await?;
    res.json()
        .await
        .map_err(|e| AppError::Platform(format!("{what}: unexpected response ({})", e.without_url())))
}

async fn fetch_view(attempt_id: &str) -> AppResult<EngView> {
    let env: ViewEnvelope = get_json(&format!("/api/eng/attempts/{attempt_id}"), "load task").await?;
    Ok(env.view)
}

/// The signed upload URL must point at this deployment's Supabase Storage
/// signed-upload endpoint for the submissions bucket — never anywhere else.
pub fn signed_upload_url_allowed(signed: &str, supabase_url: &str) -> bool {
    let (Ok(target), Ok(base)) = (url::Url::parse(signed), url::Url::parse(supabase_url)) else {
        return false;
    };
    let local = matches!(target.host_str(), Some("localhost") | Some("127.0.0.1"));
    let scheme_ok = target.scheme() == "https" || (target.scheme() == "http" && local);
    scheme_ok
        && target.scheme() == base.scheme()
        && target.host_str() == base.host_str()
        && target.port_or_known_default() == base.port_or_known_default()
        && target
            .path()
            .starts_with("/storage/v1/object/upload/sign/eng-submissions/")
        && target.query_pairs().any(|(k, v)| k == "token" && !v.is_empty())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngAttemptDetail {
    pub view: EngView,
    pub local: Option<EngLocalState>,
    /// Where `eng_prepare_workspace` creates (or created) the project.
    pub planned_project_dir: String,
    /// "windows" | "macos" | "linux" — picks the matching setup command.
    pub os: String,
}

fn detail(view: EngView) -> AppResult<EngAttemptDetail> {
    let attempt_id = valid_attempt_id(&view.attempt.id)?;
    let planned = planned_project_dir(&attempt_id, &view.scenario.starter_root)?;
    Ok(EngAttemptDetail {
        local: load_local(&attempt_id)?,
        planned_project_dir: planned.to_string_lossy().into_owned(),
        os: std::env::consts::OS.to_string(),
        view,
    })
}

#[tauri::command]
pub async fn eng_list_tasks() -> AppResult<EngTaskList> {
    let p = Platform::new();
    let res = p
        .authed(reqwest::Method::GET, "/api/eng/attempts")
        .await?
        .send()
        .await
        .map_err(reach)?;
    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::Platform(
            "this Fydell server does not list engineering tasks yet (GET /api/eng/attempts is missing)".into(),
        ));
    }
    let res = p.check(res, "list engineering tasks").await?;
    res.json()
        .await
        .map_err(|e| AppError::Platform(format!("engineering tasks: unexpected response ({})", e.without_url())))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AcceptResponse {
    attempt_id: String,
}

/// Accept a pending invitation addressed to the signed-in email. The server
/// checks ownership; re-accepting returns the same attempt.
#[tauri::command]
pub async fn eng_accept_invitation(invitation_id: String) -> AppResult<String> {
    let id = valid_attempt_id(&invitation_id)?;
    let res: AcceptResponse = post_json(
        "/api/eng/invitations/accept",
        serde_json::json!({ "invitationId": id }),
        "accept invitation",
        30,
    )
    .await?;
    valid_attempt_id(&res.attempt_id)
}

#[tauri::command]
pub async fn eng_open_attempt(attempt_id: String) -> AppResult<EngAttemptDetail> {
    let id = valid_attempt_id(&attempt_id)?;
    detail(fetch_view(&id).await?)
}

#[tauri::command]
pub async fn eng_record_consent(attempt_id: String) -> AppResult<EngAttemptDetail> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: ViewEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/consent"),
        serde_json::json!({}),
        "record consent",
        30,
    )
    .await?;
    detail(env.view)
}

/// Downloads the starter (`GET /api/eng/attempts/{id}/starter`), verifies it
/// against the `X-Content-SHA256` header the route sends, and materializes it
/// into the task's project folder. Idempotent: a folder created earlier is
/// returned as-is, never overwritten.
#[tauri::command]
pub async fn eng_prepare_workspace(attempt_id: String) -> AppResult<EngLocalState> {
    let id = valid_attempt_id(&attempt_id)?;
    if let Some(existing) = load_local(&id)? {
        if local_project_dir(&existing)?.is_dir() {
            return Ok(existing);
        }
    }
    let view = fetch_view(&id).await?;
    let root = view.scenario.starter_root.clone();
    let project = planned_project_dir(&id, &root)?;
    let parent = project
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::PathEscape)?;

    let p = Platform::new();
    let res = p
        .authed(reqwest::Method::GET, &format!("/api/eng/attempts/{id}/starter"))
        .await?
        .send()
        .await
        .map_err(reach)?;
    let res = p.check(res, "download starter").await?;
    let expected = res
        .headers()
        .get("x-content-sha256")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string)
        .ok_or_else(|| {
            AppError::Integrity(
                "the platform did not send a hash for the starter, so it was not used".into(),
            )
        })?;
    if res.content_length().unwrap_or(0) > 50 * 1024 * 1024 {
        return Err(AppError::Integrity("the starter download is larger than expected".into()));
    }
    let bytes = res
        .bytes()
        .await
        .map_err(|e| AppError::Platform(format!("starter download interrupted: {}", e.without_url())))?;

    let files = eng_package::extract_starter(&bytes, &expected, &root, &parent)?;
    let state = EngLocalState {
        attempt_id: id,
        project_dir: project.to_string_lossy().into_owned(),
        starter_root: root,
        starter_sha256: expected.to_ascii_lowercase(),
        materialized_at: now_iso(),
        starter_files: files,
        last_package: None,
        receipt: None,
    };
    save_local(&state)?;
    Ok(state)
}

/// Paste-back of the code `preflight.py` prints. The desktop does not run
/// the setup check; the candidate runs it in their own terminal.
#[tauri::command]
pub async fn eng_confirm_setup(attempt_id: String, code: String) -> AppResult<EngAttemptDetail> {
    let id = valid_attempt_id(&attempt_id)?;
    let code = code.trim();
    if code.is_empty() || code.chars().count() > 200 {
        return Err(AppError::Execution(
            "paste the line the setup check printed, starting with \"Setup code:\"".into(),
        ));
    }
    let env: ViewEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/preflight"),
        serde_json::json!({ "code": code }),
        "confirm setup",
        30,
    )
    .await?;
    detail(env.view)
}

#[tauri::command]
pub async fn eng_start(attempt_id: String) -> AppResult<EngAttemptDetail> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: ViewEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/start"),
        serde_json::json!({}),
        "start task",
        30,
    )
    .await?;
    detail(env.view)
}

#[derive(Deserialize)]
struct MessagesEnvelope {
    messages: Vec<EngMessage>,
}

/// Sends a message to the simulated team. The reply is composed on the
/// platform server and returned with the refreshed thread.
#[tauri::command]
pub async fn eng_send_message(attempt_id: String, body: String) -> AppResult<Vec<EngMessage>> {
    let id = valid_attempt_id(&attempt_id)?;
    let body = body.trim();
    let len = body.chars().count();
    if len == 0 || len > 4000 {
        return Err(AppError::Execution(
            "messages must be between 1 and 4,000 characters".into(),
        ));
    }
    let client_msg_id = format!("d{}", uuid::Uuid::new_v4().simple());
    let env: MessagesEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/messages"),
        serde_json::json!({ "body": body, "clientMsgId": client_msg_id }),
        "send message",
        90,
    )
    .await?;
    Ok(env.messages)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AckEnvelope {
    acknowledged_at: Option<String>,
}

#[tauri::command]
pub async fn eng_acknowledge_update(attempt_id: String) -> AppResult<Option<String>> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: AckEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/acknowledge-update"),
        serde_json::json!({}),
        "acknowledge update",
        30,
    )
    .await?;
    Ok(env.acknowledged_at)
}

/// Mirrors DRAFT_FIELDS in src/lib/eng/attempts.ts.
const DRAFT_FIELDS: &[&str] = &["what_changed", "testing", "risks", "next_steps", "ai_use", "message"];
const ANSWER_FIELDS: &[&str] = &["what_changed", "testing", "risks", "next_steps", "ai_use"];

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EngDraftSave {
    Saved { revision: u64 },
    Conflict { body: String, revision: u64 },
}

#[derive(Deserialize)]
struct DraftOk {
    revision: u64,
}

#[derive(Deserialize)]
struct DraftConflict {
    current: EngDraft,
}

/// `PUT /api/eng/attempts/{id}/drafts` — revision-fenced; a 409 returns the
/// server's current text so the UI can show both versions.
#[tauri::command]
pub async fn eng_save_draft(
    attempt_id: String,
    field: String,
    body: String,
    base_revision: u64,
) -> AppResult<EngDraftSave> {
    let id = valid_attempt_id(&attempt_id)?;
    if !DRAFT_FIELDS.contains(&field.as_str()) {
        return Err(AppError::Execution("unknown draft field".into()));
    }
    if body.chars().count() > 8000 {
        return Err(AppError::Execution("keep each answer under 8,000 characters".into()));
    }
    let p = Platform::new();
    let res = p
        .authed(reqwest::Method::PUT, &format!("/api/eng/attempts/{id}/drafts"))
        .await?
        .json(&serde_json::json!({ "field": field, "body": body, "baseRevision": base_revision }))
        .send()
        .await
        .map_err(reach)?;
    if res.status() == reqwest::StatusCode::CONFLICT {
        let text = res.text().await.unwrap_or_default();
        if let Ok(c) = serde_json::from_str::<DraftConflict>(&text) {
            return Ok(EngDraftSave::Conflict {
                body: c.current.body,
                revision: c.current.revision,
            });
        }
        let detail = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|v| v.get("error").and_then(|e| e.as_str()).map(str::to_string))
            .unwrap_or_else(|| "the draft could not be saved".into());
        return Err(AppError::Platform(format!("save draft: {detail}")));
    }
    let res = p.check(res, "save draft").await?;
    let ok: DraftOk = res
        .json()
        .await
        .map_err(|e| AppError::Platform(format!("save draft: unexpected response ({})", e.without_url())))?;
    Ok(EngDraftSave::Saved { revision: ok.revision })
}

fn starter_map(state: &EngLocalState) -> BTreeMap<String, String> {
    state
        .starter_files
        .iter()
        .map(|f| (f.path.clone(), f.sha256.clone()))
        .collect()
}

/// What would be uploaded right now: included files (and whether each
/// differs from the starter), what is left out and why, and any problem
/// that would make the platform reject the archive.
#[tauri::command]
pub fn eng_package_preview(attempt_id: String) -> AppResult<PackagePlan> {
    let id = valid_attempt_id(&attempt_id)?;
    let state = require_local(&id)?;
    let project = local_project_dir(&state)?;
    eng_package::plan_package(&project, &state.starter_root, &starter_map(&state))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InitiateUpload {
    upload_id: String,
    signed_url: String,
}

#[derive(Deserialize)]
struct FinalizeEnvelope {
    upload: EngUpload,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngUploadOutcome {
    pub upload: EngUpload,
    pub local_sha256: String,
    pub local_bytes: u64,
    pub file_count: usize,
    /// True when the platform accepted the archive and its SHA-256 equals
    /// the one computed here before upload.
    pub matches_local: bool,
}

#[derive(Clone, Serialize)]
struct UploadProgress {
    attempt_id: String,
    phase: &'static str,
}

/// Packages the project folder and uploads it through the platform's upload
/// route: initiate (`POST uploads` → upload id + signed storage URL), PUT the
/// bytes to that URL, then `finalize`, where the server inspects what
/// actually landed in storage. Nothing is submitted here.
#[tauri::command]
pub async fn eng_upload_package(app: AppHandle, attempt_id: String) -> AppResult<EngUploadOutcome> {
    let id = valid_attempt_id(&attempt_id)?;
    let mut state = require_local(&id)?;
    let project = local_project_dir(&state)?;
    let progress = |phase: &'static str| {
        let _ = app.emit("eng-upload-progress", UploadProgress { attempt_id: id.clone(), phase });
    };

    progress("packaging");
    let plan = eng_package::plan_package(&project, &state.starter_root, &starter_map(&state))?;
    let bytes = eng_package::build_archive(&project, &plan)?;
    let local_sha256 = eng_package::sha256_hex(&bytes);
    let file_count = plan.included.len();

    progress("uploading");
    let init: InitiateUpload = post_json(
        &format!("/api/eng/attempts/{id}/uploads"),
        serde_json::json!({ "fileName": format!("{}.zip", state.starter_root), "byteSize": bytes.len() }),
        "start upload",
        30,
    )
    .await?;
    let upload_id = valid_attempt_id(&init.upload_id)?;
    let supabase = crate::config::supabase().await?;
    if !signed_upload_url_allowed(&init.signed_url, &supabase.url) {
        return Err(AppError::Integrity(
            "the upload address from the platform is not this deployment's file storage; nothing was sent".into(),
        ));
    }
    let put = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .user_agent(concat!("fydell-desktop/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| AppError::Platform(format!("could not prepare the upload: {}", e.without_url())))?
        .put(&init.signed_url)
        .header("apikey", &supabase.anon_key)
        .header("x-upsert", "false")
        .header(reqwest::header::CONTENT_TYPE, "application/zip")
        .body(bytes.clone())
        .send()
        .await;
    let put_ok = matches!(&put, Ok(r) if r.status().is_success());

    progress("validating");
    let fin: FinalizeEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/uploads/{upload_id}/finalize"),
        serde_json::json!({}),
        "check upload",
        60,
    )
    .await?;
    let upload = fin.upload;
    if !put_ok && upload.status != "accepted" {
        let status = match put {
            Ok(r) => format!("storage answered HTTP {}", r.status().as_u16()),
            Err(e) => e.without_url().to_string(),
        };
        return Err(AppError::Platform(format!(
            "the upload did not complete ({status}). Nothing was submitted; try again"
        )));
    }
    let matches_local = upload.status == "accepted"
        && upload
            .sha256
            .as_deref()
            .map(|s| s.eq_ignore_ascii_case(&local_sha256))
            .unwrap_or(false);

    state.last_package = Some(LocalPackage {
        sha256: local_sha256.clone(),
        bytes: bytes.len() as u64,
        file_count,
        created_at: now_iso(),
        upload_id: Some(upload.id.clone()),
        upload_status: Some(upload.status.clone()),
        server_sha256: upload.sha256.clone(),
    });
    save_local(&state)?;

    Ok(EngUploadOutcome {
        upload,
        local_sha256,
        local_bytes: bytes.len() as u64,
        file_count,
        matches_local,
    })
}

#[derive(Deserialize)]
struct ReceiptEnvelope {
    receipt: EngReceipt,
}

/// `POST /api/eng/attempts/{id}/submit` with the accepted upload and the
/// handoff answers. Idempotent server-side: a retry returns the original
/// receipt.
#[tauri::command]
pub async fn eng_submit(
    attempt_id: String,
    upload_id: String,
    answers: HashMap<String, String>,
) -> AppResult<EngReceipt> {
    let id = valid_attempt_id(&attempt_id)?;
    let upload_id = valid_attempt_id(&upload_id)?;
    let mut body = serde_json::Map::new();
    body.insert("uploadId".into(), serde_json::Value::String(upload_id));
    for (key, value) in answers {
        if !ANSWER_FIELDS.contains(&key.as_str()) {
            return Err(AppError::Execution(format!("unknown handoff field: {key}")));
        }
        if value.chars().count() > 8000 {
            return Err(AppError::Execution("keep each answer under 8,000 characters".into()));
        }
        body.insert(key, serde_json::Value::String(value));
    }
    let env: ReceiptEnvelope = post_json(
        &format!("/api/eng/attempts/{id}/submit"),
        serde_json::Value::Object(body),
        "submit",
        120,
    )
    .await?;
    if let Some(mut state) = load_local(&id)? {
        state.receipt = Some(env.receipt.clone());
        save_local(&state)?;
    }
    Ok(env.receipt)
}

#[derive(Deserialize)]
struct ReportEnvelope {
    report: Option<EngReport>,
}

#[tauri::command]
pub async fn eng_get_report(attempt_id: String) -> AppResult<Option<EngReport>> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: ReportEnvelope = get_json(&format!("/api/eng/attempts/{id}/report"), "load report").await?;
    Ok(env.report)
}

/// Opens this task's project folder in the OS file manager. The path comes
/// from the local record and must sit inside the workspace root; the
/// renderer cannot choose it.
#[tauri::command]
pub fn eng_open_workspace(app: AppHandle, attempt_id: String) -> AppResult<()> {
    use tauri_plugin_opener::OpenerExt;
    let id = valid_attempt_id(&attempt_id)?;
    let state = require_local(&id)?;
    let project = local_project_dir(&state)?;
    if !project.is_dir() {
        return Err(AppError::NotFound("the project folder for this task".into()));
    }
    app.opener()
        .open_path(project.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|e| AppError::Io(format!("could not open the folder: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attempt_ids_must_be_uuids() {
        assert!(valid_attempt_id("0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b").is_ok());
        assert_eq!(
            valid_attempt_id(" 0B8A1F2E-3C4D-4E5F-8A9B-0C1D2E3F4A5B ").unwrap(),
            "0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b"
        );
        for bad in ["", "../etc/passwd", "0b8a1f2e3c4d4e5f8a9b0c1d2e3f4a5b", "0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5/"] {
            assert!(valid_attempt_id(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn signed_url_must_target_this_storage_bucket() {
        let base = "https://abc.supabase.co";
        let good = "https://abc.supabase.co/storage/v1/object/upload/sign/eng-submissions/attempts/x/y.zip?token=t";
        assert!(signed_upload_url_allowed(good, base));
        assert!(!signed_upload_url_allowed(
            "https://evil.example/storage/v1/object/upload/sign/eng-submissions/a.zip?token=t",
            base
        ));
        assert!(!signed_upload_url_allowed(
            "http://abc.supabase.co/storage/v1/object/upload/sign/eng-submissions/a.zip?token=t",
            base
        ));
        assert!(!signed_upload_url_allowed(
            "https://abc.supabase.co/storage/v1/object/upload/sign/other-bucket/a.zip?token=t",
            base
        ));
        assert!(!signed_upload_url_allowed(
            "https://abc.supabase.co/storage/v1/object/upload/sign/eng-submissions/a.zip",
            base
        ));
        assert!(signed_upload_url_allowed(
            "http://127.0.0.1:54321/storage/v1/object/upload/sign/eng-submissions/a.zip?token=t",
            "http://127.0.0.1:54321"
        ));
    }

    #[test]
    fn candidate_view_parses_server_shape() {
        let raw = serde_json::json!({
            "serverNow": "2026-10-07T10:00:00.000Z",
            "attempt": {
                "id": "0b8a1f2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b", "status": "in_progress",
                "consentedAt": "2026-10-07T09:00:00Z", "preflightPassedAt": "2026-10-07T09:10:00Z",
                "preflightRuntime": "python 3.12", "startedAt": "2026-10-07T09:15:00Z",
                "dueAt": "2026-10-07T10:45:00Z", "extensionMinutes": 0, "allowedMinutes": 90,
                "submittedAt": null, "updateReleasedAt": null, "updateAcknowledgedAt": null, "window": "open"
            },
            "role": { "title": "Backend Engineer", "companyContext": "Payments", "organizationName": "Example Co", "scenarioKey": "k", "scenarioVersion": 2 },
            "scenario": {
                "title": "Webhook retries", "summary": "Fix retries", "candidateBrief": ["a"], "initialRequirements": ["b"],
                "resources": [{ "path": "INCIDENT.md", "description": "Incident" }],
                "testCommands": { "windows": "py -m pytest", "unix": "python3 -m pytest" },
                "setupCommands": { "windows": "py preflight.py", "unix": "python3 preflight.py" },
                "updateAfterMinutes": 25, "kickoffFrom": "Lead", "stack": ["Python"], "targetMinutes": 50,
                "submissionGraceMinutes": 10, "prerequisites": [], "supportedEnvironments": [{ "label": "Windows", "status": "validated", "note": "" }],
                "aiPolicy": ["Allowed"], "packaging": [], "accommodations": [], "knownIssues": [],
                "teammates": [{ "id": "lead", "name": "Lead", "title": "Engineering lead" }],
                "handoffPrompts": [{ "field": "what_changed", "label": "What changed", "help": "" }],
                "starterRoot": "harbor-webhooks"
            },
            "update": null,
            "messages": [{ "id": "m1", "seq": 1, "sender": "teammate", "teammate_id": "lead", "body": "Hi", "client_msg_id": "kickoff", "created_at": "2026-10-07T09:15:00Z" }],
            "drafts": { "what_changed": { "body": "x", "revision": 2 } },
            "uploads": [],
            "receipt": null
        });
        let view: EngView = serde_json::from_value(raw).unwrap();
        assert_eq!(view.scenario.starter_root, "harbor-webhooks");
        assert_eq!(view.messages[0].teammate_id.as_deref(), Some("lead"));
        assert_eq!(view.drafts["what_changed"].revision, 2);
        let back = serde_json::to_value(&view).unwrap();
        assert_eq!(back["attempt"]["allowedMinutes"], 90);
        assert_eq!(back["messages"][0]["client_msg_id"], "kickoff");
    }

    #[test]
    fn report_citations_tolerate_unknown_kinds() {
        let raw = serde_json::json!([
            { "kind": "file", "path": "a.py", "lineStart": 3, "lineEnd": 5 },
            { "kind": "hidden_check", "outcome": "passed" },
            { "kind": "something_new", "x": 1 }
        ]);
        let cites: Vec<EngCitation> = serde_json::from_value(raw).unwrap();
        assert!(matches!(cites[0], EngCitation::File { line_start: Some(3), .. }));
        assert!(matches!(cites[2], EngCitation::Other));
        assert_eq!(serde_json::to_value(&cites[0]).unwrap()["lineStart"], 3);
    }
}
