//! HTTPS client for the Fydell platform API.
//!
//! The desktop app never touches Supabase directly. It talks to three routes
//! on the Next.js platform (see ARCHITECTURE.md §5):
//!
//! - GET  /api/desktop/packages/[inviteCode]   → scenario package + token
//! - POST /api/desktop/submissions             → upload submission
//!
//! Base URL comes from `FYDELL_PLATFORM_URL` (default http://localhost:3000).

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

fn base_url() -> String {
    std::env::var("FYDELL_PLATFORM_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .trim_end_matches('/')
        .to_string()
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("fydell-desktop/0.1.0")
        .build()
        .expect("reqwest client builds")
}

#[derive(Debug, Deserialize)]
pub struct PackageManifest {
    pub scenario_id: String,
    pub scenario_version: String,
    pub label: String,
    /// Command used to run the public test suite, e.g. ["python3","-m","pytest","tests/","-q"].
    pub test_command: Vec<String>,
    /// SHA-256 of the canonical file manifest, for integrity checking.
    pub manifest_sha256: String,
}

#[derive(Debug, Deserialize)]
pub struct ScenarioFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct PackageResponse {
    pub manifest: PackageManifest,
    pub files: Vec<ScenarioFile>,
    pub capability_token: String,
}

pub struct Package {
    pub manifest: PackageManifest,
    pub files: Vec<ScenarioFile>,
    pub capability_token: String,
}

pub async fn fetch_package(invite_code: &str) -> AppResult<Package> {
    let url = format!("{}/api/desktop/packages/{}", base_url(), invite_code);
    let res = client()
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Platform(format!("could not reach platform: {e}")))?;

    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::Platform(
            "invite code not recognized".to_string(),
        ));
    }
    if !res.status().is_success() {
        return Err(AppError::Platform(format!(
            "platform returned {}",
            res.status()
        )));
    }
    let body: PackageResponse = res
        .json()
        .await
        .map_err(|e| AppError::Platform(format!("bad package response: {e}")))?;

    // Integrity check: recompute the manifest hash over sorted (path, content).
    let mut entries: Vec<(&str, &str)> = body
        .files
        .iter()
        .map(|f| (f.path.as_str(), f.content.as_str()))
        .collect();
    entries.sort_by(|a, b| a.0.cmp(b.0));
    let digest = {
        use sha2::{Digest, Sha256};
        let mut h = Sha256::new();
        for (path, content) in &entries {
            h.update(path.as_bytes());
            h.update([0u8]);
            h.update(content.as_bytes());
            h.update([0u8]);
        }
        hex::encode(h.finalize())
    };
    if digest != body.manifest.manifest_sha256 {
        return Err(AppError::Platform(
            "scenario package failed integrity check".to_string(),
        ));
    }

    Ok(Package {
        manifest: body.manifest,
        files: body.files,
        capability_token: body.capability_token,
    })
}

#[derive(Serialize)]
pub struct SubmissionUpload<'a> {
    pub scenario_id: &'a str,
    pub scenario_version: &'a str,
    pub submission_id: &'a str,
    pub sha256: &'a str,
    pub submitted_at: &'a str,
    pub files: &'a [ScenarioFile],
    pub events: &'a [crate::events::Event],
    pub handoff: &'a serde_json::Value,
}

#[derive(Deserialize)]
pub struct SubmissionAck {
    pub receipt_id: String,
    pub report_ref: Option<String>,
}

pub async fn upload_submission(
    token: &str,
    upload: &SubmissionUpload<'_>,
) -> AppResult<SubmissionAck> {
    let url = format!("{}/api/desktop/submissions", base_url());
    let res = client()
        .post(&url)
        .bearer_auth(token)
        .json(upload)
        .send()
        .await
        .map_err(|e| AppError::Platform(format!("submission upload failed: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Platform(format!(
            "platform rejected submission ({})",
            res.status()
        )));
    }
    res.json()
        .await
        .map_err(|e| AppError::Platform(format!("bad submission ack: {e}")))
}
