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
//! Base URL: `FYDELL_PLATFORM_URL` (default http://localhost:3000).

use crate::auth;
use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

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
// Client
// ---------------------------------------------------------------------------

pub struct Platform {
    base: String,
    http: reqwest::Client,
}

impl Platform {
    pub fn new() -> Self {
        let base = std::env::var("FYDELL_PLATFORM_URL")
            .unwrap_or_else(|_| "http://localhost:3000".to_string())
            .trim_end_matches('/')
            .to_string();
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .user_agent("fydell-desktop/0.1.0")
            .build()
            .expect("reqwest client builds");
        Platform { base, http }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base, path)
    }

    /// Authenticated request builder: Supabase session cookie (works with the
    /// deployed web app today) + Bearer header (forward-compatible, needs W2).
    async fn authed(
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

    async fn check(&self, res: reqwest::Response, what: &str) -> AppResult<reqwest::Response> {
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
                "userAgent": "fydell-desktop/0.1.0",
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
}
