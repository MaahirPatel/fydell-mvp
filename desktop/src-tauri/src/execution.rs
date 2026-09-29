//! Test execution.
//!
//! **Remote (engineering scenarios, `execution: "remote"` in the package).**
//! Run tests sends the exact saved workspace files to the platform
//! (`POST /api/sim/sessions/{id}/runs`), which runs the scenario's pinned
//! tests on its isolated runner and returns results bound to a snapshot hash
//! (DESK-12). Candidate code never executes on this machine, and the
//! candidate installs no language runtime (DESK-06). A fingerprint of the
//! files sent is returned so the UI can label results from an earlier
//! version once the candidate edits again.
//!
//! **Local (legacy scenarios without a remote declaration).** Candidate code
//! runs as a bounded child process on the candidate's own machine. That is
//! crash/hang containment, not isolation, and is kept only for older
//! scenarios outside the paid path:
//! - the run cannot hang the session (wall-time timeout, then kill),
//! - the run cannot flood the app (stdout/stderr byte caps),
//! - credential-like environment variables are scrubbed,
//! - resource abuse is contained (CPU / memory limits on Unix),
//! - the raw output is always preserved and shown to the candidate.

use crate::error::{AppError, AppResult};
use crate::platform::{Platform, RemoteIgnored, RemoteTestCase};
use crate::session;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::io::AsyncReadExt;
use tokio::process::Command;

const TIMEOUT: Duration = Duration::from_secs(120);
const OUTPUT_CAP: usize = 256 * 1024;

/// The minimal PATH candidate code runs under. The provisioning runtime
/// check (session.rs) verifies the declared test runner against this same
/// PATH, so the check and the run cannot disagree.
#[cfg(unix)]
pub(crate) const EXEC_PATH: &str = "/usr/local/bin:/usr/bin:/bin";
#[cfg(windows)]
pub(crate) const EXEC_PATH: &str = "C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\Python311;C:\\Program Files\\Python311\\Scripts";

#[derive(Serialize, Default)]
pub struct TestRunResult {
    /// "remote" (platform runner) or "local" (legacy child process).
    pub mode: String,
    /// Remote: completed | indeterminate | infrastructure_error | not_configured.
    /// Local: completed | timeout | output_limit | runtime_error.
    pub status: String,
    pub exit_code: Option<i32>,
    pub passed: Option<u32>,
    pub failed: Option<u32>,
    pub total: Option<u32>,
    pub duration_ms: u64,
    pub stdout: String,
    pub stderr: String,
    pub truncated: bool,
    /// Remote only: plain-language reason for any non-"completed" status.
    pub status_reason: Option<String>,
    pub run_id: Option<String>,
    /// Remote only: the platform's hash of the files the tests ran against.
    pub snapshot_hash: Option<String>,
    /// Fingerprint of the workspace files at run time (compare with
    /// `workspace_fingerprint` to detect results from an earlier version).
    pub workspace_fingerprint: Option<String>,
    pub suite_version: Option<String>,
    pub tests: Vec<RemoteTestCase>,
    pub errors: Option<u32>,
    /// Provided test files the candidate had edited; the originals were used.
    pub restored_trusted: Vec<String>,
    /// Files the runner did not use, with the reason.
    pub ignored: Vec<RemoteIgnored>,
}

/// Whether the materialized package declared remote execution.
fn remote_execution(dir: &Path) -> bool {
    std::fs::read_to_string(dir.join(".fydell").join("package.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| {
            v.get("execution")
                .and_then(|e| e.as_str())
                .map(|e| e == "remote")
        })
        .unwrap_or(false)
}

/// Current workspace files, exactly as submission would snapshot them.
fn workspace_files(dir: &Path) -> AppResult<HashMap<String, String>> {
    let mut files = Vec::new();
    crate::submission::collect_files(dir, dir, &mut files)?;
    Ok(files.into_iter().collect())
}

/// Order-independent fingerprint over (path, content) pairs.
pub(crate) fn fingerprint(files: &HashMap<String, String>) -> String {
    use sha2::{Digest, Sha256};
    let mut paths: Vec<&String> = files.keys().collect();
    paths.sort();
    let mut h = Sha256::new();
    for p in paths {
        h.update(p.as_bytes());
        h.update([0u8]);
        h.update(files[p].as_bytes());
        h.update([0u8]);
    }
    hex::encode(h.finalize())
}

/// Tauri command: fingerprint of the current workspace files, for the
/// "Results from an earlier version" label (DESK-12).
#[tauri::command]
pub fn workspace_fingerprint() -> AppResult<String> {
    let dir = session::workspace_dir()?;
    Ok(fingerprint(&workspace_files(&dir)?))
}

/// Tauri command: run the scenario's tests.
#[tauri::command]
pub async fn run_tests() -> AppResult<TestRunResult> {
    session::require_active()?;
    let dir = session::workspace_dir()?;
    if remote_execution(&dir) {
        run_remote(&dir).await
    } else {
        run_local(&dir).await
    }
}

async fn run_remote(dir: &Path) -> AppResult<TestRunResult> {
    let session_id = session::platform_session_id()?;
    let files = workspace_files(dir)?;
    let workspace_fingerprint = fingerprint(&files);
    let client_run_id = format!("run-{}", uuid::Uuid::new_v4().simple());
    let started = Instant::now();
    let response = Platform::new()
        .run_tests(&session_id, &files, &client_run_id)
        .await?;
    let duration_ms = started.elapsed().as_millis() as u64;

    let run = response.run.ok_or_else(|| {
        AppError::Execution(
            "the test run is still in progress on the platform; try again in a moment".into(),
        )
    })?;
    let s = &run.summary;
    let result = TestRunResult {
        mode: "remote".into(),
        status: run.status.clone(),
        exit_code: None,
        passed: Some(s.passed),
        failed: Some(s.failed),
        total: Some(s.passed + s.failed + s.errors + s.skipped),
        duration_ms,
        stdout: run.output.clone(),
        stderr: String::new(),
        truncated: run.output_truncated,
        status_reason: run.status_reason.clone(),
        run_id: Some(response.run_id),
        snapshot_hash: Some(run.candidate_snapshot_hash.clone()),
        workspace_fingerprint: Some(workspace_fingerprint),
        suite_version: Some(run.suite_version.clone()),
        tests: run.tests.clone(),
        errors: Some(s.errors),
        restored_trusted: run.restored_trusted.clone(),
        ignored: run.ignored.clone(),
    };

    // Local evidence log only: the platform already recorded this run
    // server-side (test_run_completed), so nothing is posted twice.
    let _ = crate::events::log_system_event(
        "tests_run",
        serde_json::json!({
            "mode": "remote",
            "status": result.status,
            "passed": result.passed,
            "failed": result.failed,
            "snapshot_hash": result.snapshot_hash,
        }),
    );
    Ok(result)
}

/// Scrub credential-like variables before spawning candidate code.
fn scrubbed_env() -> Vec<(String, String)> {
    std::env::vars()
        .filter(|(k, _)| {
            let u = k.to_uppercase();
            !(u.contains("KEY")
                || u.contains("TOKEN")
                || u.contains("SECRET")
                || u.contains("PASSWORD")
                || u.contains("CREDENTIAL")
                || u.contains("PRIVATE")
                || u.contains("AUTH"))
        })
        .collect()
}

async fn run_local(dir: &Path) -> AppResult<TestRunResult> {
    let argv = session::test_command()?;
    let (program, args) = argv
        .split_first()
        .ok_or_else(|| AppError::Execution("scenario has no test command".into()))?;
    let workspace_fingerprint = fingerprint(&workspace_files(dir)?);

    let started = Instant::now();
    let mut cmd = Command::new(program);
    cmd.args(args)
        .current_dir(dir)
        .env_clear()
        .envs(scrubbed_env())
        // A minimal PATH so `python3` resolves; nothing else inherited.
        .env("PATH", EXEC_PATH)
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .env("PYTHONNOUSERSITE", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    unsafe {
        // tokio::process::Command::pre_exec is unsafe: the closure runs
        // between fork and exec.
        cmd.pre_exec(|| {
            // Contain resource abuse: 60s CPU (soft), 512 MiB address space.
            let _ = rlimit::setrlimit(rlimit::Resource::CPU, 60, 65);
            let _ = rlimit::setrlimit(rlimit::Resource::AS, 512 * 1024 * 1024, 536_870_912);
            Ok(())
        });
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::Execution(format!("failed to spawn test runner: {e}")))?;

    let mut stdout = child.stdout.take().expect("piped");
    let mut stderr = child.stderr.take().expect("piped");

    let read_out = async {
        let mut buf = Vec::new();
        let mut chunk = [0u8; 8192];
        let mut truncated = false;
        loop {
            match stdout.read(&mut chunk).await {
                Ok(0) => break,
                Ok(n) => {
                    if buf.len() + n > OUTPUT_CAP {
                        truncated = true;
                        let room = OUTPUT_CAP.saturating_sub(buf.len());
                        buf.extend_from_slice(&chunk[..room.min(n)]);
                        break;
                    }
                    buf.extend_from_slice(&chunk[..n]);
                }
                Err(_) => break,
            }
        }
        (String::from_utf8_lossy(&buf).into_owned(), truncated)
    };
    let read_err = async {
        let mut buf = Vec::new();
        let mut chunk = [0u8; 8192];
        loop {
            match stderr.read(&mut chunk).await {
                Ok(0) => break,
                Ok(n) => {
                    if buf.len() + n > OUTPUT_CAP {
                        break;
                    }
                    buf.extend_from_slice(&chunk[..n]);
                }
                Err(_) => break,
            }
        }
        String::from_utf8_lossy(&buf).into_owned()
    };

    let ((out, out_truncated), err) = tokio::join!(read_out, read_err);

    let status = tokio::time::timeout(TIMEOUT, child.wait())
        .await
        .map(|r| r.map_err(|e| AppError::Execution(format!("wait failed: {e}"))));

    let (status_str, exit_code) = match status {
        Ok(Ok(s)) => ("completed".to_string(), s.code()),
        Ok(Err(e)) => return Err(e),
        Err(_) => {
            // Timeout: kill the whole thing.
            let _ = child.kill().await;
            let _ = tokio::time::timeout(Duration::from_secs(5), child.wait()).await;
            ("timeout".to_string(), None)
        }
    };
    let final_status = if out_truncated {
        "output_limit".to_string()
    } else {
        status_str
    };
    let duration_ms = started.elapsed().as_millis() as u64;

    let (passed, failed) = parse_pytest_summary(&out);

    let result = TestRunResult {
        mode: "local".into(),
        status: final_status,
        exit_code,
        passed,
        failed,
        total: match (passed, failed) {
            (Some(p), Some(f)) => Some(p + f),
            (Some(p), None) => Some(p),
            _ => None,
        },
        duration_ms,
        stdout: out,
        stderr: err,
        truncated: out_truncated,
        workspace_fingerprint: Some(workspace_fingerprint),
        ..Default::default()
    };

    // Record the run in the evidence log (counts only; raw output stays local).
    // `record` maps "tests_run" onto the platform's `workspace_action` event.
    let _ = crate::events::record(
        "tests_run",
        serde_json::json!({
            "status": result.status,
            "passed": result.passed,
            "failed": result.failed,
            "duration_ms": result.duration_ms,
        }),
    )
    .await;

    Ok(result)
}

/// Best-effort parse of pytest's summary line, e.g. "6 passed, 3 failed in 1.24s".
/// Reads the count immediately before each "passed"/"failed" word.
fn parse_pytest_summary(out: &str) -> (Option<u32>, Option<u32>) {
    for line in out.lines().rev().take(5) {
        let words: Vec<&str> = line
            .split(|c: char| c == ',' || c.is_whitespace())
            .filter(|w| !w.is_empty())
            .collect();
        let mut passed = None;
        let mut failed = None;
        for pair in words.windows(2) {
            match pair[1] {
                "passed" => passed = pair[0].parse().ok().or(passed),
                "failed" => failed = pair[0].parse().ok().or(failed),
                _ => {}
            }
        }
        if passed.is_some() || failed.is_some() {
            return (passed, failed);
        }
    }
    (None, None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fingerprint_is_order_independent_and_content_sensitive() {
        let mut a = HashMap::new();
        a.insert("webhooks/retry.py".to_string(), "x = 1\n".to_string());
        a.insert(
            "tests/test_a.py".to_string(),
            "def test(): pass\n".to_string(),
        );
        let mut b = HashMap::new();
        b.insert(
            "tests/test_a.py".to_string(),
            "def test(): pass\n".to_string(),
        );
        b.insert("webhooks/retry.py".to_string(), "x = 1\n".to_string());
        assert_eq!(fingerprint(&a), fingerprint(&b));
        let mut c = a.clone();
        c.insert("webhooks/retry.py".to_string(), "x = 2\n".to_string());
        assert_ne!(fingerprint(&a), fingerprint(&c));
    }

    #[test]
    fn remote_flag_is_read_from_the_package_pin() {
        let dir =
            std::env::temp_dir().join(format!("fydell-exec-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(dir.join(".fydell")).unwrap();
        assert!(!remote_execution(&dir), "no pin -> local");
        std::fs::write(
            dir.join(".fydell").join("package.json"),
            r#"{"execution":"remote"}"#,
        )
        .unwrap();
        assert!(remote_execution(&dir));
        std::fs::write(
            dir.join(".fydell").join("package.json"),
            r#"{"execution":"local"}"#,
        )
        .unwrap();
        assert!(!remote_execution(&dir));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn pytest_summary_parses() {
        assert_eq!(
            parse_pytest_summary("== 6 passed, 3 failed in 1.2s =="),
            (Some(6), Some(3))
        );
        assert_eq!(
            parse_pytest_summary("..\n12 passed in 0.16s"),
            (Some(12), None)
        );
        assert_eq!(
            parse_pytest_summary("== 2 failed, 10 passed in 0.20s =="),
            (Some(10), Some(2))
        );
        assert_eq!(parse_pytest_summary("no summary here"), (None, None));
    }
}
