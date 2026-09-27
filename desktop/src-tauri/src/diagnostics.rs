//! Scoped diagnostics for support (DESK-20).
//!
//! `diagnostics()` returns: the app version, the platform host, the session's
//! sync state, file/event counts, and recent error references. It never
//! includes tokens, file contents, or message bodies.
//!
//! Every command error flows through `From<AppError> for InvokeError`
//! (error.rs), which records code + message here. Messages are redacted
//! before storage.

use crate::error::AppResult;
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

const RING_CAP: usize = 25;

static ERRORS: OnceLock<Mutex<VecDeque<ErrorNote>>> = OnceLock::new();

fn errors() -> &'static Mutex<VecDeque<ErrorNote>> {
    ERRORS.get_or_init(|| Mutex::new(VecDeque::new()))
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorNote {
    pub ts: String,
    pub code: String,
    /// Stable support reference, e.g. "FYDELL-E1007".
    #[serde(rename = "ref")]
    pub error_ref: String,
    /// Redacted at record time.
    pub message: String,
}

/// Record a command error. Called from the `AppError → InvokeError`
/// conversion; the message is redacted before it is stored.
pub fn note_error(code: &str, message: &str) {
    let note = ErrorNote {
        ts: chrono::Utc::now().to_rfc3339(),
        code: code.to_string(),
        error_ref: ref_for_code(code).to_string(),
        message: redact(message),
    };
    let mut ring = errors().lock().unwrap();
    if ring.len() >= RING_CAP {
        ring.pop_front();
    }
    ring.push_back(note);
}

fn ref_for_code(code: &str) -> &'static str {
    match code {
        "no_session" => "FYDELL-E1001",
        "already_submitted" => "FYDELL-E1002",
        "path_escape" => "FYDELL-E1003",
        "integrity_error" => "FYDELL-E1004",
        "not_found" => "FYDELL-E1005",
        "revision_conflict" => "FYDELL-E1006",
        "platform_error" => "FYDELL-E1007",
        "auth_required" => "FYDELL-E1008",
        "execution_error" => "FYDELL-E1009",
        "io_error" => "FYDELL-E1010",
        "session_locked" => "FYDELL-E1011",
        "version_blocked" => "FYDELL-E1012",
        _ => "FYDELL-E1000",
    }
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/// Keys whose values must never appear in diagnostics. Matched
/// case-insensitively against JSON keys, `key=value` pairs, and query strings.
const SECRET_KEYS: &[&str] = &[
    "access_token",
    "refresh_token",
    "id_token",
    "authorization",
    "api_key",
    "apikey",
    "client_secret",
    "secret",
    "password",
    "passwd",
    "pwd",
    "private_key",
    "session_token",
    "cookie",
    "set-cookie",
];

/// Redact secret-looking values from a free-text message.
///
/// Handles three shapes:
/// - JSON: `"access_token": "abc"` → `"access_token": "[redacted]"`
/// - pairs: `access_token=abc`, `access_token: abc`, `?code=abc&...`
/// - bearer: `Bearer abc.def` → `Bearer [redacted]`
///
/// Pure function; unit-tested below.
pub fn redact(input: &str) -> String {
    let mut out = input.to_string();
    for key in SECRET_KEYS {
        out = redact_json_key(&out, key);
        out = redact_pair(&out, key);
    }
    out = redact_bearer(&out);
    out
}

fn redact_json_key(s: &str, key: &str) -> String {
    // `"key" : value` — replace the value with "[redacted]".
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    loop {
        let Some(pos) = find_key_ci(rest, key) else {
            out.push_str(rest);
            break;
        };
        // rest[..pos] is everything before the opening quote of the key.
        out.push_str(&rest[..pos]);
        let after_open = &rest[pos + 1..];
        // The key text itself ends at the next quote (we matched `"key"` so it exists).
        let key_len = match after_open.find('"') {
            Some(i) => i + 1, // include the closing quote
            None => {
                out.push_str(&rest[pos..]);
                break;
            }
        };
        let key_token = &rest[pos..pos + 1 + key_len]; // `"key"`
        let scan = &after_open[key_len..]; // starts right after the closing quote
        let b = scan.as_bytes();
        let mut i = 0;
        while i < b.len() && b[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= b.len() || b[i] != b':' {
            // Not actually a key/value pair (e.g. inside a string); emit the
            // key token and keep scanning after it.
            out.push_str(key_token);
            rest = scan;
            continue;
        }
        i += 1; // consume ':'
        while i < b.len() && b[i].is_ascii_whitespace() {
            i += 1;
        }
        let val_start = i;
        let val_end = if i < b.len() && b[i] == b'"' {
            i += 1;
            while i < b.len() && b[i] != b'"' {
                if b[i] == b'\\' {
                    i += 1;
                }
                i += 1;
            }
            (i + 1).min(b.len())
        } else {
            while i < b.len() && !matches!(b[i], b',' | b'}' | b']') && !b[i].is_ascii_whitespace()
            {
                i += 1;
            }
            i
        };
        out.push_str(key_token);
        out.push_str(&scan[..val_start]); // whitespace + colon + whitespace
        out.push_str("\"[redacted]\"");
        rest = &scan[val_end..];
    }
    out
}

/// Case-insensitive search for `"key"` (a JSON key) in `s`; returns the byte
/// index of the opening quote. Byte-wise with ASCII-only case folding so
/// indices stay valid for the original string.
fn find_key_ci(s: &str, key: &str) -> Option<usize> {
    let bytes = s.as_bytes();
    let key_b = key.as_bytes();
    if key_b.is_empty() || bytes.len() < key_b.len() + 2 {
        return None;
    }
    let mut i = 0;
    while i + key_b.len() + 2 <= bytes.len() {
        if bytes[i] == b'"'
            && bytes[i + 1..i + 1 + key_b.len()]
                .iter()
                .zip(key_b.iter())
                .all(|(a, b)| *a == *b || a.to_ascii_lowercase() == b.to_ascii_lowercase())
            && bytes[i + 1 + key_b.len()] == b'"'
        {
            return Some(i);
        }
        i += 1;
    }
    None
}

/// Redact `key=value`, `key: value`, and `?key=value&` shapes.
/// Byte-wise with ASCII-only case folding, so non-ASCII text passes through
/// untouched.
fn redact_pair(s: &str, key: &str) -> String {
    fn eq_ci(a: u8, b: u8) -> bool {
        a == b || a.to_ascii_lowercase() == b.to_ascii_lowercase()
    }
    let bytes = s.as_bytes();
    let key_b = key.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(s.len());
    let mut i = 0;
    while i < s.len() {
        let mut matched_len: Option<usize> = None;
        for sep in [b'=', b':'] {
            if i + key_b.len() < s.len()
                && bytes[i + key_b.len()] == sep
                && bytes[i..i + key_b.len()]
                    .iter()
                    .zip(key_b.iter())
                    .all(|(a, b)| eq_ci(*a, *b))
            {
                let prev_ok = i == 0 || {
                    let c = bytes[i - 1];
                    !(c.is_ascii_alphanumeric() || c == b'_' || c == b'-' || c == b'.')
                };
                if prev_ok {
                    matched_len = Some(key_b.len() + 1);
                    break;
                }
            }
        }
        if let Some(m) = matched_len {
            out.extend_from_slice(&bytes[i..i + m]);
            i += m;
            let quoted = i < s.len() && bytes[i] == b'"';
            if quoted {
                i += 1;
            }
            while i < s.len()
                && !matches!(
                    bytes[i],
                    b'&' | b';' | b'"' | b'\'' | b' ' | b'\t' | b'\n' | b'\r' | b',' | b'}'
                )
            {
                i += 1;
            }
            out.extend_from_slice(b"[redacted]");
            if quoted && i < s.len() && bytes[i] == b'"' {
                i += 1;
            }
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).unwrap_or_else(|_| s.to_string())
}

fn redact_bearer(s: &str) -> String {
    fn eq_ci(a: u8, b: u8) -> bool {
        a == b || a.to_ascii_lowercase() == b.to_ascii_lowercase()
    }
    let bytes = s.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(s.len());
    let mut i = 0;
    while i < s.len() {
        let is_bearer = s.len() - i >= 7
            && bytes[i..i + 6]
                .iter()
                .zip(b"bearer".iter())
                .all(|(a, b)| eq_ci(*a, *b))
            && bytes[i + 6] == b' ';
        if is_bearer {
            let prev_ok = i == 0 || !bytes[i - 1].is_ascii_alphanumeric();
            if prev_ok {
                out.extend_from_slice(&bytes[i..i + 7]);
                i += 7;
                while i < s.len() && !bytes[i].is_ascii_whitespace() {
                    i += 1;
                }
                out.extend_from_slice(b"[redacted]");
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| s.to_string())
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct SessionDiag {
    pub status: String,
    pub has_platform_session: bool,
    pub server_revision: u64,
    pub sync_phase: String,
    pub unsynced_files: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct Diagnostics {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    /// Host only — no paths, no query strings.
    pub platform_host: String,
    pub session: SessionDiag,
    pub file_count: usize,
    pub event_count: usize,
    pub recent_errors: Vec<ErrorNote>,
}

/// Tauri command: scoped diagnostics for support (DESK-20).
///
/// Contains the app version, platform host, session/sync state, counts, and
/// recent error references. Never contains tokens, file contents, message
/// bodies, or full URLs.
#[tauri::command]
pub fn diagnostics() -> AppResult<Diagnostics> {
    let platform_host = std::env::var("FYDELL_PLATFORM_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string())
        .trim_end_matches('/')
        .to_string();
    let platform_host = url::Url::parse(&platform_host)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()))
        .unwrap_or_else(|| "[unparseable]".to_string());

    let (status, has_platform_session, server_revision) = match crate::session::session_snapshot() {
        Some(s) => (
            format!("{:?}", s.status).to_lowercase(),
            s.platform_session_id.is_some(),
            s.server_revision,
        ),
        None => ("unknown".to_string(), false, 0),
    };
    let sync = crate::sync::current_phase_label();
    let unsynced_files = crate::sync::dirty_count();

    let (file_count, event_count) = match crate::session::workspace_dir() {
        Ok(dir) => {
            let files = walk_files(&dir).unwrap_or_default();
            let events = std::fs::read_to_string(dir.join(".fydell").join("events.jsonl"))
                .map(|c| c.lines().filter(|l| !l.trim().is_empty()).count())
                .unwrap_or(0);
            (files, events)
        }
        Err(_) => (0, 0),
    };

    Ok(Diagnostics {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        platform_host,
        session: SessionDiag {
            status,
            has_platform_session,
            server_revision,
            sync_phase: sync,
            unsynced_files,
        },
        file_count,
        event_count,
        recent_errors: errors().lock().unwrap().iter().cloned().collect(),
    })
}

fn walk_files(dir: &std::path::Path) -> Option<usize> {
    let mut n = 0;
    for entry in std::fs::read_dir(dir).ok()? {
        let p = entry.ok()?.path();
        if p.is_dir() {
            if p.file_name().and_then(|x| x.to_str()) == Some(".fydell") {
                continue;
            }
            n += walk_files(&p)?;
        } else {
            n += 1;
        }
    }
    Some(n)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_json_token_values() {
        let msg = r#"exchange failed: {"access_token": "abc123", "ok": false}"#;
        let out = redact(msg);
        assert!(!out.contains("abc123"), "token leaked: {out}");
        assert!(out.contains("[redacted]"), "no redaction marker: {out}");
        assert!(out.contains("\"ok\""), "unrelated key damaged: {out}");
    }

    #[test]
    fn redacts_pairs_and_bearer() {
        let msg = "POST failed refresh_token=xyz789 with Authorization: Bearer abc.def.ghi";
        let out = redact(msg);
        assert!(!out.contains("xyz789"), "refresh token leaked: {out}");
        assert!(!out.contains("abc.def.ghi"), "bearer leaked: {out}");
        assert!(
            out.contains("Bearer [redacted]"),
            "bearer marker wrong: {out}"
        );
    }

    #[test]
    fn redacts_case_insensitively() {
        let out = redact(r#"{"Access_Token": "sekret"}"#);
        assert!(!out.contains("sekret"), "leaked: {out}");
    }

    #[test]
    fn leaves_benign_text_alone() {
        let msg = "revision conflict: expected rev 3, server rev 5";
        assert_eq!(redact(msg), msg);
        let msg2 = "file src/main.py saved (42 bytes)";
        assert_eq!(redact(msg2), msg2);
    }

    #[test]
    fn redacts_password_in_query_string() {
        let out = redact("callback?code=abc&password=hunter2&state=x");
        assert!(!out.contains("hunter2"), "leaked: {out}");
        // The one-time code is not in SECRET_KEYS; it stays (it is single-use
        // and already consumed by the time an error is recorded).
        assert!(out.contains("code=abc"), "code wrongly redacted: {out}");
    }

    #[test]
    fn error_ring_is_capped() {
        let ring = errors();
        ring.lock().unwrap().clear();
        for i in 0..(RING_CAP + 5) {
            note_error("platform_error", &format!("boom {i}"));
        }
        let ring = ring.lock().unwrap();
        assert_eq!(ring.len(), RING_CAP);
        assert!(ring.iter().all(|n| n.error_ref == "FYDELL-E1007"));
    }

    #[test]
    fn note_error_redacts_before_storing() {
        let ring = errors();
        ring.lock().unwrap().clear();
        note_error(
            "auth_required",
            r#"refresh failed: {"refresh_token": "tok123"}"#,
        );
        let ring = ring.lock().unwrap();
        let last = ring.back().unwrap();
        assert!(!last.message.contains("tok123"), "leaked: {}", last.message);
        assert_eq!(last.error_ref, "FYDELL-E1008");
    }
}
