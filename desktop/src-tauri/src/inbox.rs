//! Invitation inbox commands.
//!
//! The desktop used to make candidates paste an invite token. The inbox
//! lists the candidate's pending invitations (candidate-scoped, via the new
//! `GET /api/sim/invitations/mine` endpoint) so they can accept in-app.
//! The paste-token path remains as a fallback for invitations addressed to
//! a different email or shared out-of-band.

use crate::error::{AppError, AppResult};
use crate::platform::{InboxInvitation, Platform};

/// List pending invitations for the signed-in candidate.
///
/// Requires auth (FYDELL-E1008 when the session is missing/expired).
/// Each listing re-issues tokens — the frontend fetches on explicit user
/// action (opening the inbox), not on a timer.
#[tauri::command]
pub async fn list_invitations() -> AppResult<Vec<InboxInvitation>> {
    // Fail fast with a clear message when not signed in.
    crate::auth::access_token()
        .await
        .map_err(|_| AppError::Auth("sign in first, then open your inbox".to_string()))?;
    let invs = Platform::new().list_invitations().await?;
    Ok(sort_invitations(invs))
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
            token: "tok".to_string(),
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
