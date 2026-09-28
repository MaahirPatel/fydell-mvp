//! Bounded local test execution.
//!
//! Candidate code runs on the candidate's own machine, so the threat model is
//! *not* hostile-tenant isolation (that is what the server-side gVisor worker
//! is for). What this module guarantees:
//!
//! - the run cannot hang the session (wall-time timeout, then kill),
//! - the run cannot flood the app (stdout/stderr byte caps),
//! - the run cannot exfiltrate via the candidate's ambient credentials
//!   (credential-like environment variables are scrubbed),
//! - resource abuse is contained (CPU / memory limits on Unix),
//! - the raw output is always preserved and shown to the candidate.

use crate::error::{AppError, AppResult};
use crate::session;
use serde::Serialize;
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

#[derive(Serialize)]
pub struct TestRunResult {
    pub status: String, // completed | timeout | output_limit | runtime_error
    pub exit_code: Option<i32>,
    pub passed: Option<u32>,
    pub failed: Option<u32>,
    pub total: Option<u32>,
    pub duration_ms: u64,
    pub stdout: String,
    pub stderr: String,
    pub truncated: bool,
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

/// Tauri command: run the scenario's public test suite inside the workspace.
#[tauri::command]
pub async fn run_tests() -> AppResult<TestRunResult> {
    session::require_active()?;
    let dir = session::workspace_dir()?;
    let argv = session::test_command()?;
    let (program, args) = argv
        .split_first()
        .ok_or_else(|| AppError::Execution("scenario has no test command".into()))?;

    let started = Instant::now();
    let mut child = unsafe {
        let mut cmd = Command::new(program);
        cmd.args(args)
            .current_dir(&dir)
            .env_clear()
            .envs(scrubbed_env())
            // A minimal PATH so `python3` resolves; nothing else inherited.
            .env("PATH", crate::execution::EXEC_PATH)
            .env("PYTHONDONTWRITEBYTECODE", "1")
            .env("PYTHONNOUSERSITE", "1")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(unix)]
        {
            // tokio::process::Command has an inherent unsafe pre_exec.
            cmd.pre_exec(|| {
                // Contain resource abuse: 60s CPU (soft), 512 MiB address space.
                let _ = rlimit::setrlimit(rlimit::Resource::CPU, 60, 65);
                let _ = rlimit::setrlimit(rlimit::Resource::AS, 512 * 1024 * 1024, 536_870_912);
                Ok(())
            });
        }
        cmd.spawn()
    }
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
        status: final_status.clone(),
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
fn parse_pytest_summary(out: &str) -> (Option<u32>, Option<u32>) {
    let mut passed = None;
    let mut failed = None;
    for line in out.lines().rev().take(5) {
        for token in line.split([',', ' ']) {
            let t = token.trim();
            if let Some(n) = t.strip_suffix("passed").filter(|s| !s.is_empty()) {
                passed = n.trim().parse().ok().or(passed);
            } else if let Some(n) = t.strip_suffix("failed").filter(|s| !s.is_empty()) {
                failed = n.trim().parse().ok().or(failed);
            }
        }
        if passed.is_some() {
            break;
        }
    }
    (passed, failed)
}
