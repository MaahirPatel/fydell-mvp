//! Starter extraction and submission packaging for engineering assessments.
//!
//! Pure file-system logic, no network. The packaging rules mirror the
//! server's archive inspection (`src/lib/eng/zip.ts`) so an archive built
//! here passes the platform's checks, and extraction refuses anything unsafe
//! before a byte is written. The server re-validates everything it receives;
//! these checks exist so the candidate learns about a problem before upload.

use std::collections::{BTreeMap, BTreeSet};
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

pub const MAX_ARCHIVE_BYTES: u64 = 5 * 1024 * 1024;
pub const MAX_FILES: usize = 300;
pub const MAX_FILE_BYTES: u64 = 1024 * 1024;
pub const MAX_TOTAL_BYTES: u64 = 20 * 1024 * 1024;
pub const MAX_PATH_LEN: usize = 240;

const MAX_STARTER_ENTRIES: usize = 2000;
const MAX_STARTER_BYTES: u64 = 50 * 1024 * 1024;
/// Walking stops here so a forgotten dependency folder under an unexpected
/// name cannot make packaging hash the whole disk.
const MAX_WALK_ENTRIES: usize = 20_000;

const IGNORED_SEGMENTS: &[&str] = &[
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".git",
    ".idea",
    ".vscode",
    ".venv",
    "venv",
    "env",
    "node_modules",
    "__MACOSX",
    "dist",
    "build",
    ".tox",
    ".eggs",
];
const IGNORED_FILES: &[&str] = &[".DS_Store", "Thumbs.db", "desktop.ini"];
const NESTED_ARCHIVE_EXT: &[&str] = &[
    "zip", "tar", "gz", "tgz", "bz2", "xz", "7z", "rar", "jar", "whl", "egg",
];

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

/// Same rule as the server's CREDENTIAL pattern, applied to a file name.
pub fn is_credential(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    if lower == ".env" {
        return true;
    }
    if let Some(rest) = lower.strip_prefix(".env.") {
        return !rest.is_empty() && !matches!(rest, "example" | "sample" | "template");
    }
    if matches!(lower.as_str(), "id_rsa" | "id_ed25519" | "credentials.json") {
        return true;
    }
    [".pem", ".p12", ".pfx"]
        .iter()
        .any(|ext| lower.len() > ext.len() && lower.ends_with(ext))
}

fn is_nested_archive(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower
        .rsplit_once('.')
        .map(|(stem, ext)| !stem.is_empty() && NESTED_ARCHIVE_EXT.contains(&ext))
        .unwrap_or(false)
}

/// A single path segment that is safe to use as a folder name.
pub fn is_safe_segment(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 80
        && s != "."
        && s != ".."
        && s
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
}

/// Validates an archive entry name: relative, forward slashes only, no
/// traversal, no empty or dot segments, no control characters, no drive.
pub fn validate_entry_name(name: &str) -> Option<Vec<&str>> {
    if name.is_empty() || name.len() > MAX_PATH_LEN + 81 {
        return None;
    }
    if name.starts_with('/') || name.contains('\\') || name.contains(':') {
        return None;
    }
    if name.chars().any(|c| c.is_control()) {
        return None;
    }
    let parts: Vec<&str> = name.split('/').collect();
    if parts.iter().any(|p| p.is_empty() || *p == "." || *p == "..") {
        return None;
    }
    Some(parts)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StarterFile {
    pub path: String,
    pub sha256: String,
    pub bytes: u64,
}

/// Verifies the downloaded starter against `expected_sha256`, then extracts
/// every entry under `<root>/` into `dest/<root>`. Nothing is written unless
/// the hash matches and every entry passes validation; extraction goes to a
/// staging folder that is renamed into place only when complete. An
/// existing, non-empty project folder is never overwritten.
pub fn extract_starter(
    bytes: &[u8],
    expected_sha256: &str,
    root: &str,
    dest: &Path,
) -> AppResult<Vec<StarterFile>> {
    let actual = sha256_hex(bytes);
    if expected_sha256.trim().is_empty() || !actual.eq_ignore_ascii_case(expected_sha256.trim()) {
        return Err(AppError::Integrity(
            "the downloaded starter does not match the hash the platform sent; nothing was written. Try the download again".into(),
        ));
    }
    if !is_safe_segment(root) {
        return Err(AppError::Integrity("the starter folder name is not valid".into()));
    }

    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|_| AppError::Integrity("the starter download is not a readable ZIP".into()))?;
    if archive.len() > MAX_STARTER_ENTRIES {
        return Err(AppError::Integrity("the starter has too many entries".into()));
    }

    let mut entries: Vec<(String, Vec<u8>)> = Vec::new();
    let mut seen = BTreeSet::new();
    let mut total: u64 = 0;
    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|_| AppError::Integrity("a starter entry could not be read".into()))?;
        if file.is_symlink() {
            return Err(AppError::Integrity("the starter contains a link, which is not allowed".into()));
        }
        let name = file.name().to_string();
        if file.is_dir() {
            continue;
        }
        let parts = validate_entry_name(&name)
            .ok_or_else(|| AppError::Integrity("the starter contains an unsafe path".into()))?;
        if parts.len() < 2 || parts[0] != root {
            return Err(AppError::Integrity(
                "the starter contains a file outside its project folder".into(),
            ));
        }
        let rel = parts[1..].join("/");
        if !seen.insert(rel.to_ascii_lowercase()) {
            return Err(AppError::Integrity("the starter contains a duplicate file name".into()));
        }
        let declared = file.size();
        if declared > MAX_FILE_BYTES * 4 || total + declared > MAX_STARTER_BYTES {
            return Err(AppError::Integrity("the starter is larger than expected".into()));
        }
        let mut data = Vec::with_capacity(declared as usize);
        (&mut file)
            .take(declared + 1)
            .read_to_end(&mut data)
            .map_err(|_| AppError::Integrity("a starter file could not be decompressed".into()))?;
        if data.len() as u64 != declared {
            return Err(AppError::Integrity("a starter file does not match its recorded size".into()));
        }
        total += declared;
        entries.push((rel, data));
    }
    if entries.is_empty() {
        return Err(AppError::Integrity("the starter is empty".into()));
    }

    let project = dest.join(root);
    if project.exists() {
        let non_empty = std::fs::read_dir(&project)
            .map(|mut it| it.next().is_some())
            .unwrap_or(true);
        if non_empty {
            return Err(AppError::Io(
                "a project folder for this task already exists; it was left untouched".into(),
            ));
        }
        std::fs::remove_dir(&project)?;
    }

    std::fs::create_dir_all(dest)?;
    let staging = dest.join(format!(".{root}.partial"));
    if staging.exists() {
        std::fs::remove_dir_all(&staging)?;
    }
    let written = (|| -> AppResult<Vec<StarterFile>> {
        let mut out = Vec::new();
        for (rel, data) in &entries {
            let target = staging.join(rel);
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&target, data)?;
            out.push(StarterFile {
                path: rel.clone(),
                sha256: sha256_hex(data),
                bytes: data.len() as u64,
            });
        }
        Ok(out)
    })();
    match written {
        Ok(mut files) => {
            std::fs::rename(&staging, &project)?;
            files.sort_by(|a, b| a.path.cmp(&b.path));
            Ok(files)
        }
        Err(e) => {
            let _ = std::fs::remove_dir_all(&staging);
            Err(e)
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EntryChange {
    Unchanged,
    Modified,
    Added,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageEntry {
    pub path: String,
    pub bytes: u64,
    pub change: EntryChange,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExclusionReason {
    IgnoredFolder,
    SystemFile,
    PossibleSecret,
    NestedArchive,
    Link,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageExclusion {
    pub path: String,
    pub reason: ExclusionReason,
}

/// What would be packaged, before anything is zipped or sent. `problems`
/// lists the reasons the platform would reject the archive; packaging is
/// refused while any remain.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackagePlan {
    pub root: String,
    pub included: Vec<PackageEntry>,
    pub excluded: Vec<PackageExclusion>,
    pub removed_from_starter: Vec<String>,
    pub total_bytes: u64,
    pub problems: Vec<String>,
}

pub fn plan_package(
    project: &Path,
    root: &str,
    starter: &BTreeMap<String, String>,
) -> AppResult<PackagePlan> {
    if !project.is_dir() {
        return Err(AppError::NotFound(
            "the project folder for this task (prepare it again from the setup step)".into(),
        ));
    }
    let mut plan = PackagePlan {
        root: root.to_string(),
        included: Vec::new(),
        excluded: Vec::new(),
        removed_from_starter: Vec::new(),
        total_bytes: 0,
        problems: Vec::new(),
    };
    let mut walked = 0usize;
    walk(project, project, starter, &mut plan, &mut walked)?;
    if walked >= MAX_WALK_ENTRIES {
        plan.problems.push(format!(
            "The project folder has more than {MAX_WALK_ENTRIES} entries. Remove dependency or data folders and check again."
        ));
    }

    plan.included.sort_by(|a, b| a.path.cmp(&b.path));
    plan.excluded.sort_by(|a, b| a.path.cmp(&b.path));
    let present: BTreeSet<&str> = plan.included.iter().map(|e| e.path.as_str()).collect();
    plan.removed_from_starter = starter
        .keys()
        .filter(|p| !present.contains(p.as_str()))
        .cloned()
        .collect();

    let mut lower = BTreeSet::new();
    for e in &plan.included {
        if !lower.insert(e.path.to_ascii_lowercase()) {
            plan.problems.push(format!(
                "Two files differ only by letter case ({}). Rename one.",
                e.path
            ));
        }
        if e.bytes > MAX_FILE_BYTES {
            plan.problems.push(format!(
                "{} is larger than 1 MB. Remove large data or generated files.",
                e.path
            ));
        }
        if root.len() + 1 + e.path.len() > MAX_PATH_LEN {
            plan.problems.push(format!("The path {} is too long.", e.path));
        }
    }
    if plan.included.len() > MAX_FILES {
        plan.problems.push(format!(
            "The project has {} files after caches are left out; the limit is {MAX_FILES}.",
            plan.included.len()
        ));
    }
    if plan.total_bytes > MAX_TOTAL_BYTES {
        plan.problems.push(
            "The project is larger than 20 MB. Leave out virtual environments, caches and build output.".into(),
        );
    }
    if starter.contains_key("fydell.json") && !present.contains("fydell.json") {
        plan.problems.push(
            "fydell.json is missing from the top of the project folder. Restore it from the starter.".into(),
        );
    }
    Ok(plan)
}

fn walk(
    dir: &Path,
    project: &Path,
    starter: &BTreeMap<String, String>,
    plan: &mut PackagePlan,
    walked: &mut usize,
) -> AppResult<()> {
    let mut children: Vec<PathBuf> = std::fs::read_dir(dir)?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .collect();
    children.sort();
    for path in children {
        *walked += 1;
        if *walked >= MAX_WALK_ENTRIES {
            return Ok(());
        }
        let Some(rel) = path
            .strip_prefix(project)
            .ok()
            .and_then(|r| r.to_str())
            .map(|r| r.replace('\\', "/"))
        else {
            plan.problems.push(
                "A file name in the project is not valid text. Rename it and check again.".into(),
            );
            continue;
        };
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default()
            .to_string();
        let meta = std::fs::symlink_metadata(&path)?;
        if meta.file_type().is_symlink() {
            plan.excluded.push(PackageExclusion { path: rel, reason: ExclusionReason::Link });
            continue;
        }
        if meta.is_dir() {
            if IGNORED_SEGMENTS.contains(&name.as_str()) {
                plan.excluded.push(PackageExclusion {
                    path: format!("{rel}/"),
                    reason: ExclusionReason::IgnoredFolder,
                });
            } else {
                walk(&path, project, starter, plan, walked)?;
            }
            continue;
        }
        if !meta.is_file() {
            continue;
        }
        let reason = if IGNORED_FILES.contains(&name.as_str()) {
            Some(ExclusionReason::SystemFile)
        } else if is_credential(&name) {
            Some(ExclusionReason::PossibleSecret)
        } else if is_nested_archive(&name) {
            Some(ExclusionReason::NestedArchive)
        } else {
            None
        };
        if let Some(reason) = reason {
            plan.excluded.push(PackageExclusion { path: rel, reason });
            continue;
        }
        let bytes = meta.len();
        plan.total_bytes += bytes;
        let change = match starter.get(&rel) {
            None => EntryChange::Added,
            Some(expected) => {
                if bytes <= MAX_FILE_BYTES && sha256_hex(&std::fs::read(&path)?) == *expected {
                    EntryChange::Unchanged
                } else {
                    EntryChange::Modified
                }
            }
        };
        plan.included.push(PackageEntry { path: rel, bytes, change });
    }
    Ok(())
}

/// Zips exactly the planned files under `<root>/`. Entry order and
/// timestamps are fixed, so the same files always produce the same bytes
/// (and the same SHA-256).
pub fn build_archive(project: &Path, plan: &PackagePlan) -> AppResult<Vec<u8>> {
    if !plan.problems.is_empty() {
        return Err(AppError::Execution(plan.problems.join(" ")));
    }
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);
    let mut writer = zip::ZipWriter::new(Cursor::new(Vec::new()));
    for entry in &plan.included {
        let data = std::fs::read(project.join(&entry.path))?;
        if data.len() as u64 > MAX_FILE_BYTES {
            return Err(AppError::Execution(format!(
                "{} grew past 1 MB while packaging. Check the project again.",
                entry.path
            )));
        }
        writer
            .start_file(format!("{}/{}", plan.root, entry.path), options)
            .map_err(|e| AppError::Io(format!("could not add {} to the archive: {e}", entry.path)))?;
        writer.write_all(&data)?;
    }
    let bytes = writer
        .finish()
        .map_err(|e| AppError::Io(format!("could not finish the archive: {e}")))?
        .into_inner();
    if bytes.len() as u64 > MAX_ARCHIVE_BYTES {
        return Err(AppError::Execution(
            "The archive is larger than 5 MB. Leave out virtual environments, caches and build output.".into(),
        ));
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("fydell-eng-test-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn zip_of(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut w = zip::ZipWriter::new(Cursor::new(Vec::new()));
        let opts = zip::write::SimpleFileOptions::default();
        for (name, data) in entries {
            w.start_file(*name, opts).unwrap();
            w.write_all(data).unwrap();
        }
        w.finish().unwrap().into_inner()
    }

    #[test]
    fn credential_rule_matches_server() {
        assert!(is_credential(".env"));
        assert!(is_credential(".env.local"));
        assert!(is_credential(".ENV.production"));
        assert!(!is_credential(".env.example"));
        assert!(!is_credential(".env.sample"));
        assert!(!is_credential(".env.template"));
        assert!(is_credential("id_rsa"));
        assert!(is_credential("server.pem"));
        assert!(!is_credential(".pem"));
        assert!(is_credential("credentials.json"));
        assert!(!is_credential("dispatcher.py"));
    }

    #[test]
    fn nested_archive_rule() {
        assert!(is_nested_archive("vendor.zip"));
        assert!(is_nested_archive("a.tar.gz"));
        assert!(!is_nested_archive("notes.md"));
        assert!(!is_nested_archive(".zip"));
    }

    #[test]
    fn extracts_verified_starter() {
        let bytes = zip_of(&[
            ("proj/fydell.json", b"{\"scenario\":\"x\"}"),
            ("proj/src/app.py", b"print(1)\n"),
        ]);
        let dest = temp_dir();
        let files = extract_starter(&bytes, &sha256_hex(&bytes), "proj", &dest).unwrap();
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].path, "fydell.json");
        assert_eq!(files[1].path, "src/app.py");
        assert_eq!(std::fs::read(dest.join("proj/src/app.py")).unwrap(), b"print(1)\n");
        assert!(!dest.join(".proj.partial").exists());
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn hash_mismatch_writes_nothing() {
        let bytes = zip_of(&[("proj/a.txt", b"a")]);
        let dest = temp_dir();
        let err = extract_starter(&bytes, &"0".repeat(64), "proj", &dest).unwrap_err();
        assert_eq!(err.code(), "integrity_error");
        assert!(!dest.join("proj").exists());
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn rejects_traversal_and_foreign_roots() {
        let dest = temp_dir();
        for bad in ["proj/../evil.txt", "other/a.txt", "/abs.txt", "proj\\win.txt", "proj//a.txt"] {
            let bytes = zip_of(&[(bad, b"x")]);
            let err = extract_starter(&bytes, &sha256_hex(&bytes), "proj", &dest).unwrap_err();
            assert_eq!(err.code(), "integrity_error", "{bad} must be rejected");
        }
        assert!(std::fs::read_dir(&dest).unwrap().next().is_none());
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn never_overwrites_existing_project() {
        let bytes = zip_of(&[("proj/a.txt", b"new")]);
        let dest = temp_dir();
        std::fs::create_dir_all(dest.join("proj")).unwrap();
        std::fs::write(dest.join("proj/a.txt"), b"candidate work").unwrap();
        let err = extract_starter(&bytes, &sha256_hex(&bytes), "proj", &dest).unwrap_err();
        assert_eq!(err.code(), "io_error");
        assert_eq!(std::fs::read(dest.join("proj/a.txt")).unwrap(), b"candidate work");
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn plan_excludes_caches_secrets_and_tracks_changes() {
        let dest = temp_dir();
        let project = dest.join("proj");
        std::fs::create_dir_all(project.join("src/__pycache__")).unwrap();
        std::fs::create_dir_all(project.join(".venv/lib")).unwrap();
        std::fs::write(project.join("fydell.json"), b"{}").unwrap();
        std::fs::write(project.join("src/app.py"), b"changed").unwrap();
        std::fs::write(project.join("src/new.py"), b"new").unwrap();
        std::fs::write(project.join("src/__pycache__/app.pyc"), b"x").unwrap();
        std::fs::write(project.join(".venv/lib/site.py"), b"x").unwrap();
        std::fs::write(project.join(".env"), b"SECRET=1").unwrap();
        std::fs::write(project.join(".env.example"), b"SECRET=").unwrap();
        std::fs::write(project.join("Thumbs.db"), b"x").unwrap();

        let mut starter = BTreeMap::new();
        starter.insert("fydell.json".to_string(), sha256_hex(b"{}"));
        starter.insert("src/app.py".to_string(), sha256_hex(b"original"));
        starter.insert("README.md".to_string(), sha256_hex(b"readme"));

        let plan = plan_package(&project, "proj", &starter).unwrap();
        let included: Vec<(&str, EntryChange)> =
            plan.included.iter().map(|e| (e.path.as_str(), e.change)).collect();
        assert_eq!(
            included,
            vec![
                (".env.example", EntryChange::Added),
                ("fydell.json", EntryChange::Unchanged),
                ("src/app.py", EntryChange::Modified),
                ("src/new.py", EntryChange::Added),
            ]
        );
        let reasons: Vec<(&str, ExclusionReason)> =
            plan.excluded.iter().map(|e| (e.path.as_str(), e.reason)).collect();
        assert!(reasons.contains(&(".env", ExclusionReason::PossibleSecret)));
        assert!(reasons.contains(&(".venv/", ExclusionReason::IgnoredFolder)));
        assert!(reasons.contains(&("src/__pycache__/", ExclusionReason::IgnoredFolder)));
        assert!(reasons.contains(&("Thumbs.db", ExclusionReason::SystemFile)));
        assert_eq!(plan.removed_from_starter, vec!["README.md".to_string()]);
        assert!(plan.problems.is_empty(), "{:?}", plan.problems);
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn plan_requires_manifest_the_starter_shipped_and_build_refuses_problems() {
        let dest = temp_dir();
        let project = dest.join("proj");
        std::fs::create_dir_all(&project).unwrap();
        std::fs::write(project.join("app.py"), b"x").unwrap();
        let starter: BTreeMap<String, String> = [("fydell.json".to_string(), "h".to_string())].into();
        let plan = plan_package(&project, "proj", &starter).unwrap();
        assert!(plan.problems.iter().any(|p| p.contains("fydell.json")));
        assert!(build_archive(&project, &plan).is_err());
        let without = plan_package(&project, "proj", &BTreeMap::new()).unwrap();
        assert!(without.problems.is_empty(), "{:?}", without.problems);
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn archive_is_rooted_and_deterministic() {
        let dest = temp_dir();
        let project = dest.join("proj");
        std::fs::create_dir_all(project.join("src")).unwrap();
        std::fs::write(project.join("fydell.json"), b"{}").unwrap();
        std::fs::write(project.join("src/app.py"), b"print(2)\n").unwrap();
        let plan = plan_package(&project, "proj", &BTreeMap::new()).unwrap();
        let a = build_archive(&project, &plan).unwrap();
        let b = build_archive(&project, &plan).unwrap();
        assert_eq!(sha256_hex(&a), sha256_hex(&b));

        let mut archive = zip::ZipArchive::new(Cursor::new(a.as_slice())).unwrap();
        let mut names: Vec<String> = (0..archive.len())
            .map(|i| archive.by_index(i).unwrap().name().to_string())
            .collect();
        names.sort();
        assert_eq!(names, vec!["proj/fydell.json", "proj/src/app.py"]);

        let other = temp_dir();
        let files = extract_starter(&a, &sha256_hex(&a), "proj", &other).unwrap();
        assert_eq!(files.len(), 2);
        let _ = std::fs::remove_dir_all(dest);
        let _ = std::fs::remove_dir_all(other);
    }
}
