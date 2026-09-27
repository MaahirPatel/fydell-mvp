//! Fydell desktop simulation client.
//!
//! Candidates complete hiring simulations locally. The app is a client of the
//! Fydell platform (Next.js API): it downloads a scenario package with an
//! invite code, runs the workspace and test execution locally, keeps a
//! session-scoped evidence log, and uploads a snapshot + SHA-256 receipt on
//! submit. See `desktop/ARCHITECTURE.md`.
//!
//! Privacy: nothing is recorded outside an active simulation session. No
//! keystroke logging, no screen capture, no process monitoring.

mod error;
mod events;
mod execution;
mod platform;
mod session;
mod submission;
mod workspace;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("app data dir must resolve");
            session::init(app_data);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            session::join_session,
            session::session_status,
            workspace::list_files,
            workspace::read_file,
            workspace::write_file,
            execution::run_tests,
            events::append_event,
            events::get_events,
            submission::submit,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fydell desktop");
}
