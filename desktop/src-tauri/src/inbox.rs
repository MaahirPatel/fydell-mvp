//! Invitation inbox commands.
//!
//! The desktop used to make candidates paste an invite token. The inbox
//! lists the candidate's pending invitations (candidate-scoped, via the new
//! `GET /api/sim/invitations/mine` endpoint) so they can accept in-app.
//! The paste-token path remains as a fallback for invitations addressed to
//! a different email or shared out-of-band.

use crate::error::{AppError, AppResult};
use crate::platform::{InboxInvitation, Platform};
use crate::session::{content_str, session, SessionInfo};

/// List pending invitations for the signed-in candidate.
///
/// Requires auth (FYDELL-E1008 when the session is missing/expired).
/// The listing is read-only: it never invalidates emailed invitation links.
/// Accepting an inbox invitation goes through `accept_invitation_by_id`.
#[tauri::command]
pub async fn list_invitations() -> AppResult<Vec<InboxInvitation>> {
    // Fail fast with a clear message when not signed in.
    crate::auth::require_signed_in("sign in first, then open your inbox").await?;
    let invs = Platform::new().list_invitations().await?;
    Ok(sort_invitations(invs))
}

/// Accept an inbox invitation by id (auth required), then adopt the platform
/// session locally — mirroring `join_session`'s post-accept steps.
///
/// Requires auth (FYDELL-E1008 when the session is missing/expired), same
/// fail-fast as `list_invitations`. Idempotent: re-accepting returns the
/// existing session. `organization_name` / `simulation_title` come from the
/// inbox listing the candidate just saw (display metadata only — durations,
/// consent state, and revision are authoritative from `fetch_session`).
#[tauri::command]
pub async fn accept_invitation_by_id(
    invitation_id: String,
    organization_name: String,
    simulation_title: String,
) -> AppResult<SessionInfo> {
    // 0. Already-in-progress guard (mirror join_session).
    {
        let s = session().lock().unwrap();
        if !s.is_idle() {
            return Err(AppError::Execution(
                "a session is already in progress; restart the app to join another".into(),
            ));
        }
    }
    // Fail fast with a clear message when not signed in.
    crate::auth::require_signed_in("sign in first, then accept an invitation").await?;

    let platform = Platform::new();

    // 1. Accept → platform session id (auth required, email ownership enforced server-side).
    let session_id = platform
        .accept_invitation_by_id(invitation_id.trim())
        .await?;

    // 2. Fetch the full candidate payload.
    let full = platform.fetch_session(&session_id).await?;
    if !full.gate.desktop_required {
        return Err(AppError::Execution(
            "this assignment is not configured for the desktop app".into(),
        ));
    }

    let title = content_str(&full.content, "title").unwrap_or_else(|| simulation_title.clone());

    {
        let mut s = session().lock().unwrap();
        s.adopt_platform_session(session_id, title, organization_name, &full);
    }

    crate::events::log_system_event(
        "session_joined",
        serde_json::json!({ "title": simulation_title }),
    )?;

    // Durable record for interrupted-work recovery (DESK-10).
    crate::recovery::persist();

    Ok(session().lock().unwrap().info())
}

/// Sort invitations for display: soonest expiry first; invitations without a
/// parseable expiry sort last. Pure helper, unit-tested.
pub fn sort_invitations(mut invs: Vec<InboxInvitation>) -> Vec<InboxInvitation> {
    invs.sort_by(|a, b| a.expires_at.cmp(&b.expires_at));
    invs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inv(id: &str, expires_at: &str) -> InboxInvitation {
        InboxInvitation {
            id: id.to_string(),
            organization_name: "Acme".to_string(),
            simulation_title: "Sim".to_string(),
            role_title: "Engineer".to_string(),
            candidate_name: None,
            status: "sent".to_string(),
            expires_at: expires_at.to_string(),
            token: None,
        }
    }

    #[test]
    fn sorts_by_expiry_soonest_first() {
        let sorted = sort_invitations(vec![
            inv("c", "2026-10-03T00:00:00Z"),
            inv("a", "2026-10-01T00:00:00Z"),
            inv("b", "2026-10-02T00:00:00Z"),
        ]);
        let ids: Vec<&str> = sorted.iter().map(|i| i.id.as_str()).collect();
        assert_eq!(ids, vec!["a", "b", "c"]);
    }

    #[test]
    fn empty_inbox_sorts_to_empty() {
        assert!(sort_invitations(vec![]).is_empty());
    }
}
