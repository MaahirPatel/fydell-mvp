//! HTTPS client for the real Fydell platform session API.
//!
//! Routes live under `src/app/api/sim/` in the Next.js app. Every response
//! shape below is taken from the route file cited on the type; the desktop
//! invents no platform API of its own.
//!
//! Contract fields not yet consumed by the UI are kept on purpose, so the
//! platform surface stays visible (hence the module-level allow).

#![allow(dead_code)]
//!
//! Auth: every candidate route requires `requireUser()`
//! (src/lib/simulations/auth.ts), which reads the Supabase session from
//! cookies. The desktop therefore sends the @supabase/ssr session cookie
//! (built by `auth::auth_headers`, format verified against
//! @supabase/ssr@0.12.0) **and** an `Authorization: Bearer` header. The
//! Bearer header is ignored by the web app today; it needs web addition W2
//! (see desktop/ARCHITECTURE.md) and is sent for forward compatibility.
//!
//! Base URL: `config::platform_base()` (production in release builds).

use crate::auth;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Invitation preview — src/app/api/sim/invitations/[token]/route.ts
// GET is public (marks the invitation opened); POST requires auth.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitationSimulation {
    pub title: String,
    pub role_title: String,
    pub scenario_summary: String,
    pub duration_minutes: u32,
    pub tools_available: Vec<String>,
    pub skills_evaluated: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitationDetail {
    pub status: String,
    pub candidate_email: Option<String>,
    pub candidate_name: Option<String>,
    pub expires_at: Option<String>,
    pub organization_name: String,
    pub simulation: InvitationSimulation,
}

/// GET /api/sim/invitations/{token} → { ok, reason, invitation }
#[derive(Debug, Clone, Deserialize)]
pub struct InvitationPreview {
    pub ok: bool,
    pub reason: Option<String>,
    pub invitation: Option<InvitationDetail>,
}

/// POST /api/sim/invitations/{token} → { ok, sessionId }
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AcceptInvitationResponse {
    session_id: String,
}

// ---------------------------------------------------------------------------
// Session — src/app/api/sim/sessions/[id]/route.ts (GET, auth required)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMeta {
    pub id: String,
    pub status: String,
    pub duration_minutes: u32,
    pub started_at: Option<String>,
    pub ends_at: Option<String>,
    pub submitted_at: Option<String>,
    pub curveball_presented_at: Option<String>,
    pub curveball_acknowledged_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionGate {
    pub consent_policy_version: String,
    pub consent_accepted: bool,
    pub preflight_ok: bool,
    pub preflight_limitations: Vec<String>,
    /// The platform already anticipates this client: the gate ships
    /// `desktopRequired: true`.
    pub desktop_required: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionStateView {
    pub revision: u64,
    pub current_task_id: Option<String>,
    pub notes: String,
    pub deliverable: serde_json::Value,
    pub workspace: serde_json::Value,
    pub completed_task_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMessage {
    pub id: String,
    pub thread: String,
    pub stakeholder_id: Option<String>,
    pub sender: String,
    pub body: String,
    pub created_at: String,
}

/// GET /api/sim/sessions/{id} →
/// { session, content, workbench, gate, state, messages }.
/// `content` is the candidate-safe scenario view
/// (src/lib/simulations/candidate-view.ts); `workbench` the v2 view.
/// Both are `serde_json::Value` here — the desktop renders the fields it
/// needs (title, mission, tasks, resources, deliverableFields) defensively.
#[derive(Debug, Clone, Deserialize)]
pub struct FullSession {
    pub session: SessionMeta,
    pub content: serde_json::Value,
    pub workbench: serde_json::Value,
    pub gate: SessionGate,
    pub state: SessionStateView,
    pub messages: Vec<SessionMessage>,
    /// W3: versioned, candidate-safe file package (null for templates without
    /// an on-disk scenario). Verified against its manifest on materialize.
    #[serde(default)]
    pub file_package: Option<FilePackage>,
}

/// W3 — versioned candidate-safe file package, served by
/// `GET /api/sim/sessions/{id}` as `filePackage`.
/// Built server-side from `scenarios/<id>/.fydell/scenario.json`'s file
/// allowlist only: `canonical.json` and hidden eval material can never be in
/// `files` because the builder never reads them.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePackage {
    pub scenario_id: String,
    pub scenario_version: String,
    pub label: String,
    #[serde(default)]
    pub test_command: Vec<String>,
    /// "remote": tests run on the platform's isolated runner (nothing to
    /// install locally). "local" or absent: the legacy local runner.
    #[serde(default)]
    pub execution: Option<String>,
    pub files: std::collections::HashMap<String, String>,
    pub manifest: std::collections::HashMap<String, String>,
}

/// W4 — full file snapshot sent in the submit body. The server recomputes
/// every manifest hash, rejects any mismatch, computes the receipt hash
/// itself, and stores everything transactionally (all files or none).
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSnapshot {
    pub scenario_id: String,
    pub scenario_version: String,
    pub files: std::collections::HashMap<String, String>,
    pub manifest: std::collections::HashMap<String, String>,
}

// ---------------------------------------------------------------------------
// Consent — src/app/api/sim/sessions/[id]/consent/route.ts
// ---------------------------------------------------------------------------

/// POST /api/sim/sessions/{id}/consent { accepted: true, policyVersion }
/// → { ok, consentId, policyVersion }. 409 on policy version mismatch.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConsentResponse {
    consent_id: String,
    policy_version: String,
}

// ---------------------------------------------------------------------------
// Preflight — src/app/api/sim/sessions/[id]/preflight/route.ts
// ---------------------------------------------------------------------------

/// POST /api/sim/sessions/{id}/preflight
/// { viewportWidth, viewportHeight, userAgent, localStorageOk }
/// → { ok, preflightId, result, canStart }.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PreflightResponse {
    ok: bool,
    preflight_id: String,
    can_start: bool,
}

// ---------------------------------------------------------------------------
// Start — src/app/api/sim/sessions/[id]/start/route.ts
// ---------------------------------------------------------------------------

/// POST /api/sim/sessions/{id}/start → { ok, startedAt, endsAt }.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartResponse {
    started_at: String,
    ends_at: String,
}

// ---------------------------------------------------------------------------
// State — src/app/api/sim/sessions/[id]/state/route.ts
// PATCH { baseRevision, notes?, deliverable?, workspace?, currentTaskId?,
//        openResourceId?, completedTaskIds? }
// → { ok: true, revision } or 409 { ok: false, conflict: {...} }.
// 409 also when the session is not active.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StatePatch {
    #[serde(skip_serializing)]
    pub base_revision: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deliverable: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_task_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct StateOkResponse {
    revision: u64,
}

#[derive(Debug, Deserialize)]
struct StateConflictResponse {
    conflict: StateConflict,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateConflict {
    pub revision: u64,
}

// ---------------------------------------------------------------------------
// Events — src/app/api/sim/sessions/[id]/events/route.ts
// POST { eventType, resourceId?, taskId?, payload?, clientEventId? }
// → { ok, id, duplicate }. 400 on unknown type, 409 if not active.
// ---------------------------------------------------------------------------

/// Whitelist copied from ALLOWED_CANDIDATE_EVENTS in the route file.
/// The desktop maps its local event kinds onto these (see events.rs).
pub const ALLOWED_EVENT_TYPES: &[&str] = &[
    "resource_opened",
    "resource_downloaded",
    "task_completed",
    "task_reopened",
    "notes_edited",
    "deliverable_field_edited",
    "workspace_action",
    "curveball_acknowledged",
    "table_sorted",
    "table_filtered",
    "row_flagged",
    "ticket_selected",
    "step_toggled",
    "rule_reviewed",
    "decision_selected",
    "evidence_selected",
    "deliverable_revised",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformEvent {
    pub event_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_event_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EventResponse {
    id: String,
    duplicate: bool,
}

// ---------------------------------------------------------------------------
// Submit — src/app/api/sim/sessions/[id]/submit/route.ts
// GET  → { status, fields: [{key,label,required,complete}],
//          incompleteRequired, taskCount, completedTaskCount }
// POST { externalAiDisclosed?, answers? } → { ok, submissionId, alreadySubmitted }
// (idempotent). The "__aiDisclosure" key inside answers is honored.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitField {
    pub key: String,
    pub label: String,
    pub required: bool,
    pub complete: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmissionReview {
    pub status: String,
    pub fields: Vec<SubmitField>,
    pub incomplete_required: Vec<String>,
    pub task_count: u32,
    pub completed_task_count: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubmitResponse {
    submission_id: String,
    already_submitted: bool,
    /// W4: server-computed receipt hash over the canonical snapshot encoding.
    #[serde(default)]
    receipt_hash: Option<String>,
}

// ---------------------------------------------------------------------------
// Test runs — src/app/api/sim/sessions/[id]/runs/route.ts
// POST { files: { path: content }, clientRunId } →
//   { ok, runId, reused, status, run: { status, statusReason,
//     candidateSnapshotHash, suiteVersion, environmentVersion,
//     tests: [{ id, origin, outcome, message? }], summary, restoredTrusted,
//     ignored: [{ path, reason }], output, outputTruncated } | null }
// The platform runs the scenario's tests on its isolated runner against
// exactly these files; nothing executes on this machine.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteTestCase {
    pub id: String,
    pub origin: String,
    pub outcome: String,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct RemoteSummary {
    pub passed: u32,
    pub failed: u32,
    pub errors: u32,
    pub skipped: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RemoteIgnored {
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteRun {
    pub status: String,
    #[serde(default)]
    pub status_reason: Option<String>,
    pub candidate_snapshot_hash: String,
    pub suite_version: String,
    #[serde(default)]
    pub environment_version: String,
    #[serde(default)]
    pub tests: Vec<RemoteTestCase>,
    #[serde(default)]
    pub summary: RemoteSummary,
    #[serde(default)]
    pub restored_trusted: Vec<String>,
    #[serde(default)]
    pub ignored: Vec<RemoteIgnored>,
    #[serde(default)]
    pub output: String,
    #[serde(default)]
    pub output_truncated: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteRunResponse {
    pub run_id: String,
    #[serde(default)]
    pub reused: bool,
    pub status: String,
    #[serde(default)]
    pub run: Option<RemoteRun>,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

pub struct Platform {
    base: String,
    http: reqwest::Client,
}

impl Platform {
    pub fn new() -> Self {
        let base = crate::config::platform_base();
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .user_agent(concat!("fydell-desktop/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("reqwest client builds");
        Platform { base, http }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base, path)
    }

    /// Authenticated request builder: Supabase session cookie (works with the
    /// deployed web app today) + Bearer header (forward-compatible, needs W2).
    pub(crate) async fn authed(
        &self,
        method: reqwest::Method,
        path: &str,
    ) -> AppResult<reqwest::RequestBuilder> {
        let (cookie, bearer) = auth::auth_headers().await?;
        Ok(self
            .http
            .request(method, self.url(path))
            .header(reqwest::header::COOKIE, cookie)
            .header(reqwest::header::AUTHORIZATION, bearer))
    }

    pub(crate) async fn check(&self, res: reqwest::Response, what: &str) -> AppResult<reqwest::Response> {
        let status = res.status();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(AppError::Auth(
                "platform rejected the session; please sign in again".to_string(),
            ));
        }
        if !status.is_success() {
            let body = res.text().await.unwrap_or_default();
            let detail: String = serde_json::from_str::<serde_json::Value>(&body)
                .ok()
                .and_then(|v| {
                    v.get("error")
                        .and_then(|e| e.as_str())
                        .map(|s| s.to_string())
                })
                .unwrap_or_else(|| format!("HTTP {}", status));
            return Err(AppError::Platform(format!("{what}: {detail}")));
        }
        Ok(res)
    }

    // -- invitations --------------------------------------------------------

    /// Public preview. No auth.
    pub async fn invitation_preview(&self, token: &str) -> AppResult<InvitationPreview> {
        let res = self
            .http
            .get(self.url(&format!("/api/sim/invitations/{}", token)))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "invitation preview").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad invitation preview: {e}")))
    }

    /// Accept (auth required) → platform session id.
    ///
    /// Token-based: for emailed / pasted invite links.
    /// POST /api/sim/invitations/{token} → { ok, sessionId }.
    pub async fn accept_invitation(&self, token: &str) -> AppResult<String> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/invitations/{}", token),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "accept invitation").await?;
        let body: AcceptInvitationResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad accept response: {e}")))?;
        Ok(body.session_id)
    }

    /// Accept by invitation id (auth required) → platform session id.
    ///
    /// POST /api/sim/invitations/accept { invitationId } → { ok, sessionId }.
    /// The inbox uses this path: the listing is read-only (it carries no
    /// token), so the server verifies the session email owns the invitation.
    /// Idempotent: re-accepting returns the existing session.
    pub async fn accept_invitation_by_id(&self, invitation_id: &str) -> AppResult<String> {
        let res = self
            .authed(reqwest::Method::POST, "/api/sim/invitations/accept")
            .await?
            .json(&serde_json::json!({ "invitationId": invitation_id }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "accept invitation").await?;
        let body: AcceptInvitationResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad accept response: {e}")))?;
        Ok(body.session_id)
    }

    // -- test runs ----------------------------------------------------------

    /// Run the scenario's tests on the platform's isolated runner against
    /// exactly `files`. `client_run_id` makes a retried request return the
    /// same run instead of running twice.
    pub async fn run_tests(
        &self,
        session_id: &str,
        files: &HashMap<String, String>,
        client_run_id: &str,
    ) -> AppResult<RemoteRunResponse> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/runs", session_id),
            )
            .await?
            .json(&serde_json::json!({ "files": files, "clientRunId": client_run_id }))
            // An isolated run can take longer than the client's default timeout.
            .timeout(std::time::Duration::from_secs(200))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach the test runner: {e}")))?;
        let res = self.check(res, "run tests").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad test run response: {e}")))
    }

    // -- session ------------------------------------------------------------

    pub async fn fetch_session(&self, session_id: &str) -> AppResult<FullSession> {
        let res = self
            .authed(
                reqwest::Method::GET,
                &format!("/api/sim/sessions/{}", session_id),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "fetch session").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad session payload: {e}")))
    }

    pub async fn accept_consent(
        &self,
        session_id: &str,
        policy_version: &str,
    ) -> AppResult<String> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/consent", session_id),
            )
            .await?
            .json(&serde_json::json!({ "accepted": true, "policyVersion": policy_version }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        if res.status() == reqwest::StatusCode::CONFLICT {
            return Err(AppError::Platform(
                "consent policy changed; please re-open the assignment".to_string(),
            ));
        }
        let res = self.check(res, "record consent").await?;
        let body: ConsentResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad consent response: {e}")))?;
        Ok(body.consent_id)
    }

    /// Record a desktop preflight. The web route expects browser-ish fields;
    /// the desktop reports its own environment truthfully.
    pub async fn record_preflight(&self, session_id: &str) -> AppResult<bool> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/preflight", session_id),
            )
            .await?
            .json(&serde_json::json!({
                "viewportWidth": 1440,
                "viewportHeight": 900,
                "userAgent": concat!("fydell-desktop/", env!("CARGO_PKG_VERSION")),
                "localStorageOk": true,
            }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "record preflight").await?;
        let body: PreflightResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad preflight response: {e}")))?;
        Ok(body.ok && body.can_start)
    }

    pub async fn start_session(&self, session_id: &str) -> AppResult<(String, String)> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/start", session_id),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "start session").await?;
        let body: StartResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad start response: {e}")))?;
        Ok((body.started_at, body.ends_at))
    }

    /// PATCH working state with optimistic concurrency.
    /// Ok(new_revision) on success; Err(StateConflict) on 409.
    pub async fn patch_state(
        &self,
        session_id: &str,
        patch: &StatePatch,
    ) -> AppResult<Result<u64, StateConflict>> {
        let mut body = serde_json::to_value(patch)
            .map_err(|e| AppError::Platform(format!("bad state patch: {e}")))?;
        body["baseRevision"] = serde_json::json!(patch.base_revision);
        let res = self
            .authed(
                reqwest::Method::PATCH,
                &format!("/api/sim/sessions/{}/state", session_id),
            )
            .await?
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        if res.status() == reqwest::StatusCode::CONFLICT {
            let body: StateConflictResponse = res
                .json()
                .await
                .map_err(|e| AppError::Platform(format!("bad conflict response: {e}")))?;
            return Ok(Err(body.conflict));
        }
        let res = self.check(res, "save state").await?;
        let body: StateOkResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad state response: {e}")))?;
        Ok(Ok(body.revision))
    }

    /// POST a whitelisted candidate event. Returns (platform_event_id, duplicate).
    pub async fn post_event(
        &self,
        session_id: &str,
        event: &PlatformEvent,
    ) -> AppResult<(String, bool)> {
        if !ALLOWED_EVENT_TYPES.contains(&event.event_type.as_str()) {
            return Err(AppError::Execution(format!(
                "event type not allowed by platform: {}",
                event.event_type
            )));
        }
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/events", session_id),
            )
            .await?
            .json(event)
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        if res.status() == reqwest::StatusCode::CONFLICT {
            // Session is not active — the event is kept in the local log only.
            return Err(AppError::Execution("session is not active".to_string()));
        }
        let res = self.check(res, "record event").await?;
        let body: EventResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad event response: {e}")))?;
        Ok((body.id, body.duplicate))
    }

    pub async fn submission_review(&self, session_id: &str) -> AppResult<SubmissionReview> {
        let res = self
            .authed(
                reqwest::Method::GET,
                &format!("/api/sim/sessions/{}/submit", session_id),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "submission review").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad review response: {e}")))
    }

    /// POST submit (idempotent) → (submission_id, already_submitted).
    pub async fn submit(
        &self,
        session_id: &str,
        answers: &serde_json::Value,
        external_ai_disclosed: bool,
        file_snapshot: Option<&FileSnapshot>,
    ) -> AppResult<(String, bool, Option<String>)> {
        let mut body = serde_json::json!({
            "externalAiDisclosed": external_ai_disclosed,
            "answers": answers,
        });
        // W4: the full file snapshot travels in the submit body when the
        // session was materialized from a verified file package. The server
        // validates every hash, computes the receipt itself, and stores the
        // snapshot transactionally (all files or none).
        if let Some(snap) = file_snapshot {
            body["fileSnapshot"] = serde_json::to_value(snap).map_err(|e| {
                AppError::Platform(format!("could not serialize file snapshot: {e}"))
            })?;
        }
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/submit", session_id),
            )
            .await?
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "submit").await?;
        let body: SubmitResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad submit response: {e}")))?;
        Ok((
            body.submission_id,
            body.already_submitted,
            body.receipt_hash,
        ))
    }

    // -- invitation inbox ---------------------------------------------------
    // src/app/api/sim/invitations/mine/route.ts
    // Candidate-scoped, read-only listing. Listing never mints tokens and
    // never invalidates emailed links; clients accept by invitation id via
    // POST /api/sim/invitations/accept.

    /// GET /api/sim/invitations/mine → { ok, invitations }
    pub async fn list_invitations(&self) -> AppResult<Vec<InboxInvitation>> {
        let res = self
            .authed(reqwest::Method::GET, "/api/sim/invitations/mine")
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "list invitations").await?;
        let body: InboxListResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad invitations response: {e}")))?;
        Ok(body.invitations)
    }

    // -- stakeholder chat ---------------------------------------------------
    // src/app/api/sim/sessions/[id]/messages/route.ts
    // GET → { ok, messages: [{ id, thread, sender, stakeholderId, body,
    //   createdAt }] } (oldest first). POST { stakeholderId, text,
    //   clientMsgId } → { ok, candidateMessage, reply, teammateOutageDeclared }.
    // Replies are scenario-authored (optionally AI-redrafted) teammate
    // content: simulated, never a real coworker. The UI must keep the
    // "simulated" disclosure.

    /// GET stakeholder-thread messages for a session.
    pub async fn list_messages(&self, session_id: &str) -> AppResult<Vec<PlatformChatMessage>> {
        let res = self
            .authed(
                reqwest::Method::GET,
                &format!("/api/sim/sessions/{}/messages", session_id),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "list messages").await?;
        let body: MessagesListResponse = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad messages response: {e}")))?;
        Ok(body.messages)
    }

    /// POST a candidate message, then refresh from GET.
    ///
    /// The POST response carries raw DB rows (snake_case); the GET endpoint
    /// maps to the camelCase contract this client parses. Refreshing from GET
    /// keeps one parsed shape instead of two, and returns the stakeholder
    /// reply in the same round trip (the reply is inserted synchronously
    /// before POST returns).
    pub async fn send_message(
        &self,
        session_id: &str,
        stakeholder_id: &str,
        text: &str,
        client_msg_id: &str,
    ) -> AppResult<Vec<PlatformChatMessage>> {
        let res = self
            .authed(
                reqwest::Method::POST,
                &format!("/api/sim/sessions/{}/messages", session_id),
            )
            .await?
            .json(&serde_json::json!({
                "stakeholderId": stakeholder_id,
                "text": text,
                "clientMsgId": client_msg_id,
            }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        // Check status for a clean error. We parse the body ONLY for the
        // teammate-unavailable flag — the GET below remains the source of
        // truth for messages.
        let res = self.check(res, "send message").await?;
        // Try to detect teammate-unavailable from the response body.
        // If present, surface it as an error so the UI can show the state.
        // Best-effort: if parsing fails, fall through to the GET.
        if let Ok(body) = res.json::<serde_json::Value>().await {
            if body.get("teammateUnavailable").and_then(|v| v.as_bool()).unwrap_or(false) {
                let reason = body
                    .get("unavailableReason")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Teammate service unavailable");
                return Err(AppError::Platform(format!("teammate_unavailable: {reason}")));
            }
        }
        self.list_messages(session_id).await
    }

    /// Stakeholder roster from the session's candidate-safe content view.
    /// Every returned stakeholder is simulated (SIM-03 disclosure applies).
    pub async fn list_stakeholders(&self, session_id: &str) -> AppResult<Vec<StakeholderView>> {
        let full = self.fetch_session(session_id).await?;
        let mut out = Vec::new();
        if let Some(arr) = full.content.get("stakeholders").and_then(|v| v.as_array()) {
            for s in arr {
                let id = s
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if id.is_empty() {
                    continue;
                }
                out.push(StakeholderView {
                    id,
                    name: s
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Teammate")
                        .to_string(),
                    role: s
                        .get("role")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    // SIM-03: the platform marks every candidate-visible
                    // stakeholder simulated; surface that fact, don't invent it.
                    simulated: s.get("simulated").and_then(|v| v.as_bool()).unwrap_or(true),
                });
            }
        }
        Ok(out)
    }

    // -- candidate passport -------------------------------------------------
    // src/app/api/passport/* — candidate-scoped via requireUser().

    /// GET /api/passport/export → the candidate's own passport record.
    /// 404 means no passport yet (not an error for the UI: show the empty
    /// state that invites adding a first repository).
    pub async fn get_passport(&self) -> AppResult<Option<PassportView>> {
        let res = self
            .authed(reqwest::Method::GET, "/api/passport/export")
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        let res = self.check(res, "load passport").await?;
        let raw: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad passport response: {e}")))?;
        Ok(Some(PassportView::from_export(&raw)))
    }

    /// POST /api/passport/projects { repository, contribution, githubLogin }
    /// → { result, passport }. `result.status` may be "failed" (422): the
    /// analysis outcome is returned, not thrown, so the UI can explain it.
    pub async fn add_project(
        &self,
        repository: &str,
        contribution: &str,
        github_login: Option<&str>,
    ) -> AppResult<serde_json::Value> {
        let res = self
            .authed(reqwest::Method::POST, "/api/passport/projects")
            .await?
            .json(&serde_json::json!({
                "repository": repository,
                "contribution": contribution,
                "githubLogin": github_login,
            }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        // 422 is an analysis outcome (e.g. repo not found), not a transport
        // failure: surface the body's explanation to the candidate.
        if res.status() == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
            let body: serde_json::Value = res.json().await.unwrap_or(serde_json::Value::Null);
            return Ok(body);
        }
        let res = self.check(res, "add project").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad add-project response: {e}")))
    }

    /// DELETE /api/passport/projects?repo={owner/repo}
    /// → { passport, explanation }.
    pub async fn remove_project(&self, repo: &str) -> AppResult<serde_json::Value> {
        let res = self
            .authed(
                reqwest::Method::DELETE,
                &format!("/api/passport/projects?repo={}", repo),
            )
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "remove project").await?;
        res.json()
            .await
            .map_err(|e| AppError::Platform(format!("bad remove-project response: {e}")))
    }

    // -- engineer profile ---------------------------------------------------
    // src/app/api/profile/route.ts — candidate-scoped via requireUser().
    // GET → { hub: { profile: { displayName, headline, role, ... }, ... } }.
    // The route creates a fallback row, so a hub is always present; a blank
    // displayName means the candidate has not built their profile yet.

    /// The candidate's engineering profile identity fields.
    pub async fn get_profile(&self) -> AppResult<Option<EngineerProfileView>> {
        let res = self
            .authed(reqwest::Method::GET, "/api/profile")
            .await?
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        let res = self.check(res, "load profile").await?;
        let body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad profile response: {e}")))?;
        match body.get("hub").and_then(|h| h.get("profile")) {
            Some(p) => serde_json::from_value(p.clone())
                .map(Some)
                .map_err(|e| AppError::Platform(format!("bad profile shape: {e}"))),
            None => Ok(None),
        }
    }

    /// PATCH /api/profile { displayName, headline, role } → { profile }.
    /// Empty strings are rejected client-side; the server validates too.
    pub async fn update_profile(
        &self,
        display_name: &str,
        headline: &str,
        role: &str,
    ) -> AppResult<EngineerProfileView> {
        let res = self
            .authed(reqwest::Method::PATCH, "/api/profile")
            .await?
            .json(&serde_json::json!({
                "displayName": display_name,
                "headline": headline,
                "role": role,
            }))
            .send()
            .await
            .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;
        let res = self.check(res, "save profile").await?;
        let body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Platform(format!("bad profile response: {e}")))?;
        body.get("profile")
            .map(|p| {
                serde_json::from_value(p.clone())
                    .map_err(|e| AppError::Platform(format!("bad profile shape: {e}")))
            })
            .unwrap_or_else(|| {
                Err(AppError::Platform(
                    "profile save returned no profile".to_string(),
                ))
            })
    }
}

// ---------------------------------------------------------------------------
// Invitation inbox — src/app/api/sim/invitations/mine/route.ts
// ---------------------------------------------------------------------------

/// One pending invitation, candidate-scoped. The server no longer sends a
/// token with the listing (tokens were re-minted on every listing, which
/// invalidated emailed links); the desktop accepts by invitation id instead.
/// `token` stays as an Option for forward/backward compatibility with
/// pasted out-of-band tokens.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InboxInvitation {
    pub id: String,
    pub organization_name: String,
    pub simulation_title: String,
    pub role_title: String,
    pub candidate_name: Option<String>,
    pub status: String,
    pub expires_at: String,
    #[serde(default)]
    pub token: Option<String>,
}

#[derive(Debug, Deserialize)]
struct InboxListResponse {
    invitations: Vec<InboxInvitation>,
}

// ---------------------------------------------------------------------------
// Stakeholder chat — src/app/api/sim/sessions/[id]/messages/route.ts
// ---------------------------------------------------------------------------

/// A stakeholder-thread message, as the frontend renders it. Replies are
/// scenario-authored teammate content: simulated, never a real coworker.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformChatMessage {
    pub id: String,
    pub thread: String,
    pub sender: String,
    pub stakeholder_id: Option<String>,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
struct MessagesListResponse {
    #[serde(default)]
    messages: Vec<PlatformChatMessage>,
}

/// Candidate-visible stakeholder roster entry. `simulated` is always true on
/// the candidate view (SIM-03); carried so the UI can label honestly.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StakeholderView {
    pub id: String,
    pub name: String,
    pub role: String,
    pub simulated: bool,
}

// ---------------------------------------------------------------------------
// Candidate passport — src/app/api/passport/export/route.ts (GET),
// src/app/api/passport/projects/route.ts (POST/DELETE)
// ---------------------------------------------------------------------------

/// Trimmed passport view for the desktop profile screen. Built defensively
/// from the export record: unknown fields are ignored, missing fields fall
/// back to empty rather than failing the whole view.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportView {
    pub display_name: String,
    pub headline: String,
    pub github_login: Option<String>,
    pub projects: Vec<PassportProjectView>,
    pub capabilities: Vec<String>,
    pub role_suggestions: Vec<String>,
}

/// The candidate's engineering profile identity, as returned by
/// GET/PATCH /api/profile. Field names are camelCase on the wire.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineerProfileView {
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub headline: String,
    #[serde(default)]
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportProjectView {
    pub repository: String,
    pub url: Option<String>,
    pub primary_language: Option<String>,
    pub status: String,
    pub contribution_statement: Option<String>,
    pub evidence_count: usize,
}

impl PassportView {
    pub fn from_export(raw: &serde_json::Value) -> Self {
        let owner = raw.get("owner");
        let str_field = |v: Option<&serde_json::Value>, key: &str| {
            v.and_then(|o| o.get(key))
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string()
        };
        let projects = raw
            .get("projects")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|p| PassportProjectView {
                        repository: p
                            .get("repository")
                            .and_then(|x| x.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        url: p.get("url").and_then(|x| x.as_str()).map(|s| s.to_string()),
                        primary_language: p
                            .get("primaryLanguage")
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string()),
                        status: p
                            .get("status")
                            .and_then(|x| x.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        contribution_statement: p
                            .get("contributionStatement")
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string()),
                        evidence_count: p
                            .get("evidence")
                            .and_then(|x| x.as_array())
                            .map(|a| a.len())
                            .unwrap_or(0),
                    })
                    .collect()
            })
            .unwrap_or_default();
        let capabilities = raw
            .get("capabilities")
            .and_then(|v| v.get("capabilities"))
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|c| c.get("statement").and_then(|x| x.as_str()))
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default();
        let role_suggestions = raw
            .get("roleSuggestions")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|r| {
                        r.get("title")
                            .and_then(|x| x.as_str())
                            .map(|s| s.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default();
        PassportView {
            display_name: str_field(owner, "displayName"),
            headline: str_field(owner, "headline"),
            github_login: owner
                .and_then(|o| o.get("githubLogin"))
                .and_then(|x| x.as_str())
                .map(|s| s.to_string()),
            projects,
            capabilities,
            role_suggestions,
        }
    }
}

/// Merge a fresh message list into the cached one, newest state wins,
/// ordered oldest-first. Pure helper, unit-tested.
pub fn merge_chat_messages(
    cached: Vec<PlatformChatMessage>,
    fresh: Vec<PlatformChatMessage>,
) -> Vec<PlatformChatMessage> {
    use std::collections::HashMap;
    let mut by_id: HashMap<String, PlatformChatMessage> = HashMap::new();
    for m in cached {
        by_id.insert(m.id.clone(), m);
    }
    for m in fresh {
        by_id.insert(m.id.clone(), m);
    }
    let mut out: Vec<PlatformChatMessage> = by_id.into_values().collect();
    out.sort_by(|a, b| a.created_at.cmp(&b.created_at).then(a.id.cmp(&b.id)));
    out
}
