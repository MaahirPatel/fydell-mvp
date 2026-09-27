//! Safe upgrades (DESK-19).
//!
//! Two guarantees:
//!
//! 1. **Version gate.** Before the server clock starts, the client asks the
//!    platform for the minimum supported desktop version. A build below the
//!    minimum is *blocked* with an explicit message (never a silent failure,
//!    never a mid-assessment surprise). When the platform does not declare a
//!    minimum, the gate reports `unknown` and proceeds — the absence of a
//!    declaration is surfaced, not hidden.
//! 2. **No restart without consent.** There is no auto-updater in this build:
//!    updates are manual installs. The app therefore can never restart an
//!    in-progress assessment on its own; an available update is shown as a
//!    dismissible notice and applying it is the candidate's explicit choice.
//!    Documented in ARCHITECTURE.md; do not claim otherwise.
//!
//! Contract (proposed, NOT implemented server-side — the gate returns
//! `unknown` until it is):
//!   GET {platform}/api/desktop/version
//!   → 200 { min_supported_version: "0.2.0", latest_version?: "0.3.1",
//!           download_url?: "https://…" }
//!   → 404: the platform does not declare desktop versions.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const CURRENT: &str = env!("CARGO_PKG_VERSION");
const CACHE_TTL: Duration = Duration::from_secs(300);

static CACHE: OnceLock<Mutex<Option<(Instant, VersionGate)>>> = OnceLock::new();

fn cache() -> &'static Mutex<Option<(Instant, VersionGate)>> {
    CACHE.get_or_init(|| Mutex::new(None))
}

/// Parse `major.minor.patch`, tolerating a leading `v` and ignoring any
/// pre-release/build suffix. Returns None for unparseable input.
pub fn parse_version(s: &str) -> Option<[u64; 3]> {
    let s = s.trim().strip_prefix('v').unwrap_or(s.trim());
    let core = s.split(['-', '+']).next().unwrap_or(s);
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some([major, minor, patch])
}

/// Pure comparison: is `current` >= `minimum`? None when either is unparseable.
pub fn meets_minimum(current: &str, minimum: &str) -> Option<bool> {
    let c = parse_version(current)?;
    let m = parse_version(minimum)?;
    Some(c >= m)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VersionDeclaration {
    #[serde(default)]
    min_supported_version: Option<String>,
    #[serde(default)]
    latest_version: Option<String>,
    #[serde(default)]
    download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum VersionGate {
    /// This build meets the declared minimum.
    Current {
        update_available: bool,
        latest: Option<String>,
        download_url: Option<String>,
    },
    /// Below the declared minimum: the session must not start.
    Blocked {
        current: String,
        minimum: String,
        download_url: Option<String>,
    },
    /// The platform does not declare desktop versions (404 or no minimum
    /// field). Proceed, but say so.
    Unknown,
}

fn platform_base() -> String {
    std::env::var("FYDELL_PLATFORM_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .trim_end_matches('/')
        .to_string()
}

async fn fetch_gate() -> VersionGate {
    let url = format!("{}/api/desktop/version", platform_base());
    let res = match reqwest::Client::new()
        .get(&url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return VersionGate::Unknown,
    };
    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return VersionGate::Unknown;
    }
    let decl: VersionDeclaration = match res.json().await {
        Ok(d) => d,
        Err(_) => return VersionGate::Unknown,
    };
    let minimum = match decl.min_supported_version {
        Some(m) => m,
        None => return VersionGate::Unknown,
    };
    match meets_minimum(CURRENT, &minimum) {
        Some(true) => {
            let update_available = decl
                .latest_version
                .as_deref()
                .and_then(parse_version)
                .map(|l| l > parse_version(CURRENT).unwrap_or([0, 0, 0]))
                .unwrap_or(false);
            VersionGate::Current {
                update_available,
                latest: decl.latest_version,
                download_url: decl.download_url,
            }
        }
        // Unparseable minimum: fail open but visible (Unknown), never silently
        // block on a version string we cannot understand.
        Some(false) => VersionGate::Blocked {
            current: CURRENT.to_string(),
            minimum,
            download_url: decl.download_url,
        },
        None => VersionGate::Unknown,
    }
}

/// Check the gate, with a short cache so join → begin doesn't double-fetch.
pub async fn check_gate() -> VersionGate {
    {
        let c = cache().lock().unwrap();
        if let Some((at, gate)) = c.as_ref() {
            if at.elapsed() < CACHE_TTL {
                return gate.clone();
            }
        }
    }
    let gate = fetch_gate().await;
    *cache().lock().unwrap() = Some((Instant::now(), gate.clone()));
    gate
}

/// Enforce the gate: Err(VersionBlocked) when below the declared minimum.
pub async fn enforce_gate() -> AppResult<()> {
    match check_gate().await {
        VersionGate::Blocked { current, minimum, .. } => {
            Err(AppError::VersionBlocked { current, minimum })
        }
        _ => Ok(()),
    }
}

/// Tauri command: the current version gate state (for the UI).
#[tauri::command]
pub async fn check_client_version() -> AppResult<VersionGate> {
    Ok(check_gate().await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_versions() {
        assert_eq!(parse_version("0.1.0"), Some([0, 1, 0]));
        assert_eq!(parse_version("v1.2.3"), Some([1, 2, 3]));
        assert_eq!(parse_version("1.2.3-beta.1"), Some([1, 2, 3]));
        assert_eq!(parse_version("10.20.300"), Some([10, 20, 300]));
        assert_eq!(parse_version("1.2"), None);
        assert_eq!(parse_version("1.2.3.4"), None);
        assert_eq!(parse_version("abc"), None);
        assert_eq!(parse_version(""), None);
    }

    #[test]
    fn minimum_comparison() {
        assert_eq!(meets_minimum("0.2.0", "0.1.0"), Some(true));
        assert_eq!(meets_minimum("0.1.0", "0.1.0"), Some(true));
        assert_eq!(meets_minimum("0.1.0", "0.2.0"), Some(false));
        assert_eq!(meets_minimum("1.10.0", "1.9.9"), Some(true));
        assert_eq!(meets_minimum("bogus", "0.1.0"), None);
        assert_eq!(meets_minimum("0.1.0", "bogus"), None);
    }

    #[test]
    fn gate_serializes_with_kind_tag() {
        let g = VersionGate::Blocked {
            current: "0.1.0".to_string(),
            minimum: "0.2.0".to_string(),
            download_url: None,
        };
        let v = serde_json::to_value(&g).unwrap();
        assert_eq!(v["kind"], serde_json::Value::String("blocked".to_string()));
        assert_eq!(v["minimum"], serde_json::Value::String("0.2.0".to_string()));
    }
}
