//! Local journal for handoff drafts in the standard engineering flow.
//!
//! Every change is written to `app_data/eng/<attemptId>.drafts.json`
//! (fsync, then rename) before it is sent to `PUT …/drafts`, and marked
//! accepted once Fydell confirms the revision. After a crash or while
//! offline the journal still holds what the candidate typed; the UI
//! reconciles it with the server copy on the next open.

use std::collections::BTreeMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::eng::{now_iso, state_file, valid_attempt_id, write_durable, DRAFT_FIELDS};
use crate::error::{AppError, AppResult};

const MAX_BODY_CHARS: usize = 8000;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDraft {
    pub body: String,
    /// The server revision this text was written on top of.
    pub base_revision: u64,
    pub saved_at: String,
    /// True once Fydell accepted exactly this text.
    #[serde(default)]
    pub accepted: bool,
}

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct DraftJournal {
    pub fields: BTreeMap<String, LocalDraft>,
}

/// Read-modify-write of one journal must not interleave.
fn journal_lock() -> &'static Mutex<()> {
    static LOCK: Mutex<()> = Mutex::new(());
    &LOCK
}

fn load(attempt_id: &str) -> AppResult<DraftJournal> {
    match std::fs::read_to_string(state_file(attempt_id, "drafts.json")?) {
        Ok(text) => Ok(serde_json::from_str(&text).unwrap_or_default()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(DraftJournal::default()),
        Err(e) => Err(e.into()),
    }
}

fn save(attempt_id: &str, journal: &DraftJournal) -> AppResult<()> {
    write_durable(&state_file(attempt_id, "drafts.json")?, &serde_json::to_vec_pretty(journal)?)
}

fn check_field(field: &str, body: &str) -> AppResult<()> {
    if !DRAFT_FIELDS.contains(&field) {
        return Err(AppError::Execution("unknown draft field".into()));
    }
    if body.chars().count() > MAX_BODY_CHARS {
        return Err(AppError::Execution("keep each answer under 8,000 characters".into()));
    }
    Ok(())
}

pub(crate) fn mark_accepted(attempt_id: &str, field: &str, body: &str, revision: u64) -> AppResult<()> {
    let _guard = journal_lock().lock().unwrap_or_else(|e| e.into_inner());
    let mut journal = load(attempt_id)?;
    match journal.fields.get_mut(field) {
        Some(entry) if entry.body == body => {
            entry.base_revision = revision;
            entry.accepted = true;
        }
        // Newer text was typed while this one was in flight: keep it pending,
        // now based on the revision Fydell just returned.
        Some(entry) => entry.base_revision = revision,
        None => return Ok(()),
    }
    save(attempt_id, &journal)
}

#[tauri::command]
pub fn eng_drafts_local(attempt_id: String) -> AppResult<DraftJournal> {
    let id = valid_attempt_id(&attempt_id)?;
    let _guard = journal_lock().lock().unwrap_or_else(|e| e.into_inner());
    load(&id)
}

/// Records `body` on this computer. `accepted` is true only when the text is
/// the server's own copy (the candidate chose the version saved elsewhere).
#[tauri::command]
pub fn eng_draft_store(attempt_id: String, field: String, body: String, base_revision: u64, accepted: bool) -> AppResult<LocalDraft> {
    let id = valid_attempt_id(&attempt_id)?;
    check_field(&field, &body)?;
    let _guard = journal_lock().lock().unwrap_or_else(|e| e.into_inner());
    let mut journal = load(&id)?;
    let entry = LocalDraft { body, base_revision, saved_at: now_iso(), accepted };
    journal.fields.insert(field, entry.clone());
    save(&id, &journal)?;
    Ok(entry)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn journal_reads_older_and_partial_records() {
        let j: DraftJournal = serde_json::from_str("{}").unwrap();
        assert!(j.fields.is_empty());
        let j: DraftJournal =
            serde_json::from_str(r#"{"fields":{"testing":{"body":"ran it","baseRevision":3,"savedAt":"t"}}}"#).unwrap();
        assert_eq!(j.fields["testing"].base_revision, 3);
        assert!(!j.fields["testing"].accepted);
    }

    #[test]
    fn rejects_unknown_fields_and_oversized_bodies() {
        assert!(check_field("testing", "ok").is_ok());
        assert!(check_field("../etc", "ok").is_err());
        assert!(check_field("testing", &"x".repeat(MAX_BODY_CHARS + 1)).is_err());
    }
}
