//! Shared error type, serialized back to the frontend.

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("no active session")]
    NoSession,
    #[error("session already submitted")]
    AlreadySubmitted,
    #[error("path escapes the workspace")]
    PathEscape,
    #[error("assignment integrity check failed: {0}")]
    Integrity(String),
    #[error("file not found: {0}")]
    NotFound(String),
    #[error("revision conflict: expected rev {expected}, server rev {actual}")]
    RevisionConflict { expected: u64, actual: u64 },
    #[error("platform error: {0}")]
    Platform(String),
    #[error("authentication required: {0}")]
    Auth(String),
    #[error("execution error: {0}")]
    Execution(String),
    #[error("io error: {0}")]
    Io(String),
    /// DESK-11: a second writer holds this session's workspace on this machine.
    #[error("this assignment is already open in another Fydell window on this computer (process {0}); close it there first")]
    SessionLocked(u32),
    /// DESK-19: the server declares a minimum client version above this build.
    #[error("this app version ({current}) is below the minimum supported by the platform ({minimum}); update Fydell to continue")]
    VersionBlocked { current: String, minimum: String },
}

impl AppError {
    /// Machine-readable code, stable across releases.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::NoSession => "no_session",
            AppError::AlreadySubmitted => "already_submitted",
            AppError::PathEscape => "path_escape",
            AppError::Integrity(_) => "integrity_error",
            AppError::NotFound(_) => "not_found",
            AppError::RevisionConflict { .. } => "revision_conflict",
            AppError::Platform(_) => "platform_error",
            AppError::Auth(_) => "auth_required",
            AppError::Execution(_) => "execution_error",
            AppError::Io(_) => "io_error",
            AppError::SessionLocked(_) => "session_locked",
            AppError::VersionBlocked { .. } => "version_blocked",
        }
    }

    /// Stable error reference for support (DESK-20). The numeric part is
    /// append-only: never reuse a number for a different error.
    pub fn error_ref(&self) -> &'static str {
        match self {
            AppError::NoSession => "FYDELL-E1001",
            AppError::AlreadySubmitted => "FYDELL-E1002",
            AppError::PathEscape => "FYDELL-E1003",
            AppError::Integrity(_) => "FYDELL-E1004",
            AppError::NotFound(_) => "FYDELL-E1005",
            AppError::RevisionConflict { .. } => "FYDELL-E1006",
            AppError::Platform(_) => "FYDELL-E1007",
            AppError::Auth(_) => "FYDELL-E1008",
            AppError::Execution(_) => "FYDELL-E1009",
            AppError::Io(_) => "FYDELL-E1010",
            AppError::SessionLocked(_) => "FYDELL-E1011",
            AppError::VersionBlocked { .. } => "FYDELL-E1012",
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::Platform(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

#[derive(Serialize)]
struct ErrorBody {
    code: &'static str,
    /// Stable support reference, e.g. "FYDELL-E1007" (DESK-20).
    #[serde(rename = "ref")]
    error_ref: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_rev: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actual_rev: Option<u64>,
}

// Tauri converts Result<T, AppError> via this impl. This is the single choke
// point for every command error, so it also feeds the diagnostics ring
// (DESK-20): code + redacted message, never tokens or file contents.
impl From<AppError> for tauri::ipc::InvokeError {
    fn from(e: AppError) -> Self {
        crate::diagnostics::note_error(e.code(), &e.to_string());
        let (expected_rev, actual_rev) = match &e {
            AppError::NoSession
            | AppError::AlreadySubmitted
            | AppError::PathEscape
            | AppError::Integrity(_)
            | AppError::NotFound(_)
            | AppError::Platform(_)
            | AppError::Auth(_)
            | AppError::Execution(_)
            | AppError::Io(_)
            | AppError::SessionLocked(_)
            | AppError::VersionBlocked { .. } => (None, None),
            AppError::RevisionConflict { expected, actual } => (Some(*expected), Some(*actual)),
        };
        // InvokeError is a plain tuple struct over a JSON value.
        tauri::ipc::InvokeError(
            serde_json::to_value(&ErrorBody {
                code: e.code(),
                error_ref: e.error_ref(),
                message: e.to_string(),
                expected_rev,
                actual_rev,
            })
            .unwrap_or(serde_json::Value::Null),
        )
    }
}

pub type AppResult<T> = Result<T, AppError>;
