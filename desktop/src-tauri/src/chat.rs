//! Stakeholder chat commands.
//!
//! Wires the desktop team thread to the real platform messages API
//! (`GET`/`POST /api/sim/sessions/[id]/messages`). Stakeholder replies are
//! scenario-authored teammate content: simulated, never a real coworker —
//! the UI keeps the SIM-03 "simulated" disclosure in both connected and
//! fallback modes.

use crate::error::{AppError, AppResult};
use crate::platform::{Platform, PlatformChatMessage, StakeholderView};

/// List stakeholder-thread messages for the active session (oldest first).
#[tauri::command]
pub async fn list_messages() -> AppResult<Vec<PlatformChatMessage>> {
    let session_id = crate::session::platform_session_id()?;
    Platform::new().list_messages(&session_id).await
}

/// Candidate-visible stakeholder roster for the active session.
/// Used to address a message; every entry is simulated (SIM-03).
#[tauri::command]
pub async fn list_stakeholders() -> AppResult<Vec<StakeholderView>> {
    let session_id = crate::session::platform_session_id()?;
    Platform::new().list_stakeholders(&session_id).await
}

/// Send a candidate message to a stakeholder. Returns the refreshed thread
/// (oldest first), including the scenario's stakeholder reply. `client_msg_id`
/// deduplicates retries server-side (the route honors it); the id is a random
/// hex string minted per send.
#[tauri::command]
pub async fn send_message(
    stakeholder_id: String,
    text: String,
) -> AppResult<Vec<PlatformChatMessage>> {
    let session_id = crate::session::platform_session_id()?;
    let stakeholder_id = stakeholder_id.trim();
    if stakeholder_id.is_empty() {
        return Err(AppError::Execution(
            "choose who to message first".to_string(),
        ));
    }
    let text = text.trim();
    if text.is_empty() {
        return Err(AppError::Execution("message cannot be empty".to_string()));
    }
    if text.len() > 2000 {
        return Err(AppError::Execution(
            "message too long (max 2000 characters)".to_string(),
        ));
    }
    let client_msg_id = format!("{:016x}{:016x}", rand_u64(), rand_u64());
    Platform::new()
        .send_message(&session_id, stakeholder_id, text, &client_msg_id)
        .await
}

/// Random 64-bit hex component for client message ids. Not cryptographic —
/// uniqueness only; the server treats it as an opaque dedup key.
fn rand_u64() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    // SplitMix64-style scramble of time + address entropy.
    let mut z = nanos.wrapping_add(0x9E3779B97F4A7C15);
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
    z ^ (z >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::platform::merge_chat_messages;

    fn msg(id: &str, created_at: &str, body: &str) -> PlatformChatMessage {
        PlatformChatMessage {
            id: id.to_string(),
            thread: "stakeholder".to_string(),
            sender: "stakeholder".to_string(),
            stakeholder_id: Some("ana".to_string()),
            body: body.to_string(),
            created_at: created_at.to_string(),
        }
    }

    #[test]
    fn merge_dedupes_by_id_and_sorts_oldest_first() {
        let cached = vec![
            msg("m1", "2026-09-28T10:00:00Z", "hello"),
            msg("m2", "2026-09-28T10:01:00Z", "old body"),
        ];
        let fresh = vec![
            msg("m2", "2026-09-28T10:01:00Z", "new body"),
            msg("m3", "2026-09-28T10:02:00Z", "later"),
        ];
        let merged = merge_chat_messages(cached, fresh);
        assert_eq!(merged.len(), 3);
        assert_eq!(merged[0].id, "m1");
        assert_eq!(merged[1].id, "m2");
        // Newest state wins on conflict.
        assert_eq!(merged[1].body, "new body");
        assert_eq!(merged[2].id, "m3");
    }

    #[test]
    fn merge_empty_inputs() {
        assert!(merge_chat_messages(vec![], vec![]).is_empty());
        let m = msg("m1", "2026-09-28T10:00:00Z", "x");
        let merged = merge_chat_messages(vec![], vec![m.clone()]);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].id, "m1");
    }

    #[test]
    fn rand_ids_look_unique() {
        let a = rand_u64();
        let b = rand_u64();
        assert_ne!(a, b);
    }
}
