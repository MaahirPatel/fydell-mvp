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
//! Native boundary (DESK-17): the renderer gets these plugin surfaces —
//! deep-link (auth callback only), opener (used from Rust, never exposed to
//! the renderer with renderer-chosen URLs), updater (checks one fixed
//! endpoint and only installs packages signed with the embedded public key),
//! process restart (after an update), and the core event/window permissions
//! declared in `capabilities/main.json`. There is
//! deliberately no shell/fs/dialog plugin: the renderer cannot execute local
//! commands or read arbitrary files; every file operation goes through the
//! validated workspace bridge (workspace.rs).

mod auth;
mod chat;
mod config;
mod diagnostics;
mod eng;
mod eng_authored;
mod eng_drafts;
mod eng_package;
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
    let builder = tauri::Builder::default()
        // Must be registered first: on Windows and Linux the auth deep link
        // launches a second process, and this forwards the URL to the running
        // window (whose pending sign-in state it must match) and exits.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init());
    // Microsoft Store packages are updated by the Store, whose policies forbid
    // an app replacing its own code.
    // Requires the `plugins.updater` block (pubkey + endpoints) in
    // tauri.conf.json; without it plugin init fails and the app exits before
    // any window opens.
    #[cfg(not(feature = "store"))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("app data dir must resolve");
            eng::init(&app_data, app.path().document_dir().ok());
            session::init(app_data);

            // fydell://auth/callback → auth::handle_callback_url.
            // Installers register the scheme from the `deep-link` config in
            // tauri.conf.json. A dev binary would take the handler away from
            // the installed app, so it registers only when asked to; without
            // that, pass the callback URL to a second launch of the binary
            // and single-instance forwards it here.
            #[cfg(all(debug_assertions, any(windows, target_os = "linux")))]
            if std::env::var("FYDELL_DEV_REGISTER_SCHEME").is_ok_and(|v| v == "1") {
                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("fydell: could not register the fydell:// scheme: {e}");
                }
            }
            // Automated dev checks drive the window over a debugging port; it
            // still renders off-screen but stays off the developer's desktop.
            #[cfg(debug_assertions)]
            if std::env::var("FYDELL_DEV_OFFSCREEN").is_ok_and(|v| v == "1") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.set_skip_taskbar(true);
                    let _ = w.set_position(tauri::PhysicalPosition::new(-32000, -32000));
                }
            }
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
            eng::eng_list_tasks,
            eng::eng_accept_invitation,
            eng::eng_open_attempt,
            eng::eng_record_consent,
            eng::eng_prepare_workspace,
            eng::eng_confirm_setup,
            eng::eng_start,
            eng::eng_send_message,
            eng::eng_acknowledge_update,
            eng::eng_save_draft,
            eng_drafts::eng_drafts_local,
            eng_drafts::eng_draft_store,
            eng::eng_package_preview,
            eng::eng_upload_package,
            eng::eng_submit,
            eng::eng_get_report,
            eng::eng_open_workspace,
            eng_authored::eng_authored_view,
            eng_authored::eng_authored_action,
            eng_authored::eng_authored_prepare,
            eng_authored::eng_authored_local,
            eng_authored::eng_authored_run_tests,
            eng_authored::eng_authored_team,
            eng_authored::eng_authored_collaboration,
            eng_authored::eng_authored_submit,
            eng_authored::eng_authored_report,
            eng_authored::eng_authored_files_status,
            eng_authored::eng_authored_sync_files,
            eng_authored::eng_authored_resolve_files,
            eng_authored::eng_authored_outbox,
            eng_authored::eng_authored_save_handoff,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fydell desktop");
}
