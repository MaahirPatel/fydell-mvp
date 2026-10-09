//! Candidate passport (profile) commands.
//!
//! Backed by the existing candidate-scoped passport API
//! (`src/app/api/passport/*`): the export route for viewing, the projects
//! route for adding/removing GitHub repositories. The desktop adds no
//! passport logic of its own; it renders what the platform returns.

use crate::error::{AppError, AppResult};
use crate::platform::{EngineerProfileView, PassportView, Platform};

/// Load the candidate's engineering profile (identity fields).
/// `Ok(None)` means no profile exists yet — the UI shows first-run onboarding.
#[tauri::command]
pub async fn get_profile() -> AppResult<Option<EngineerProfileView>> {
    crate::auth::require_signed_in("sign in first, then open your profile").await?;
    Platform::new().get_profile().await
}

/// Save the candidate's engineering profile identity.
/// Display name is required; headline and role may be empty.
#[tauri::command]
pub async fn update_profile(
    display_name: String,
    headline: String,
    role: String,
) -> AppResult<EngineerProfileView> {
    crate::auth::require_signed_in("sign in first, then edit your profile").await?;
    let display_name = display_name.trim();
    if display_name.is_empty() {
        return Err(AppError::Execution(
            "enter the name employers should see".to_string(),
        ));
    }
    if display_name.len() > 80 {
        return Err(AppError::Execution(
            "keep your display name under 80 characters".to_string(),
        ));
    }
    Platform::new()
        .update_profile(display_name, headline.trim(), role.trim())
        .await
}

/// Load the candidate's passport. `Ok(None)` means no passport exists yet —
/// the UI shows the empty state (add your first repository), not an error.
#[tauri::command]
pub async fn get_passport() -> AppResult<Option<PassportView>> {
    crate::auth::require_signed_in("sign in first, then open your profile").await?;
    Platform::new().get_passport().await
}

/// Analyze a GitHub repository and add it to the passport, with the
/// candidate's own contribution note. Returns the platform's `{ result,
/// passport }` payload verbatim so the UI can explain analysis outcomes
/// (including `result.status === "failed"`).
#[tauri::command]
pub async fn add_project(
    repository: String,
    contribution: String,
    github_login: Option<String>,
) -> AppResult<serde_json::Value> {
    crate::auth::require_signed_in("sign in first, then add a project").await?;
    let repository = repository.trim();
    if repository.is_empty() {
        return Err(AppError::Execution(
            "enter a repository as owner/name".to_string(),
        ));
    }
    // Mirror the server's accepted shape (owner/name); the server validates
    // strictly and returns 400 otherwise.
    if !is_repo_shape(repository) {
        return Err(AppError::Execution(
            "choose a repository as owner/name".to_string(),
        ));
    }
    Platform::new()
        .add_project(repository, contribution.trim(), github_login.as_deref())
        .await
}

/// Remove a project from the passport. Returns `{ passport, explanation }`.
#[tauri::command]
pub async fn remove_project(repo: String) -> AppResult<serde_json::Value> {
    crate::auth::require_signed_in("sign in first, then edit your profile").await?;
    let repo = repo.trim();
    if !is_repo_shape(repo) {
        return Err(AppError::Execution("unknown project".to_string()));
    }
    Platform::new().remove_project(repo).await
}

/// `owner/name` shape check, mirroring the server's 400 rule. Pure helper,
/// unit-tested.
fn is_repo_shape(s: &str) -> bool {
    let mut parts = s.split('/');
    match (parts.next(), parts.next(), parts.next()) {
        (Some(owner), Some(name), None) => {
            !owner.is_empty()
                && !name.is_empty()
                && owner.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
                && name
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_owner_slash_name() {
        assert!(is_repo_shape("octocat/hello-world"));
        assert!(is_repo_shape("my-org/my.repo_v2"));
        assert!(is_repo_shape("a/b"));
    }

    #[test]
    fn rejects_bad_shapes() {
        assert!(!is_repo_shape(""));
        assert!(!is_repo_shape("justname"));
        assert!(!is_repo_shape("a/b/c"));
        assert!(!is_repo_shape("/b"));
        assert!(!is_repo_shape("a/"));
        assert!(!is_repo_shape("a b/c"));
        assert!(!is_repo_shape("a/b c"));
    }
}
