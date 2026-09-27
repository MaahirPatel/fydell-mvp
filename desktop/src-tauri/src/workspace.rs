//! Workspace file I/O, scoped to the session directory with revision checks.
//!
//! The revision protocol mirrors the web slice: every write carries the rev
//! the writer based its edit on; a stale rev is rejected so no edit is ever
//! silently overwritten.

use crate::error::{AppError, AppResult};
use crate::session;
use serde::Serialize;

#[derive(Serialize)]
pub struct FileEntry {
    pub path: String,
    pub rev: u64,
    pub bytes: u64,
}

#[derive(Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub rev: u64,
}

/// Resolve `path` inside the workspace, rejecting escapes.
fn scoped(path: &str) -> AppResult<std::path::PathBuf> {
    if path.starts_with('/') || path.is_empty() || path.contains("..") {
        return Err(AppError::PathEscape);
    }
    let dir = session::workspace_dir()?;
    Ok(dir.join(path))
}

fn rel_path(dir: &std::path::Path, p: &std::path::Path) -> Option<String> {
    p.strip_prefix(dir)
        .ok()
        .map(|r| r.to_string_lossy().replace('\\', "/"))
}

#[tauri::command]
pub fn list_files() -> AppResult<Vec<FileEntry>> {
    session::require_active()?;
    let dir = session::workspace_dir()?;
    let mut out = Vec::new();
    collect(&dir, &dir, &mut out)?;
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

fn collect(
    dir: &std::path::Path,
    root: &std::path::Path,
    out: &mut Vec<FileEntry>,
) -> AppResult<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_dir() {
            // Never expose the internal metadata directory.
            if p.file_name().and_then(|n| n.to_str()) == Some(".fydell") {
                continue;
            }
            collect(&p, root, out)?;
        } else if let Some(rel) = rel_path(root, &p) {
            let rev = session::current_rev(&rel).unwrap_or(0);
            let bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
            out.push(FileEntry {
                path: rel,
                rev,
                bytes,
            });
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_file(path: String) -> AppResult<FileContent> {
    session::require_active()?;
    let target = scoped(&path)?;
    let content = std::fs::read_to_string(&target).map_err(|_| AppError::NotFound(path.clone()))?;
    let rev = session::current_rev(&path).unwrap_or(0);
    Ok(FileContent { path, content, rev })
}

#[derive(serde::Deserialize)]
pub struct WriteRequest {
    pub path: String,
    pub content: String,
    pub rev: u64,
}

#[tauri::command]
pub fn write_file(req: WriteRequest) -> AppResult<FileContent> {
    session::require_active()?;
    let actual = session::current_rev(&req.path).unwrap_or(0);
    if req.rev != actual {
        return Err(AppError::RevisionConflict {
            expected: req.rev,
            actual,
        });
    }
    let target = scoped(&req.path)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&target, &req.content)?;
    let new_rev = session::bump_rev(&req.path)?;

    crate::events::log_system_event(
        "file_saved",
        serde_json::json!({
            "path": req.path,
            "rev": new_rev,
            "bytes": req.content.len(),
            "sha256": sha256_hex(req.content.as_bytes()),
        }),
    )?;

    Ok(FileContent {
        path: req.path,
        content: req.content,
        rev: new_rev,
    })
}

fn sha256_hex(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(bytes))
}
