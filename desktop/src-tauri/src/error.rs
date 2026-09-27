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
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    expected_rev: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actual_rev: Option<u64>,
}

// Tauri converts Result<T, AppError> via this impl.
impl From<AppError> for tauri::ipc::InvokeError {
    fn from(e: AppError) -> Self {
        let (code, expected_rev, actual_rev) = match &e {
            AppError::NoSession => ("no_session", None, None),
            AppError::AlreadySubmitted => ("already_submitted", None, None),
            AppError::PathEscape => ("path_escape", None, None),
            AppError::Integrity(_) => ("integrity_error", None, None),
            AppError::NotFound(_) => ("not_found", None, None),
            AppError::RevisionConflict { expected, actual } => {
                ("revision_conflict", Some(*expected), Some(*actual))
            }
            AppError::Platform(_) => ("platform_error", None, None),
            AppError::Auth(_) => ("auth_required", None, None),
            AppError::Execution(_) => ("execution_error", None, None),
            AppError::Io(_) => ("io_error", None, None),
        };
        // InvokeError is a plain tuple struct over a JSON value.
        tauri::ipc::InvokeError(
            serde_json::to_value(&ErrorBody {
                code,
                message: e.to_string(),
                expected_rev,
                actual_rev,
            })
            .unwrap_or(serde_json::Value::Null),
        )
    }
}

pub type AppResult<T> = Result<T, AppError>;
