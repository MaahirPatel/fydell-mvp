//! Where the desktop app connects.
//!
//! Every build, debug included, defaults to the production platform, so no
//! copy a person can open sends them to a local server. `FYDELL_PLATFORM_URL`
//! (at runtime or at compile time) points it at a local or staging server.
//!
//! The public Supabase URL and anon key come from the platform
//! (`GET /api/desktop/config`) so no deployment detail is baked into the
//! installer. `FYDELL_SUPABASE_URL` + `FYDELL_SUPABASE_ANON_KEY` override it.

use std::sync::OnceLock;

use serde::Deserialize;

use crate::error::{AppError, AppResult};

const PLATFORM_URL: &str = "https://www.fydell.com";

pub fn platform_base() -> String {
    let raw = std::env::var("FYDELL_PLATFORM_URL")
        .ok()
        .filter(|v| !v.trim().is_empty())
        .or_else(|| option_env!("FYDELL_PLATFORM_URL").map(str::to_string))
        .unwrap_or_else(|| PLATFORM_URL.to_string());
    raw.trim().trim_end_matches('/').to_string()
}

#[derive(Debug, Clone)]
pub struct SupabasePublic {
    pub url: String,
    pub anon_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfigResponse {
    supabase_url: String,
    supabase_anon_key: String,
}

static SUPABASE: OnceLock<SupabasePublic> = OnceLock::new();

pub async fn supabase() -> AppResult<SupabasePublic> {
    if let Some(s) = SUPABASE.get() {
        return Ok(s.clone());
    }
    let loaded = load_supabase().await?;
    Ok(SUPABASE.get_or_init(|| loaded).clone())
}

async fn load_supabase() -> AppResult<SupabasePublic> {
    if let (Ok(url), Ok(anon_key)) = (
        std::env::var("FYDELL_SUPABASE_URL"),
        std::env::var("FYDELL_SUPABASE_ANON_KEY"),
    ) {
        if !url.trim().is_empty() && !anon_key.trim().is_empty() {
            return Ok(SupabasePublic {
                url: url.trim().trim_end_matches('/').to_string(),
                anon_key: anon_key.trim().to_string(),
            });
        }
    }
    let res = reqwest::Client::new()
        .get(format!("{}/api/desktop/config", platform_base()))
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| AppError::Platform(format!("could not reach Fydell: {e}")))?;
    if !res.status().is_success() {
        return Err(AppError::Platform(format!(
            "Fydell did not return the desktop configuration ({})",
            res.status()
        )));
    }
    let body: ConfigResponse = res
        .json()
        .await
        .map_err(|e| AppError::Platform(format!("bad desktop configuration response: {e}")))?;
    Ok(SupabasePublic {
        url: body.supabase_url.trim().trim_end_matches('/').to_string(),
        anon_key: body.supabase_anon_key.trim().to_string(),
    })
}
