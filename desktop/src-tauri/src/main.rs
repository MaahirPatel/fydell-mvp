//! Fydell desktop simulation client.
//!
//! Candidates complete hiring simulations locally. The app is a client of the
//! Fydell platform's session API (`src/app/api/sim/*` in this repo):
//! sign in via the system browser (Supabase session in the OS keychain),
//! join an assignment with an invite code, work locally with revision-checked
//! file I/O and bounded local test runs, keep a session-scoped evidence log
//! (mirrored to the platform's event whitelist), and submit through the real
//! platform submit route. See `desktop/ARCHITECTURE.md`.
//!
//! Privacy: nothing is recorded outside an active simulation session. No
//! keystroke logging, no screen capture, no process monitoring.

mod auth;
mod error;
mod events;
mod execution;
mod platform;
mod session;
mod submission;
mod workspace;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("app data dir must resolve");
            session::init(app_data);

            // fydell://auth/callback → auth::handle_callback_url.
            // The scheme is registered per-OS at bundle time via the
            // `deep-link` plugin config in tauri.conf.json.
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    auth::handle_callback_url(&handle, url.as_str());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::auth_sign_in,
            auth::auth_sign_out,
            auth::auth_session,
            session::join_session,
            session::accept_consent,
            session::begin_session,
            session::session_status,
            session::sync_state,
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
