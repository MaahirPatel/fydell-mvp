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

use std::collections::BTreeSet;

use serde_json::Value;

use crate::eng::{
    get_json, load_local, local_project_dir, now_iso, planned_project_dir, post_json, require_local,
    save_local, starter_map, valid_attempt_id, EngLocalState,
};
use crate::eng_package::{self, StarterFile, MAX_FILE_BYTES};
use crate::error::{AppError, AppResult};

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
    let entries = starter_entries(&view)?;
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
    let written = (|| -> AppResult<Vec<StarterFile>> {
        let mut out = Vec::new();
        for (path, content) in &entries {
            let target = staging.join(path);
            if let Some(dir) = target.parent() {
                std::fs::create_dir_all(dir)?;
            }
            std::fs::write(&target, content.as_bytes())?;
            out.push(StarterFile {
                path: path.clone(),
                sha256: eng_package::sha256_hex(content.as_bytes()),
                bytes: content.len() as u64,
            });
        }
        Ok(out)
    })();
    let mut files = match written {
        Ok(files) => files,
        Err(e) => {
            let _ = std::fs::remove_dir_all(&staging);
            return Err(e);
        }
    };
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
    Ok(state)
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
}
