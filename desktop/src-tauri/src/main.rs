// Release builds on Windows must not open a console window beside the app.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
//!
//! Native boundary (DESK-17): the renderer gets exactly three plugin
//! surfaces — deep-link (auth callback only), opener (used from Rust, never
//! exposed to the renderer with renderer-chosen URLs), and the core
//! event/window permissions declared in `capabilities/main.json`. There is
//! deliberately no shell/fs/dialog plugin: the renderer cannot execute local
//! commands or read arbitrary files; every file operation goes through the
//! validated workspace bridge (workspace.rs).

mod auth;
mod chat;
mod diagnostics;
mod error;
mod events;
mod execution;
mod inbox;
mod passport;
mod platform;
mod recovery;
mod session;
mod submission;
mod sync;
mod version;
mod workspace;

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        // The updater plugin must not be registered until tauri.conf.json has
        // a complete `plugins.updater` block (pubkey + endpoints): without it
        // plugin init fails at launch and the app exits before any window.
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
            inbox::list_invitations,
            inbox::accept_invitation_by_id,
            chat::list_messages,
            chat::list_stakeholders,
            chat::send_message,
            passport::get_passport,
            passport::add_project,
            passport::remove_project,
            passport::get_profile,
            passport::update_profile,
            session::join_session,
            session::accept_consent,
            session::begin_session,
            session::session_status,
            session::sync_state,
            recovery::recovery_status,
            sync::sync_status,
            sync::sync_now,
            sync::resolve_sync_conflict,
            version::check_client_version,
            diagnostics::diagnostics,
            workspace::list_files,
            workspace::read_file,
            workspace::write_file,
            execution::run_tests,
            execution::workspace_fingerprint,
            events::append_event,
            events::get_events,
            submission::submit,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fydell desktop");
}
