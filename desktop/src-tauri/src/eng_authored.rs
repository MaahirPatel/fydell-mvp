//! Employer-authored work samples (`/api/eng/attempts/{id}/authored/*` on the
//! platform, server logic in `src/lib/eng/authored/runtime.ts`).
//!
//! Same principles as `eng.rs`: tokens stay in Rust, the desktop never runs
//! candidate code, and the renderer never chooses a path. The starter arrives
//! as text files in the candidate view; it is written once into the task's
//! project folder, the candidate works there in their own editor, and the
//! app reads the folder back (with the packaging exclusions of
//! `eng_package::plan_package`) only when the candidate runs the public tests
//! or submits.

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::eng::{
    get_json, load_local, local_project_dir, now_iso, planned_project_dir, post_json, require_local,
    save_local, starter_map, state_file, valid_attempt_id, EngLocalState,
};
use crate::eng_package::{self, StarterFile, MAX_FILE_BYTES};
use crate::error::{AppError, AppResult};
use crate::platform::Platform;

/// Folder name under the task folder. Authored starters have no root folder
/// of their own.
const PROJECT_ROOT: &str = "project";
const MAX_STARTER_FILES: usize = 500;

fn field<'a>(v: &'a Value, key: &str, what: &str) -> AppResult<&'a Value> {
    v.get(key)
        .ok_or_else(|| AppError::Platform(format!("{what}: unexpected response (no {key})")))
}

#[tauri::command]
pub async fn eng_authored_view(attempt_id: String) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: Value = get_json(&format!("/api/eng/attempts/{id}/authored"), "load work sample").await?;
    Ok(field(&env, "view", "load work sample")?.clone())
}

/// Setup steps on `POST /authored`: accept the terms, confirm the
/// environment check, start the timer.
#[tauri::command]
pub async fn eng_authored_action(
    attempt_id: String,
    action: String,
    continue_without_check: Option<bool>,
) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    if !matches!(action.as_str(), "consent" | "environment_ready" | "start") {
        return Err(AppError::Execution("unknown setup step".into()));
    }
    let env: Value = post_json(
        &format!("/api/eng/attempts/{id}/authored"),
        serde_json::json!({ "action": action, "continueWithoutCheck": continue_without_check.unwrap_or(false) }),
        "update work sample",
        30,
    )
    .await?;
    Ok(field(&env, "view", "update work sample")?.clone())
}

/// Validated starter entries from the candidate view: safe relative paths,
/// no duplicates (case-insensitive), bounded size.
pub(crate) fn starter_entries(view: &Value) -> AppResult<Vec<(String, String)>> {
    let files = view
        .pointer("/task/starterFiles")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Platform("load work sample: the starter files are missing".into()))?;
    file_entries(files)
}

/// The same checks for any `[{ path, content }]` list the platform returns,
/// such as the saved workspace.
fn file_entries(files: &[Value]) -> AppResult<Vec<(String, String)>> {
    if files.is_empty() || files.len() > MAX_STARTER_FILES {
        return Err(AppError::Integrity("the starter has an unexpected number of files".into()));
    }
    let mut seen = BTreeSet::new();
    let mut out = Vec::with_capacity(files.len());
    for f in files {
        let (Some(path), Some(content)) = (f.get("path").and_then(Value::as_str), f.get("content").and_then(Value::as_str)) else {
            return Err(AppError::Integrity("a starter file is malformed".into()));
        };
        if eng_package::validate_entry_name(path).is_none() {
            return Err(AppError::Integrity("the starter contains an unsafe path".into()));
        }
        if !seen.insert(path.to_ascii_lowercase()) {
            return Err(AppError::Integrity("the starter contains a duplicate file name".into()));
        }
        if content.len() as u64 > MAX_FILE_BYTES {
            return Err(AppError::Integrity("a starter file is larger than expected".into()));
        }
        out.push((path.to_string(), content.to_string()));
    }
    Ok(out)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthoredLocal {
    pub local: Option<EngLocalState>,
    pub planned_project_dir: String,
}

/// The local record, if the project folder was created, and where it goes. Reads only.
#[tauri::command]
pub fn eng_authored_local(attempt_id: String) -> AppResult<AuthoredLocal> {
    let id = valid_attempt_id(&attempt_id)?;
    let local = match load_local(&id)? {
        Some(state) if local_project_dir(&state)?.is_dir() => Some(state),
        _ => None,
    };
    Ok(AuthoredLocal {
        local,
        planned_project_dir: planned_project_dir(&id, PROJECT_ROOT)?.to_string_lossy().into_owned(),
    })
}

/// Writes the starter into the task's project folder once. Idempotent: an
/// existing folder is returned as-is and never overwritten. Writes go to a
/// staging folder renamed into place only when complete.
#[tauri::command]
pub async fn eng_authored_prepare(attempt_id: String) -> AppResult<EngLocalState> {
    let id = valid_attempt_id(&attempt_id)?;
    if let Some(existing) = load_local(&id)? {
        if local_project_dir(&existing)?.is_dir() {
            return Ok(existing);
        }
    }
    let view = eng_authored_view(id.clone()).await?;
    if view.pointer("/attempt/consentedAt").map_or(true, Value::is_null) {
        return Err(AppError::Execution("accept the task terms before preparing the project".into()));
    }
    let starter = starter_entries(&view)?;
    // Work already saved on the website (same attempt, started there) is the
    // copy to continue from; the starter is only the baseline for "changed".
    let saved = view
        .pointer("/workspace/files")
        .and_then(Value::as_array)
        .filter(|f| !f.is_empty())
        .map(|f| file_entries(f))
        .transpose()?;
    let saved_revision = view.pointer("/workspace/revision").and_then(Value::as_u64);
    let entries = saved.as_ref().unwrap_or(&starter);
    let project = planned_project_dir(&id, PROJECT_ROOT)?;
    let parent = project.parent().map(std::path::Path::to_path_buf).ok_or(AppError::PathEscape)?;
    if project.exists() && std::fs::read_dir(&project).map(|mut it| it.next().is_some()).unwrap_or(true) {
        return Err(AppError::Io("a project folder for this task already exists; it was left untouched".into()));
    }
    std::fs::create_dir_all(&parent)?;
    let staging = parent.join(format!(".{PROJECT_ROOT}.partial"));
    if staging.exists() {
        std::fs::remove_dir_all(&staging)?;
    }
    let written = (|| -> AppResult<()> {
        for (path, content) in entries {
            let target = staging.join(path);
            if let Some(dir) = target.parent() {
                std::fs::create_dir_all(dir)?;
            }
            std::fs::write(&target, content.as_bytes())?;
        }
        Ok(())
    })();
    if let Err(e) = written {
        let _ = std::fs::remove_dir_all(&staging);
        return Err(e);
    }
    let mut files: Vec<StarterFile> = starter
        .iter()
        .map(|(path, content)| StarterFile {
            path: path.clone(),
            sha256: eng_package::sha256_hex(content.as_bytes()),
            bytes: content.len() as u64,
        })
        .collect();
    if project.exists() {
        std::fs::remove_dir(&project)?;
    }
    std::fs::rename(&staging, &project)?;
    files.sort_by(|a, b| a.path.cmp(&b.path));
    let fingerprint = eng_package::sha256_hex(
        files.iter().map(|f| format!("{}:{}\n", f.path, f.sha256)).collect::<String>().as_bytes(),
    );
    let state = EngLocalState {
        attempt_id: id,
        project_dir: project.to_string_lossy().into_owned(),
        starter_root: PROJECT_ROOT.into(),
        starter_sha256: fingerprint,
        materialized_at: now_iso(),
        starter_files: files,
        last_package: None,
        receipt: None,
    };
    save_local(&state)?;
    if let (Some(saved), Some(revision)) = (&saved, saved_revision) {
        let mut outbox = load_outbox(&state.attempt_id)?;
        outbox.accepted = Some(AcceptedFiles {
            revision,
            files_sha256: None,
            local_fingerprint: entries_fingerprint(saved),
            accepted_at: now_iso(),
        });
        outbox.conflict = None;
        save_outbox(&state.attempt_id, &outbox)?;
    }
    Ok(state)
}

/* ------------------------------------------------------------------ */
/* Outbox: work saved on this computer but not yet accepted by Fydell  */
/* ------------------------------------------------------------------ */

/// What the platform last accepted into the attempt's workspace, the copy
/// the website editor and the employer's review read.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptedFiles {
    pub revision: u64,
    /// The platform's hash of the accepted files, when it returned one.
    pub files_sha256: Option<String>,
    /// This app's fingerprint of the same files (path + SHA-256 per file).
    pub local_fingerprint: String,
    pub accepted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesConflict {
    pub server_revision: u64,
    pub detected_at: String,
}

/// Durable per-attempt record (`app_data/eng/<id>.outbox.json`, written
/// atomically). The project folder is the local copy of the files; this
/// records what the platform last accepted, so any other content on disk is
/// pending and is sent again after a crash, restart or reconnect. The
/// handoff answers live only here until submit.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthoredOutbox {
    #[serde(default)]
    pub handoff: BTreeMap<String, String>,
    #[serde(default)]
    pub ai_use: String,
    #[serde(default)]
    pub handoff_saved_at: Option<String>,
    #[serde(default)]
    pub accepted: Option<AcceptedFiles>,
    #[serde(default)]
    pub conflict: Option<FilesConflict>,
}

/// `state`: `accepted` (the platform has exactly the files on disk),
/// `pending` (saved on this computer, not yet accepted), `conflict` (the
/// website copy changed independently; nothing is overwritten until the
/// candidate chooses) or `blocked` (the folder cannot be sent as it is).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FilesSyncStatus {
    pub state: &'static str,
    pub accepted: Option<AcceptedFiles>,
    pub server_revision: Option<u64>,
    pub detail: Option<String>,
    pub backup_dir: Option<String>,
}

fn load_outbox(attempt_id: &str) -> AppResult<AuthoredOutbox> {
    let path = state_file(attempt_id, "outbox.json")?;
    match std::fs::read_to_string(&path) {
        Ok(text) => Ok(serde_json::from_str(&text).unwrap_or_default()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(AuthoredOutbox::default()),
        Err(e) => Err(e.into()),
    }
}

fn save_outbox(attempt_id: &str, outbox: &AuthoredOutbox) -> AppResult<()> {
    use std::io::Write;
    let path = state_file(attempt_id, "outbox.json")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    let mut f = std::fs::File::create(&tmp)?;
    f.write_all(&serde_json::to_vec_pretty(outbox)?)?;
    f.sync_all()?;
    drop(f);
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

fn entries_fingerprint(entries: &[(String, String)]) -> String {
    let mut rows: Vec<String> = entries
        .iter()
        .map(|(p, c)| format!("{}:{}\n", p, eng_package::sha256_hex(c.as_bytes())))
        .collect();
    rows.sort();
    eng_package::sha256_hex(rows.concat().as_bytes())
}

fn json_entries(files: &[Value]) -> Vec<(String, String)> {
    files
        .iter()
        .filter_map(|f| Some((f.get("path")?.as_str()?.to_string(), f.get("content")?.as_str()?.to_string())))
        .collect()
}

/// The website copy's revision and fingerprint, in this app's fingerprint format.
async fn server_copy(attempt_id: &str) -> AppResult<(u64, String)> {
    let view = eng_authored_view(attempt_id.to_string()).await?;
    let revision = view.pointer("/workspace/revision").and_then(Value::as_u64);
    let files = view.pointer("/workspace/files").and_then(Value::as_array);
    match (revision, files) {
        (Some(r), Some(f)) => Ok((r, entries_fingerprint(&json_entries(f)))),
        _ => Err(AppError::Platform("save files: the website copy is not available while the task is closed".into())),
    }
}

fn status(state: &'static str, outbox: &AuthoredOutbox, detail: Option<String>) -> FilesSyncStatus {
    FilesSyncStatus {
        state,
        accepted: outbox.accepted.clone(),
        server_revision: outbox.conflict.as_ref().map(|c| c.server_revision),
        detail,
        backup_dir: None,
    }
}

const NOT_SENT: &str = "Saved on this computer. Fydell has not accepted it yet; the app sends it again automatically.";

enum Put {
    Accepted { revision: u64, files_sha256: Option<String> },
    Conflict { revision: u64, files: Vec<(String, String)> },
    Refused(String),
    NotSent(String),
}

async fn put_files(attempt_id: &str, files: &[Value], base_revision: u64) -> AppResult<Put> {
    let p = Platform::new();
    let what = "save files";
    let sent = p
        .authed(reqwest::Method::PUT, &format!("/api/eng/attempts/{attempt_id}/authored/files"))
        .await?
        .json(&serde_json::json!({ "files": files, "baseRevision": base_revision }))
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await;
    let res = match sent {
        Ok(r) => r,
        Err(e) => return Ok(Put::NotSent(crate::eng::reach(e).to_string())),
    };
    let code = res.status();
    if code == reqwest::StatusCode::CONFLICT || code == reqwest::StatusCode::UNPROCESSABLE_ENTITY {
        let body: Value = res.json().await.unwrap_or(Value::Null);
        if let (Some(rev), Some(current)) = (
            body.pointer("/current/revision").and_then(Value::as_u64),
            body.pointer("/current/files").and_then(Value::as_array),
        ) {
            return Ok(Put::Conflict { revision: rev, files: json_entries(current) });
        }
        let msg = body.get("error").and_then(Value::as_str).unwrap_or("Fydell did not accept the files.");
        return Ok(Put::Refused(msg.to_string()));
    }
    match p.check(res, what).await {
        Ok(ok) => {
            let body: Value = ok.json().await.unwrap_or(Value::Null);
            let revision = body.get("revision").and_then(Value::as_u64).ok_or_else(|| {
                AppError::Platform(format!("{what}: unexpected response (no revision)"))
            })?;
            let files_sha256 = body.get("filesSha256").and_then(Value::as_str).map(str::to_string);
            Ok(Put::Accepted { revision, files_sha256 })
        }
        Err(AppError::Auth(m)) => Err(AppError::Auth(m)),
        Err(e) => Ok(Put::NotSent(e.to_string())),
    }
}

/// Local state only, no network: is the folder exactly what Fydell accepted?
#[tauri::command]
pub fn eng_authored_files_status(attempt_id: String) -> AppResult<FilesSyncStatus> {
    let id = valid_attempt_id(&attempt_id)?;
    let outbox = load_outbox(&id)?;
    if outbox.conflict.is_some() {
        return Ok(status("conflict", &outbox, None));
    }
    let files = match collect_files(&id) {
        Ok(f) => f,
        Err(e) => return Ok(status("blocked", &outbox, Some(e.to_string()))),
    };
    let fp = entries_fingerprint(&json_entries(&files));
    let synced = outbox.accepted.as_ref().is_some_and(|a| a.local_fingerprint == fp);
    Ok(status(if synced { "accepted" } else { "pending" }, &outbox, None))
}

/// Delivers the project folder to the attempt's workspace on Fydell (the
/// copy the website editor and the employer read). Idempotent: unchanged
/// files send nothing, and a repeat of a delivery whose reply was lost is
/// recognised by content. A website copy that changed independently is a
/// sticky conflict; neither side is overwritten without a choice.
#[tauri::command]
pub async fn eng_authored_sync_files(attempt_id: String) -> AppResult<FilesSyncStatus> {
    let id = valid_attempt_id(&attempt_id)?;
    let mut outbox = load_outbox(&id)?;
    if outbox.conflict.is_some() {
        return Ok(status("conflict", &outbox, None));
    }
    let files = match collect_files(&id) {
        Ok(f) => f,
        Err(e) => return Ok(status("blocked", &outbox, Some(e.to_string()))),
    };
    let fp = entries_fingerprint(&json_entries(&files));
    if outbox.accepted.as_ref().is_some_and(|a| a.local_fingerprint == fp) {
        return Ok(status("accepted", &outbox, None));
    }
    let starter_fp = {
        let state = require_local(&id)?;
        let mut rows: Vec<String> = state.starter_files.iter().map(|f| format!("{}:{}\n", f.path, f.sha256)).collect();
        rows.sort();
        eng_package::sha256_hex(rows.concat().as_bytes())
    };
    let base = match outbox.accepted.as_ref() {
        Some(a) => a.revision,
        // No acknowledgement on record (first sync, or the reply to an earlier
        // delivery was lost): look at the website copy before writing over it.
        None => match server_copy(&id).await {
            Ok((revision, server_fp)) if server_fp == fp => {
                outbox.accepted = Some(AcceptedFiles { revision, files_sha256: None, local_fingerprint: fp, accepted_at: now_iso() });
                save_outbox(&id, &outbox)?;
                return Ok(status("accepted", &outbox, None));
            }
            Ok((revision, server_fp)) if server_fp == starter_fp => revision,
            Ok((revision, _)) => {
                outbox.conflict = Some(FilesConflict { server_revision: revision, detected_at: now_iso() });
                save_outbox(&id, &outbox)?;
                return Ok(status("conflict", &outbox, None));
            }
            Err(AppError::Auth(m)) => return Err(AppError::Auth(m)),
            Err(e) => return Ok(status("pending", &outbox, Some(format!("{NOT_SENT} ({e})")))),
        },
    };
    let mut attempt_base = base;
    for _ in 0..2 {
        match put_files(&id, &files, attempt_base).await? {
            Put::Accepted { revision, files_sha256 } => {
                outbox.accepted = Some(AcceptedFiles { revision, files_sha256, local_fingerprint: fp, accepted_at: now_iso() });
                save_outbox(&id, &outbox)?;
                return Ok(status("accepted", &outbox, None));
            }
            Put::Conflict { revision, files: current } => {
                let server_fp = entries_fingerprint(&current);
                if server_fp == fp {
                    // Already there: an earlier delivery landed but its reply was lost.
                    outbox.accepted = Some(AcceptedFiles { revision, files_sha256: None, local_fingerprint: fp, accepted_at: now_iso() });
                    save_outbox(&id, &outbox)?;
                    return Ok(status("accepted", &outbox, None));
                }
                // Our base was only stale: the website copy is what we last
                // accepted, or still the untouched starter.
                let known = outbox.accepted.as_ref().map(|a| a.local_fingerprint.as_str()) == Some(server_fp.as_str())
                    || (outbox.accepted.is_none() && server_fp == starter_fp);
                if known && attempt_base != revision {
                    attempt_base = revision;
                    continue;
                }
                outbox.conflict = Some(FilesConflict { server_revision: revision, detected_at: now_iso() });
                save_outbox(&id, &outbox)?;
                return Ok(status("conflict", &outbox, None));
            }
            Put::Refused(msg) => return Ok(status("blocked", &outbox, Some(msg))),
            Put::NotSent(reason) => return Ok(status("pending", &outbox, Some(format!("{NOT_SENT} ({reason})")))),
        }
    }
    Ok(status("pending", &outbox, Some(NOT_SENT.to_string())))
}

/// Ends a conflict by an explicit choice. `keep_local` replaces the website
/// copy with this computer's folder. `use_website` moves the folder aside
/// (nothing is deleted) and writes the website copy in its place.
#[tauri::command]
pub async fn eng_authored_resolve_files(attempt_id: String, choice: String) -> AppResult<FilesSyncStatus> {
    let id = valid_attempt_id(&attempt_id)?;
    let mut outbox = load_outbox(&id)?;
    let Some(conflict) = outbox.conflict.clone() else {
        return eng_authored_sync_files(id).await;
    };
    match choice.as_str() {
        "keep_local" => {
            outbox.conflict = None;
            // Fence the next write at the website's revision; the empty
            // fingerprint guarantees this folder is sent.
            outbox.accepted = Some(AcceptedFiles {
                revision: conflict.server_revision,
                files_sha256: None,
                local_fingerprint: String::new(),
                accepted_at: now_iso(),
            });
            save_outbox(&id, &outbox)?;
            eng_authored_sync_files(id).await
        }
        "use_website" => {
            let view = eng_authored_view(id.clone()).await?;
            let current = view
                .pointer("/workspace/files")
                .and_then(Value::as_array)
                .ok_or_else(|| AppError::Platform("load work sample: the website copy is not available".into()))?;
            let entries = file_entries(current)?;
            let revision = view.pointer("/workspace/revision").and_then(Value::as_u64).unwrap_or(conflict.server_revision);
            let state = require_local(&id)?;
            let project = local_project_dir(&state)?;
            let parent = project.parent().map(std::path::Path::to_path_buf).ok_or(AppError::PathEscape)?;
            let backup = parent.join(format!("{PROJECT_ROOT}-before-website-copy-{}", chrono::Utc::now().format("%Y%m%d-%H%M%S")));
            let staging = parent.join(format!(".{PROJECT_ROOT}.website"));
            if staging.exists() {
                std::fs::remove_dir_all(&staging)?;
            }
            for (path, content) in &entries {
                let target = staging.join(path);
                if let Some(dir) = target.parent() {
                    std::fs::create_dir_all(dir)?;
                }
                std::fs::write(&target, content.as_bytes())?;
            }
            std::fs::rename(&project, &backup)?;
            std::fs::rename(&staging, &project)?;
            outbox.conflict = None;
            outbox.accepted = Some(AcceptedFiles {
                revision,
                files_sha256: view.pointer("/workspace/filesSha256").and_then(Value::as_str).map(str::to_string),
                local_fingerprint: entries_fingerprint(&entries),
                accepted_at: now_iso(),
            });
            save_outbox(&id, &outbox)?;
            let mut s = status("accepted", &outbox, None);
            s.backup_dir = Some(backup.to_string_lossy().into_owned());
            Ok(s)
        }
        _ => Err(AppError::Execution("unknown choice".into())),
    }
}

/// The locally saved handoff answers, restored after a restart.
#[tauri::command]
pub fn eng_authored_outbox(attempt_id: String) -> AppResult<AuthoredOutbox> {
    let id = valid_attempt_id(&attempt_id)?;
    load_outbox(&id)
}

/// Saves the handoff answers on this computer (atomic, flushed to disk).
#[tauri::command]
pub fn eng_authored_save_handoff(attempt_id: String, handoff: BTreeMap<String, String>, ai_use: String) -> AppResult<String> {
    let id = valid_attempt_id(&attempt_id)?;
    if handoff.len() > 50 || handoff.values().any(|v| v.chars().count() > 8000) || ai_use.chars().count() > 4000 {
        return Err(AppError::Execution("the handoff answers are longer than the task allows".into()));
    }
    let mut outbox = load_outbox(&id)?;
    outbox.handoff = handoff;
    outbox.ai_use = ai_use;
    let at = now_iso();
    outbox.handoff_saved_at = Some(at.clone());
    save_outbox(&id, &outbox)?;
    Ok(at)
}

/// The project folder as `{ path, content }` text files, exactly the set the
/// package preview lists as included. Refuses while the preview reports a
/// problem or a file is not UTF-8 text.
fn collect_files(attempt_id: &str) -> AppResult<Vec<Value>> {
    let state = require_local(attempt_id)?;
    let project = local_project_dir(&state)?;
    let plan = eng_package::plan_package(&project, &state.starter_root, &starter_map(&state))?;
    if !plan.problems.is_empty() {
        return Err(AppError::Execution(plan.problems.join(" ")));
    }
    let mut out = Vec::with_capacity(plan.included.len());
    for entry in &plan.included {
        let bytes = std::fs::read(project.join(&entry.path))?;
        let content = String::from_utf8(bytes).map_err(|_| {
            AppError::Execution(format!(
                "{} is not a text file. Work samples accept text files only; remove it or move it out of the project folder.",
                entry.path
            ))
        })?;
        out.push(serde_json::json!({ "path": entry.path, "content": content }));
    }
    Ok(out)
}

/// Runs the public tests on the platform's test runner. The environment
/// check sends no files (the server uses the published starter); a workspace
/// run sends the project folder as it is now.
#[tauri::command]
pub async fn eng_authored_run_tests(attempt_id: String, purpose: String) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let body = match purpose.as_str() {
        "environment_check" => serde_json::json!({ "purpose": "environment_check" }),
        "workspace" => serde_json::json!({ "purpose": "workspace", "files": collect_files(&id)? }),
        _ => return Err(AppError::Execution("unknown test run".into())),
    };
    let env: Value = post_json(&format!("/api/eng/attempts/{id}/authored/public-tests"), body, "run public tests", 150).await?;
    Ok(field(&env, "run", "run public tests")?.clone())
}

#[tauri::command]
pub async fn eng_authored_team(attempt_id: String, teammate_id: String, body: String, client_msg_id: String) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let text = body.trim();
    if text.is_empty() || text.chars().count() > 4000 {
        return Err(AppError::Execution("write a message of up to 4,000 characters".into()));
    }
    let env: Value = post_json(
        &format!("/api/eng/attempts/{id}/authored/team"),
        serde_json::json!({ "teammateId": teammate_id, "body": text, "clientMsgId": client_msg_id }),
        "send message",
        120,
    )
    .await?;
    Ok(field(&env, "collaboration", "send message")?.clone())
}

#[tauri::command]
pub async fn eng_authored_collaboration(attempt_id: String) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: Value = get_json(&format!("/api/eng/attempts/{id}/authored/collaboration"), "load team thread").await?;
    Ok(field(&env, "collaboration", "load team thread")?.clone())
}

/// Submits the project folder with the handoff answers. One submission per
/// attempt; a repeat returns the original receipt.
#[tauri::command]
pub async fn eng_authored_submit(
    attempt_id: String,
    handoff: std::collections::BTreeMap<String, String>,
    ai_use: String,
) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let files = collect_files(&id)?;
    let env: Value = post_json(
        &format!("/api/eng/attempts/{id}/authored/submit"),
        serde_json::json!({ "files": files, "handoff": handoff, "ai_use": ai_use }),
        "submit",
        300,
    )
    .await?;
    Ok(field(&env, "receipt", "submit")?.clone())
}

#[tauri::command]
pub async fn eng_authored_report(attempt_id: String) -> AppResult<Value> {
    let id = valid_attempt_id(&attempt_id)?;
    let env: Value = get_json(&format!("/api/eng/attempts/{id}/authored/report"), "load report").await?;
    Ok(env.get("report").cloned().unwrap_or(Value::Null))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starter_entries_refuse_unsafe_paths() {
        let ok = serde_json::json!({ "task": { "starterFiles": [{ "path": "app/main.py", "content": "x" }] } });
        assert_eq!(starter_entries(&ok).unwrap().len(), 1);
        for bad in ["../evil.py", "/abs.py", "a\\b.py", "C:/x.py", "a//b.py"] {
            let v = serde_json::json!({ "task": { "starterFiles": [{ "path": bad, "content": "x" }] } });
            assert!(starter_entries(&v).is_err(), "{bad}");
        }
        let dup = serde_json::json!({ "task": { "starterFiles": [
            { "path": "A.py", "content": "x" }, { "path": "a.py", "content": "y" }
        ] } });
        assert!(starter_entries(&dup).is_err());
        assert!(starter_entries(&serde_json::json!({ "task": {} })).is_err());
    }

    #[test]
    fn fingerprint_ignores_order_and_tracks_content() {
        let a = vec![("a.py".to_string(), "x".to_string()), ("b.py".to_string(), "y".to_string())];
        let b = vec![("b.py".to_string(), "y".to_string()), ("a.py".to_string(), "x".to_string())];
        assert_eq!(entries_fingerprint(&a), entries_fingerprint(&b));
        let c = vec![("a.py".to_string(), "x!".to_string()), ("b.py".to_string(), "y".to_string())];
        assert_ne!(entries_fingerprint(&a), entries_fingerprint(&c));
    }

    #[test]
    fn fingerprint_matches_the_starter_record_format() {
        let entries = vec![("app/main.py".to_string(), "print(1)\n".to_string())];
        let row = format!("app/main.py:{}\n", eng_package::sha256_hex(b"print(1)\n"));
        assert_eq!(entries_fingerprint(&entries), eng_package::sha256_hex(row.as_bytes()));
    }

    #[test]
    fn outbox_reads_older_and_partial_records() {
        let empty: AuthoredOutbox = serde_json::from_str("{}").unwrap();
        assert!(empty.accepted.is_none() && empty.conflict.is_none() && empty.handoff.is_empty());
        let full = AuthoredOutbox {
            handoff: BTreeMap::from([("summary".to_string(), "done".to_string())]),
            ai_use: "none".into(),
            handoff_saved_at: Some("t".into()),
            accepted: Some(AcceptedFiles { revision: 3, files_sha256: None, local_fingerprint: "f".into(), accepted_at: "t".into() }),
            conflict: None,
        };
        let back: AuthoredOutbox = serde_json::from_str(&serde_json::to_string(&full).unwrap()).unwrap();
        assert_eq!(back.accepted.unwrap().revision, 3);
        assert_eq!(back.handoff["summary"], "done");
    }
}
