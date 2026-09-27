# Fydell Desktop — Architecture

**Status:** draft (2026-09-27). V1 scope: a desktop simulation client for candidates.
No workplace surveillance — the app runs hiring simulations, nothing else.

## 1. What it is

A Tauri v2 desktop app (Rust backend + web frontend) that is a **client of the
Fydell platform** (the Next.js app in this repo). Flow:

```
Employer creates hiring task (web) → candidate gets invite code
  → candidate opens desktop app → enters invite code
  → app downloads scenario package from platform API
  → candidate works locally (editor, files, local test runs)
  → app records a session-scoped evidence log
  → candidate submits → app packages snapshot + SHA-256 receipt → uploads
  → platform grades, employer reviews evidence (web)
```

The desktop app never talks to Supabase directly. All platform I/O goes through
the Next.js API routes listed in §5.

## 2. Why desktop (and why Tauri)

- **Integrity of the simulation.** A controlled local environment is the only
  way "proof of work" survives AI assistants in the next tab. (V1: honest
  disclosure of what's enforced; lockdown phases later — see §7.)
- **Local execution.** Candidate code runs on the candidate's own machine.
  Threat model is inverted vs server execution: no need for gVisor/Docker —
  the candidate already controls the host. What we need is *bounded*
  execution (timeouts, output caps, CPU/memory limits) so a bad submission
  can't hang or harm the session, plus a faithful record of what ran.
- **Tauri v2** because it is light (system webview), its Rust core is good at
  process control, and it hosts the same web UI we ship on the web — one
  frontend codebase, two shells.

## 3. Layout

```
desktop/
  ARCHITECTURE.md            # this file
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/main.rs              # app setup, command registration
    src/session.rs           # session state machine (idle → active → submitted)
    src/workspace.rs         # Tauri commands: list/read/write files (scoped)
    src/execution.rs         # Tauri commands: run tests locally, bounded
    src/events.rs            # append-only session event log (JSONL)
    src/submission.rs        # snapshot + SHA-256 receipt + upload
    src/platform.rs          # HTTPS client for the platform API (§5)
  src/                       # frontend (Vite + React + TypeScript)
    App.tsx                  # screens: invite → consent → workspace → submit
    components/
      FileTree.tsx
      EditorPane.tsx         # @monaco-editor/react
      BriefPanel.tsx
      TestsPanel.tsx
      TeamPanel.tsx          # simulated teammates (scenario-defined script)
      SubmitPanel.tsx
    lib/api.ts               # Tauri command bindings (typed)
  package.json
```

## 4. Rust command surface (frontend ↔ backend)

All file access is scoped to the session workspace directory. Commands reject
paths escaping it.

| Command | Purpose |
|---|---|
| `join_session(invite_code)` | Validate code with platform, download scenario package, init workspace |
| `list_files()` / `read_file(path)` / `write_file(path, content, rev)` | Revision-checked file I/O (409 on conflict, same protocol as web slice) |
| `run_tests()` | Execute the scenario's public test suite locally, bounded; returns structured results + raw output |
| `append_event(kind, payload)` | Append to the session event log (file saves, test runs, milestone acks, messages) |
| `get_events()` | Read back the log (candidate can inspect their own evidence trail) |
| `submit(handoff)` | Freeze snapshot, compute SHA-256 receipt, upload to platform, lock workspace read-only |

### Local test execution (`execution.rs`)

- Spawn the scenario's runner (e.g. `python -m pytest`) as a child process.
- Bounds: wall-time timeout (default 120s), stdout/stderr byte caps, CPU/memory
  limits via OS primitives where available (`setrlimit` on Linux/macOS).
- Environment scrubbed of credential-like variables before spawn.
- Only the scenario's declared dependencies are installed (from the package
  manifest); no network during the run.
- Raw output is always preserved and shown to the candidate — never summarized
  away. Expected outcomes stay in the package manifest, outside candidate code.

### Event log (`events.rs`)

Append-only JSONL in the workspace. Event kinds (v1):

- `session_started`, `session_submitted`
- `file_saved` { path, rev, bytes, sha256 }
- `tests_run` { passed, failed, total, duration_ms, run_rev_map }
- `milestone_acknowledged` { milestone_id }
- `message_sent` { thread, chars } (simulated teammates are scenario scripts;
  every automated reply is labeled as simulated)

The candidate can view their full log at any time. The log ships with the
submission as the evidence trail. **Nothing is recorded outside an active
session. No keystroke logging, no screen capture, no process monitoring in v1.**

## 5. Platform API contract (Next.js side — to be added)

| Route | Method | Purpose |
|---|---|---|
| `/api/desktop/packages/[inviteCode]` | GET | Returns the scenario package manifest + file contents (versioned) |
| `/api/desktop/submissions` | POST | Accepts submission: snapshot files, event log, receipt; returns graded report reference |
| `/api/desktop/session/heartbeat` | POST | Optional liveness (v2) |

Auth: short-lived capability token minted with the package download, scoped to
that session. Tokens never touch disk outside the OS keychain (v2; v1: memory).

## 6. Scenario package format

V1 reuses the repo's scenario layout (`scenarios/<id>/`):

```
.fydell/scenario.json   # id, version, label, entrypoints, allowed commands
canonical.json          # full content manifest (TBD — see research)
README.md, docs/, src/, data/, tests/, evals/
```

The desktop app downloads this as a unit, verifies a manifest hash, and runs
the public `tests/` locally. Hidden evals (`evals/`) are **never shipped** to
the client — grading of hidden tests happens platform-side on submission.

## 7. Phased integrity (explicit, not silent)

- **V1 (this build):** honest local app. No lockdown claims. The evidence value
  comes from the realistic task, the test record, and the event trail.
- **V2:** optional fullscreen focus mode; OS keychain for tokens.
- **V3:** lockdown mode (kiosk window, network allowlist) for employers who
  require observed conditions. Only ever with explicit candidate consent and a
  visible indicator.

We will not claim proctoring we do not perform.

## 8. Packaging & distribution (release gates, not v1)

- `tauri build` per OS; code signing (Apple Developer ID, Windows EV cert);
  notarization (macOS); auto-update via Tauri updater with signed artifacts.
- Until then: dev builds are for internal testing only.

## 9. Non-goals for v1

- Employer-side desktop features. Employers stay on the web.
- Real-time employer observation of sessions.
- Multiple scenarios (one: harbor-webhooks, ported from the web slice).
- Offline-first (network required for package download and submission).
