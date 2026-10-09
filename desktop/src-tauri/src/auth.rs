//! Candidate authentication: Supabase session via the system browser.
//!
//! Flow (checklist DESK-04 — system browser, no secrets in URLs or logs):
//!
//! 1. `auth_sign_in` generates a random `state` and a PKCE verifier, stores
//!    both, and opens the system browser to
//!    `{platform}/login?desktop=1&state={state}&code_challenge={S256}&code_challenge_method=S256`.
//! 2. The web app signs the candidate in, then redirects to
//!    `fydell://auth/callback?code=<one-time-code>&state=<state>`
//!    (web addition W1 — see desktop/ARCHITECTURE.md).
//! 3. The deep-link handler (main.rs) forwards the URL to
//!    `handle_callback_url`, which validates `state`, exchanges the code plus
//!    the PKCE verifier for a Supabase session, and stores the tokens in the
//!    OS keychain. Another app that intercepts the deep link cannot redeem
//!    the code without the verifier.
//! 4. Every platform request attaches the session (see `auth_headers`).
//!
//! Why this shape: the platform session routes authenticate via
//! `requireUser()` (src/lib/simulations/auth.ts), which reads the Supabase
//! session from cookies. The desktop therefore keeps a real Supabase session
//! (access + refresh token) and presents it the way the web app expects.
//! Token refresh goes directly to Supabase Auth REST (public anon key); no
//! web changes needed for that part.

use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use url::Url;

static AUTH: OnceLock<Mutex<AuthState>> = OnceLock::new();

fn auth() -> &'static Mutex<AuthState> {
    AUTH.get_or_init(|| {
        Mutex::new(AuthState {
            session: load_keychain_session(),
            pending_state: None,
            pending_verifier: None,
        })
    })
}

const KEYRING_SERVICE: &str = "ai.fydell.desktop";
const KEYRING_ACCOUNT: &str = "supabase-session";
/// Refresh slightly before expiry so a request never races the clock.
const REFRESH_SKEW_SECS: i64 = 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredSession {
    access_token: String,
    refresh_token: String,
    /// Unix seconds.
    expires_at: i64,
    email: String,
    user_id: String,
}

struct AuthState {
    session: Option<StoredSession>,
    pending_state: Option<String>,
    /// PKCE (RFC 7636) verifier for the pending sign-in; only its S256
    /// challenge leaves the process before the exchange.
    pending_verifier: Option<String>,
}

/// What the frontend may see. Raw tokens never cross the IPC boundary.
#[derive(Debug, Clone, Serialize)]
pub struct SessionSummary {
    pub signed_in: bool,
    pub email: Option<String>,
    /// Unix seconds, if known.
    pub expires_at: Option<i64>,
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

use crate::config::platform_base;

// ---------------------------------------------------------------------------
// Keychain persistence (best-effort: memory always works, keychain may not
// exist on headless CI — the app still functions for the process lifetime).
// ---------------------------------------------------------------------------

fn load_keychain_session() -> Option<StoredSession> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).ok()?;
    let raw = entry.get_password().ok()?;
    serde_json::from_str(&raw).ok()
}

fn save_keychain_session(s: &StoredSession) {
    let raw = match serde_json::to_string(s) {
        Ok(r) => r,
        Err(_) => return,
    };
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT) {
        let _ = entry.set_password(&raw);
    }
}

fn clear_keychain_session() {
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT) {
        let _ = entry.delete_credential();
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Start sign-in: open the system browser to the web app's login page with a
/// `desktop=1` hint and a random `state` that binds the callback to this
/// attempt (DESK-04). The frontend should show a "waiting for browser" state
/// and listen for the `auth-changed` event.
#[tauri::command]
pub fn auth_sign_in(app: AppHandle) -> AppResult<()> {
    use tauri_plugin_opener::OpenerExt;

    let state = uuid::Uuid::new_v4().to_string();
    let verifier = pkce_verifier();
    let challenge = pkce_challenge(&verifier);
    {
        let mut a = auth().lock().unwrap();
        if a.session.is_some() {
            return Err(AppError::Auth("already signed in".to_string()));
        }
        a.pending_state = Some(state.clone());
        a.pending_verifier = Some(verifier);
    }
    let url = format!(
        "{}/login?desktop=1&state={}&code_challenge={}&code_challenge_method=S256",
        platform_base(),
        urlencoding_safe(&state),
        challenge
    );
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| AppError::Execution(format!("could not open system browser: {e}")))?;
    Ok(())
}

/// Current sign-in state (safe for the UI; no tokens).
#[tauri::command]
pub fn auth_session() -> AppResult<SessionSummary> {
    let a = auth().lock().unwrap();
    Ok(match &a.session {
        Some(s) => SessionSummary {
            signed_in: true,
            email: Some(s.email.clone()),
            expires_at: Some(s.expires_at),
        },
        None => SessionSummary {
            signed_in: false,
            email: None,
            expires_at: None,
        },
    })
}

/// Sign out: drop the session from memory and the OS keychain.
#[tauri::command]
pub fn auth_sign_out(app: AppHandle) -> AppResult<()> {
    {
        let mut a = auth().lock().unwrap();
        a.session = None;
        a.pending_state = None;
        a.pending_verifier = None;
    }
    clear_keychain_session();
    let _ = app.emit(
        "auth-changed",
        SessionSummary {
            signed_in: false,
            email: None,
            expires_at: None,
        },
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Deep-link callback (called from main.rs)
// ---------------------------------------------------------------------------

/// Handle `fydell://auth/callback?code=...&state=...`.
/// Validates `state` against the pending sign-in, then exchanges the
/// single-use code for a Supabase session in the background and emits
/// `auth-changed` (or `auth-error`) to the frontend.
pub fn handle_callback_url(app: &AppHandle, raw: &str) {
    let parsed = match Url::parse(raw) {
        Ok(u) => u,
        Err(_) => {
            emit_auth_error(app, "malformed auth callback URL");
            return;
        }
    };
    if parsed.scheme() != "fydell"
        || parsed.host_str() != Some("auth")
        || parsed.path() != "/callback"
    {
        emit_auth_error(app, "unexpected auth callback URL");
        return;
    }
    let query: std::collections::HashMap<String, String> =
        parsed.query_pairs().into_owned().collect();
    let (code, state) = match (query.get("code"), query.get("state")) {
        (Some(c), Some(s)) => (c.clone(), s.clone()),
        _ => {
            emit_auth_error(app, "auth callback missing code or state");
            return;
        }
    };
    let (expected, verifier) = {
        let mut a = auth().lock().unwrap();
        (a.pending_state.take(), a.pending_verifier.take())
    };
    let verifier = match (expected, verifier) {
        (Some(e), Some(v)) if constant_time_eq(&e, &state) => v,
        _ => {
            emit_auth_error(app, "auth callback state mismatch; sign-in attempt expired");
            return;
        }
    };

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        match exchange_code(&code, &state, &verifier).await {
            Ok(session) => {
                {
                    let mut a = auth().lock().unwrap();
                    a.session = Some(session.clone());
                }
                save_keychain_session(&session);
                let _ = handle.emit(
                    "auth-changed",
                    SessionSummary {
                        signed_in: true,
                        email: Some(session.email.clone()),
                        expires_at: Some(session.expires_at),
                    },
                );
            }
            Err(e) => emit_auth_error(&handle, &e.to_string()),
        }
    });
}

fn emit_auth_error(app: &AppHandle, msg: &str) {
    let _ = app.emit("auth-error", serde_json::json!({ "message": msg }));
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.bytes()
        .zip(b.bytes())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

#[derive(Deserialize)]
struct ExchangeResponse {
    access_token: String,
    refresh_token: String,
    /// Unix seconds.
    expires_at: i64,
    user: ExchangeUser,
}

#[derive(Deserialize)]
struct ExchangeUser {
    id: String,
    email: Option<String>,
}

/// Trade the one-time code for a Supabase session.
///
/// CONTRACT (web addition W1, documented in desktop/ARCHITECTURE.md):
///   POST {platform}/api/auth/desktop/exchange
///     { "code": "<one-time>", "state": "<state>", "code_verifier": "<pkce>" }
///   → 200 { access_token, refresh_token, expires_at, user: { id, email } }
async fn exchange_code(code: &str, state: &str, verifier: &str) -> AppResult<StoredSession> {
    let url = format!("{}/api/auth/desktop/exchange", platform_base());
    let res = reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({ "code": code, "state": state, "code_verifier": verifier }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("token exchange failed: {e}")))?;
    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::Auth(
            "the web app does not provide the desktop auth callback yet (see ARCHITECTURE.md W1)"
                .to_string(),
        ));
    }
    if !res.status().is_success() {
        return Err(AppError::Auth(format!(
            "token exchange rejected ({})",
            res.status()
        )));
    }
    let body: ExchangeResponse = res
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("bad token exchange response: {e}")))?;
    Ok(StoredSession {
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_at: body.expires_at,
        email: body.user.email.unwrap_or_default(),
        user_id: body.user.id,
    })
}

// ---------------------------------------------------------------------------
// Internal: tokens for platform requests
// ---------------------------------------------------------------------------

/// A valid access token, refreshing via Supabase Auth REST when needed.
/// Refresh needs no web changes: it goes directly to the Supabase project
/// with the public anon key.
pub(crate) async fn access_token() -> AppResult<String> {
    let current = { auth().lock().unwrap().session.clone() };
    let session = current.ok_or_else(|| AppError::Auth("not signed in".to_string()))?;
    if session.expires_at - REFRESH_SKEW_SECS > now_secs() {
        return Ok(session.access_token);
    }
    refresh_session(&session).await.map(|s| s.access_token)
}

#[derive(Deserialize)]
struct RefreshResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
    user: RefreshUser,
}

#[derive(Deserialize)]
struct RefreshUser {
    id: String,
    email: Option<String>,
}

async fn refresh_session(session: &StoredSession) -> AppResult<StoredSession> {
    let supa = crate::config::supabase().await?;
    let url = format!("{}/auth/v1/token?grant_type=refresh_token", supa.url);
    let res = reqwest::Client::new()
        .post(&url)
        .header("apikey", supa.anon_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "refresh_token": session.refresh_token }))
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| AppError::Auth(format!("session refresh failed: {e}")))?;
    if !res.status().is_success() {
        // Refresh token rejected: the session is dead; drop it.
        {
            let mut a = auth().lock().unwrap();
            a.session = None;
        }
        clear_keychain_session();
        return Err(AppError::Auth(
            "session expired; please sign in again".to_string(),
        ));
    }
    let body: RefreshResponse = res
        .json()
        .await
        .map_err(|e| AppError::Auth(format!("bad refresh response: {e}")))?;
    let refreshed = StoredSession {
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_at: now_secs() + body.expires_in,
        email: body.user.email.unwrap_or_else(|| session.email.clone()),
        user_id: body.user.id,
    };
    {
        let mut a = auth().lock().unwrap();
        a.session = Some(refreshed.clone());
    }
    save_keychain_session(&refreshed);
    Ok(refreshed)
}

/// Build the auth material for one platform request:
/// `(cookie_header_value, bearer_token)`.
///
/// The platform's `requireUser()` (src/lib/simulations/auth.ts) reads the
/// Supabase session from **cookies** via @supabase/ssr, so the desktop sets
/// the same cookie the web client would. Format verified against the
/// `@supabase/ssr@0.12.0` sources actually used by the web app
/// (createServerClient defaults: storage key `sb-<project-ref>-auth-token`,
/// `cookieEncoding: "base64url"` → value `base64-` + base64url(JSON session),
/// chunked at 3180 chars into `<key>.0`, `<key>.1`, …).
/// If the web app upgrades @supabase/ssr, re-verify this format.
///
/// The Bearer token is sent as well for forward compatibility: it requires
/// web addition W2 (accept `Authorization: Bearer` in `requireUser()`).
pub(crate) async fn auth_headers() -> AppResult<(String, String)> {
    let token = access_token().await?;
    let session = { auth().lock().unwrap().session.clone() }
        .ok_or_else(|| AppError::Auth("not signed in".to_string()))?;

    let supa = crate::config::supabase().await?.url;
    let project_ref = Url::parse(&supa)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()))
        .and_then(|h| h.split('.').next().map(|s| s.to_string()))
        .ok_or_else(|| {
            AppError::Auth(
                "cannot derive Supabase project ref from FYDELL_SUPABASE_URL".to_string(),
            )
        })?;
    let key = format!("sb-{}-auth-token", project_ref);

    // Session payload as auth-js would store it: JSON, base64url, "base64-" prefix.
    let payload = serde_json::json!({
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "user": { "id": session.user_id, "email": session.email },
    });
    let json = serde_json::to_string(&payload)
        .map_err(|e| AppError::Auth(format!("cannot serialize session: {e}")))?;
    let encoded = format!("base64-{}", base64_url_encode(json.as_bytes()));

    // Chunk like @supabase/ssr's createChunks (MAX_CHUNK_SIZE = 3180):
    // single cookie when it fits, otherwise <key>.0, <key>.1, …
    const MAX_CHUNK_SIZE: usize = 3180;
    let uri_encoded_len = url_encode_len(&encoded);
    let cookie = if uri_encoded_len <= MAX_CHUNK_SIZE {
        format!("{}={}", key, encoded)
    } else {
        // Split on encodeURIComponent boundaries the way the library does:
        // it chunks the *encoded* string and decodes each piece back.
        let mut parts = Vec::new();
        let mut rest = encoded.as_str();
        let mut idx = 0;
        while !rest.is_empty() {
            let mut take = MAX_CHUNK_SIZE.min(rest.len());
            // Don't split a %XX escape: back off to before the '%'.
            if take < rest.len() {
                if let Some(pos) = rest[..take].rfind('%') {
                    if pos + 3 > take {
                        take = pos;
                    }
                }
            }
            let (head, tail) = rest.split_at(take);
            parts.push(format!("{}.{}={}", key, idx, head));
            idx += 1;
            rest = tail;
        }
        parts.join("; ")
    };

    Ok((cookie, format!("Bearer {}", token)))
}

fn base64_url_encode(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let mut n: u32 = 0;
        for (i, b) in chunk.iter().enumerate() {
            n |= (*b as u32) << (16 - 8 * i);
        }
        let pad = 3 - chunk.len();
        // base64url omits padding entirely.
        for i in 0..(4 - pad) {
            out.push(ALPHABET[((n >> (18 - 6 * i)) & 63) as usize] as char);
        }
    }
    out
}

/// Length of `encodeURIComponent(s)` without allocating the encoded string.
fn url_encode_len(s: &str) -> usize {
    s.bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
                1
            } else {
                3
            }
        })
        .sum()
}

fn urlencoding_safe(s: &str) -> String {
    // `state` is a UUID (hex + dashes), safe unencoded; keep the helper
    // explicit so a future non-UUID state doesn't silently break.
    s.to_string()
}

/// 64 hex chars from two v4 UUIDs (244 random bits), inside RFC 7636's
/// 43-128 unreserved-character range.
fn pkce_verifier() -> String {
    let a = uuid::Uuid::new_v4();
    let b = uuid::Uuid::new_v4();
    format!("{}{}", hex::encode(a.as_bytes()), hex::encode(b.as_bytes()))
}

/// S256 challenge: unpadded base64url of SHA-256(verifier).
fn pkce_challenge(verifier: &str) -> String {
    use sha2::{Digest, Sha256};
    base64url_nopad(&Sha256::digest(verifier.as_bytes()))
}

fn base64url_nopad(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::with_capacity((bytes.len() * 4).div_ceil(3));
    for chunk in bytes.chunks(3) {
        let n = (u32::from(chunk[0]) << 16)
            | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8)
            | u32::from(*chunk.get(2).unwrap_or(&0));
        let sextets = chunk.len() + 1;
        for i in 0..sextets {
            out.push(ALPHABET[((n >> (18 - 6 * i)) & 63) as usize] as char);
        }
    }
    out
}

#[cfg(test)]
mod pkce_tests {
    use super::*;

    #[test]
    fn rfc7636_appendix_b_vector() {
        assert_eq!(
            pkce_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn verifier_is_valid_and_unique() {
        let v = pkce_verifier();
        assert_eq!(v.len(), 64);
        assert!(v.chars().all(|c| c.is_ascii_hexdigit()));
        assert_ne!(v, pkce_verifier());
        assert_eq!(pkce_challenge(&v).len(), 43);
    }

    #[test]
    fn base64url_partial_chunks() {
        assert_eq!(base64url_nopad(b"f"), "Zg");
        assert_eq!(base64url_nopad(b"fo"), "Zm8");
        assert_eq!(base64url_nopad(b"foo"), "Zm9v");
        assert_eq!(base64url_nopad(&[0xfb, 0xff]), "-_8");
    }
}
