# Fydell Desktop — Architecture

**Status:** draft (2026-09-27, reworked; updated 2026-10-07 for v0.1.6). V1
scope: a desktop client for candidates that runs two kinds of hiring work —
simulation sessions (`/api/sim/*`, §1–§12) and engineering assessments
(`/api/eng/*`, §4a). No workplace surveillance — the app runs hiring work,
nothing else. The engineering assessment client is **in progress and not
released**: it builds and its unit tests pass, but it has not run against a
live platform (§15).

> **What this build does NOT claim.** It does not prevent AI use, prove
> authorship, or proctor the candidate. For engineering scenarios
> (`execution: "remote"` in the file package) candidate code never runs on
> this machine: Run tests sends the saved files to the platform, which runs
> the scenario's pinned tests on its isolated runner (`src/lib/engineering`,
> `POST /api/sim/sessions/{id}/runs`). Legacy scenarios without that
> declaration still use a bounded local child process, which is crash/hang
> containment, not a security boundary, and is outside the paid path. The
> evidence value comes from the realistic task, the test record, and the
> inspectable event trail, plus human review of every submission.

## 1. What it is

A Tauri v2 desktop app (Rust backend + web frontend) that is a **client of the
Fydell platform's existing session API** (`src/app/api/sim/*` in this repo).
It invents no platform routes of its own. Flow:

```
Employer creates hiring task (web) → candidate gets invite token
  → candidate signs in (system browser → fydell:// deep link, §3)
  → app previews invitation → accepts → fetches session
  → candidate accepts platform consent → preflight → start (server clock starts)
  → app materializes the local workspace from the session payload
  → candidate edits locally; Run tests executes on the platform's isolated
    runner against the saved files (remote-execution scenarios)
  → app mirrors whitelisted events to the platform + keeps a local evidence log
  → candidate submits → app PATCHes the file snapshot into session state,
    then POSTs to the platform submit route (idempotent)
  → platform grades, employer reviews evidence (web)
```

## 2. Why desktop (and why Tauri)

- **No local setup.** The app provisions the workspace from the session
  payload, and for remote-execution scenarios tests run on the platform's
  isolated runner, so the candidate installs no language runtime (DESK-06)
  and candidate code never runs in a privileged local process (DESK-17).
  Results are bound to a hash of the exact files sent (DESK-12).
- **Tauri v2** because it is light (system webview), its Rust core is good at
  process control, and it hosts the same web UI we ship on the web.

## 3. Authentication (DESK-04)

Checklist DESK-04 requires the supported auth flow through the system browser,
with callback/state binding and OS-protected credential storage. The desktop
implements exactly that (`src-tauri/src/auth.rs`):

1. `auth_sign_in` generates a random `state`, stores it, and opens the system
   browser (Tauri opener plugin) to `{platform}/login?desktop=1&state={state}`.
2. The web app signs the candidate in and redirects to
   `fydell://auth/callback?code=<one-time-code>&state=<state>` (web addition
   **W1** — does not exist yet; specified below).
3. The deep-link handler (registered in `main.rs` via `tauri-plugin-deep-link`;
   scheme `fydell` declared in `tauri.conf.json`) forwards the URL to
   `auth::handle_callback_url`, which validates `state` (constant-time
   compare), exchanges the code for a Supabase session in the background, and
   emits `auth-changed` / `auth-error` to the frontend.
4. Only the refresh token (plus email and user id) is stored in the OS
   credential store (`keyring` with the per-OS native feature; without one,
   keyring 3 silently uses an in-memory mock and every restart signs out).
   The access token lives in memory and is renewed at startup. Tokens
   **never cross the IPC boundary**: `auth_session` returns only
   `{ signed_in, email, expires_at }`. If the credential store refuses the
   write, the sign-in lasts until the app closes and diagnostics say so.
   The session sealed into the one-time code is minted for the desktop
   (`src/lib/auth/desktop-session.ts`), not copied from the browser's
   cookies, so the two refresh tokens rotate independently and signing out
   in one place does not invalidate the other through token reuse.
   Refresh is serialized; a network error or Supabase 5xx/429 keeps the
   session (`platform_error`), and only a rejected refresh token signs out.
   A 401 from the platform triggers one forced refresh before giving up.
5. Token refresh goes directly to Supabase Auth REST
   (`{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, public anon key)
   — no web changes needed for refresh. The desktop build needs
   `FYDELL_SUPABASE_URL` and `FYDELL_SUPABASE_ANON_KEY` (public values, same as
   the web app's `NEXT_PUBLIC_*` vars).

**Auth transport to the platform API.** Every candidate route requires
`requireUser()` (`src/lib/simulations/auth.ts`), which reads the Supabase
session from **cookies** via `@supabase/ssr`. The desktop therefore sends the
same session cookie the web client would. The cookie format was verified
against the `@supabase/ssr@0.12.0` sources the web app uses
(`createServerClient` defaults: storage key `sb-<project-ref>-auth-token`,
`cookieEncoding: "base64url"` → value `base64-` + base64url(JSON session),
chunked at 3180 chars into `<key>.0`, `<key>.1`, …). **If the web app upgrades
`@supabase/ssr`, re-verify this format.** The desktop also sends
`Authorization: Bearer <access_token>` on every request for forward
compatibility — the web app ignores it today (web addition **W2**).

## 4. Platform API contract (read from the Next.js routes)

All shapes in `src-tauri/src/platform.rs` cite their source route file. No
route below was added or modified for the desktop.

| Step | Route | Auth | Shape |
|---|---|---|---|
| Invitation preview | `GET /api/sim/invitations/{token}` | public | `{ ok, reason, invitation: { status, candidateEmail, candidateName, expiresAt, organizationName, simulation: { title, roleTitle, scenarioSummary, durationMinutes, toolsAvailable, skillsEvaluated } } }` |
| Accept invitation | `POST /api/sim/invitations/{token}` | user | `{ ok, sessionId }` |
| Fetch session | `GET /api/sim/sessions/{id}` | user | `{ session: { id, status, durationMinutes, startedAt, endsAt, submittedAt, curveballPresentedAt, curveballAcknowledgedAt }, content, workbench, filePackage, gate: { consentPolicyVersion, consentAccepted, preflightOk, preflightLimitations, desktopRequired }, state: { revision, currentTaskId, notes, deliverable, workspace, completedTaskIds }, messages: [{ id, thread, stakeholderId, sender, body, createdAt }] }`. `content` is the candidate-safe view (`src/lib/simulations/candidate-view.ts`): title, scenarioSummary, mission, tasks, resources, stakeholders, deliverableFields, curveball announcement. `gate.desktopRequired: true` already anticipates this client. `filePackage` (W3, null when the template has no on-disk scenario): `{ scenarioId, scenarioVersion, label, builtAt, testCommand, files: { path: content }, manifest: { path: sha256 } }` — built server-side from the scenario's `files` allowlist only; `canonical.json` and hidden eval material can never be included because the builder never reads them. |
| Consent | `POST /api/sim/sessions/{id}/consent` | user | `{ accepted: true, policyVersion }` → `{ ok, consentId, policyVersion }`; 409 on policy mismatch |
| Preflight | `POST /api/sim/sessions/{id}/preflight` | user | `{ viewportWidth, viewportHeight, userAgent, localStorageOk }` → `{ ok, preflightId, result, canStart }` |
| Start | `POST /api/sim/sessions/{id}/start` | user | → `{ ok, startedAt, endsAt }` (server clock starts) |
| State sync | `PATCH /api/sim/sessions/{id}/state` | user | `{ baseRevision, notes?, deliverable?, workspace?, currentTaskId?, completedTaskIds? }` → `{ ok, revision }` or 409 `{ ok: false, conflict: {...} }`; 409 also when not active |
| Events | `POST /api/sim/sessions/{id}/events` | user | `{ eventType, resourceId?, taskId?, payload?, clientEventId? }` → `{ ok, id, duplicate }`. Whitelist: `resource_opened, resource_downloaded, task_completed, task_reopened, notes_edited, deliverable_field_edited, workspace_action, curveball_acknowledged, table_sorted, table_filtered, row_flagged, ticket_selected, step_toggled, rule_reviewed, decision_selected, evidence_selected, deliverable_revised`. 400 on unknown type, 409 when not active |
| Submit | `POST /api/sim/sessions/{id}/submit` | user | `{ externalAiDisclosed?, answers?, fileSnapshot? }` → `{ ok, submissionId, alreadySubmitted, receiptHash? }` (idempotent; honors the `__aiDisclosure` key in answers). W4: when `fileSnapshot` (`{ scenarioId, scenarioVersion, files: { path: content }, manifest: { path: sha256 } }`) is present, the server recomputes every hash (mismatch → 400, nothing stored), computes the receipt hash itself, and stores everything transactionally via `submit_session_atomic` — all files or none. |

**Local ↔ platform mapping.** The desktop keeps a local append-only JSONL
evidence log (candidate-inspectable). Local event kinds map onto the platform
whitelist in `events.rs`: `brief_opened→resource_opened`,
`curveball_acknowledged→curveball_acknowledged`,
`task_completed/task_reopened` passthrough,
`file_saved/tests_run/milestone_acknowledged/message_sent→workspace_action`
(with `local_kind` preserved in the payload). Platform posting is best-effort
with the platform event id recorded locally; the local log is the source of
truth and a failed post never blocks the candidate.

**Submission sequence** (`submission.rs`): snapshot local files (excluding
`.fydell/` internals and the generated `BRIEF.md`) → compute a local SHA-256
receipt over files + events → **W4 primary path** (session materialized from a
verified package, `.fydell/package.json` pin present): build the file snapshot
(per-file SHA-256 over current contents) and POST submit with `fileSnapshot`;
the server validates every hash, computes the receipt itself, stores it all
transactionally, and returns the server receipt hash → **legacy path** (no
package pin): PATCH the snapshot into `state.workspace.files` (one conflict
retry), then POST submit with handoff + AI disclosure in `answers` → persist
`receipt.json` (now including the server receipt hash when present) → lock the
workspace read-only. The local receipt covers the exact local bytes; the
server receipt hash is the authoritative tamper-evidence handle; the platform
submission id is the durable handle.

**Workspace provisioning** (`session.rs::materialize_workspace`): the session
payload's candidate-safe `content` is written as a read-only `BRIEF.md`
(title, summary, mission, tasks, deliverable fields); **W3**: when the session
carries `filePackage`, every file is verified against the package manifest
*before anything is written* — any hash mismatch aborts with a clear integrity
error and the workspace is left unmaterialized (never silently continued).
The verified manifest is pinned to `.fydell/package.json`
(`{ scenarioId, scenarioVersion, manifest }`) so submit can prove which
scenario version the work started from; the canonical `testCommand` feeds the
local test runner. Without a package, `state.workspace.files`
(`{ path: content }`) is materialized as the editable file set when present;
`state.workspace.testCommand` (argv) is stored for the local test runner.

## 4a. Engineering assessments (`eng.rs`, `eng_package.rs`)

A second, separate client for the web's `/assess/[attemptId]` flow. It
reuses the platform client's auth (`Platform::authed`: cookie + Bearer,
tokens stay in Rust) and error mapping, and shares nothing else with the
simulation session code. Every shape in `eng.rs` cites its route.

| Step | Route | Desktop command |
|---|---|---|
| List my tasks | `GET /api/eng/attempts` (candidate-scoped: own attempts + still-open invitations to the signed-in email, display fields only) | `eng_list_tasks` |
| Accept invitation | `POST /api/eng/invitations/accept` | `eng_accept_invitation` |
| Candidate view | `GET /api/eng/attempts/{id}` | `eng_open_attempt` |
| Consent | `POST …/consent` | `eng_record_consent` |
| Starter download | `GET …/starter` | `eng_prepare_workspace` |
| Setup check | `POST …/preflight` (code the candidate pastes from their own terminal) | `eng_confirm_setup` |
| Start (server clock) | `POST …/start` | `eng_start` |
| Team thread | `POST …/messages` (replies composed server-side) | `eng_send_message` |
| Requirement update | `POST …/acknowledge-update` | `eng_acknowledge_update` |
| Handoff drafts | `PUT …/drafts` (revision-fenced; 409 returns the server copy) | `eng_save_draft` |
| Package + upload | `POST …/uploads` → signed Storage URL → `POST …/uploads/{uploadId}/finalize` | `eng_package_preview`, `eng_upload_package` |
| Submit | `POST …/submit` | `eng_submit` |
| Released report | `GET …/report` (`null` until released) | `eng_get_report` |

All fourteen routes exist in `src/app/api/eng/`. `GET /api/eng/attempts`
was added for this client; the rest are the web flow's routes, unchanged.

**What runs where.** The desktop never executes candidate code and never
calls a model provider. The candidate works in their own editor and
terminal; the app creates the project folder, opens it (`eng_open_workspace`,
via the opener plugin from Rust, path taken from the local record and checked
to sit inside the workspace root), and packages it.

**Starter extraction** (`eng_package::extract_starter`): the ZIP is
hash-verified, every entry name is validated (no traversal, absolute paths,
or entries outside the declared root; entry/byte caps), and an existing
project folder is never overwritten. A failure writes nothing. Projects go
under `Documents/Fydell/engineering-<id prefix>/<root>` (app data when the OS
reports no Documents folder). Attempt ids must be UUIDs before they reach a
URL or a path.

**Packaging** (`plan_package` / `build_archive`) mirrors the server's archive
inspection (`src/lib/eng/zip.ts`): caches, VCS and dependency folders are
skipped; credential files (`.env`, keys, `credentials.json`) and nested
archives are refused; the same size/count/path-length limits apply. The
preview lists what will be sent and what changed versus the starter before
anything uploads. The archive is deterministic and rooted. The server
re-validates everything; local checks only surface problems earlier.

**Upload safety.** The signed upload URL is used once, never logged or
returned to the renderer, and only accepted if it targets this deployment's
Supabase Storage signed-upload endpoint for the `eng-submissions` bucket
(`signed_upload_url_allowed`, unit-tested).

**Local bookkeeping.** `app_data/eng/<attemptId>.json` (atomic
write-then-rename) records the project path, starter hash and file list, the
last package and its upload status, and the receipt. It never lives inside
the project folder. The draft handoff answers are server-side
(`PUT …/drafts`); there is no local sync journal for this flow.

**Authored work samples: local outbox and file sync** (`eng_authored.rs`).
The project folder is the source of truth on this computer. While the task
is open the app reads that folder (and nothing else) about every 20 seconds,
on window focus and when the network returns, and sends it to
`PUT …/authored/files` fenced by the last revision Fydell accepted.
`app_data/eng/<attemptId>.outbox.json` (fsync, then rename) keeps the
handoff answers as they are typed, the last accepted revision and the local
fingerprint it covered, and a sticky conflict marker. The UI shows "Saved on
this computer" until the server accepts a copy, then "Accepted by Fydell
(version N)". Delivery is idempotent: with no acceptance on record (first
sync, or a reply lost in a crash) the app compares the website copy first
and records an identical copy as accepted without writing; a 409 whose
server copy matches the local files is also treated as accepted. A website
copy that differs from both the last accepted copy and the starter is a
conflict: nothing is overwritten until the candidate chooses "keep this
computer's files" or "use the website copy" (the folder is moved aside, not
deleted). The employer sees only what is submitted.

**Frontend.** An "Engineering" tab (`EngTasks` → `EngAssessment` →
`EngWork` / `EngResult`), with presentation logic in `lib/eng.ts`, which is
unit-tested in `lib/eng.test.ts`. While an engineering attempt is open the
update prompt is held (§11).

## 5. Layout

```
desktop/
  ARCHITECTURE.md            # this file
  src-tauri/
    Cargo.toml               # tauri 2, reqwest, keyring, url,
                             # tauri-plugin-{opener,deep-link} (no shell)
    tauri.conf.json          # deep-link scheme: fydell:// ; CSP
    capabilities/main.json   # minimal renderer permissions (§10)
    src/main.rs              # app setup, plugin + deep-link registration, commands
    src/auth.rs              # system-browser sign-in, deep-link callback,
                             # keychain session, Supabase refresh, auth headers
    src/platform.rs          # typed client for src/app/api/sim/* (§4)
    src/session.rs           # idle → joined → active → submitted; join/consent/
                             # preflight/start; provisioning progress events (§6);
                             # version gate (§11); workspace materialization;
                             # recovery persistence; single-writer lock (§9)
    src/workspace.rs         # revision-checked file I/O, scoped to the workspace;
                             # marks sync journal dirty after each durable write (§7)
    src/execution.rs         # bounded local test execution (timeouts, output
                             # caps, rlimits, credential scrubbing)
    src/events.rs            # local JSONL log + platform whitelist mapping
    src/submission.rs        # snapshot → PATCH → platform submit → receipt
    src/sync.rs              # explicit remote-sync state machine + durable
                             # journal; conflict is sticky until resolved (§7)
    src/recovery.rs          # durable session record, boot assessment,
                             # per-session single-writer lock (§8)
    src/version.rs           # semver parse/compare; minimum-version gate
                             # contract (§11)
    src/diagnostics.rs       # scoped, redacted diagnostics + error ring (§12)
    src/error.rs             # stable error codes FYDELL-E1001…E1012 (§12)
    src/eng.rs               # engineering assessment client for
                             # src/app/api/eng/* (§4a)
    src/eng_package.rs       # starter extraction + submission packaging (§4a)
  src/                       # frontend (Vite + React + TypeScript)
    App.tsx                  # sign-in → invite → consent → provisioning →
                             # workspace → submitted; version gate (§11);
                             # locked screen (§9); Engineering tab (§4a)
    components/UpdatePrompt.tsx # signed self-update prompt (§11)
    components/Eng*.tsx      # engineering task list, assessment, work, result
    lib/eng.ts               # engineering presentation logic (eng.test.ts)
    components/Workspace.tsx # editor shell; separate local-save / remote-sync
                             # indicators; conflict banner; exit warning (§7, §8)
    components/Panels.tsx    # brief, tests, team, submit (AI disclosure, sync
                             # warning), timeline + diagnostics panel (§12)
    lib/tauri.ts             # typed Tauri command bindings
    lib/pure.ts              # pure presentation logic (wording, formatting),
                             # unit-tested with node:test (lib/pure.test.ts)
```

### Test execution (`execution.rs`)

**Remote (package `execution: "remote"`, pinned in `.fydell/package.json`).**
`run_tests` collects the workspace files exactly as submission would, sends
them with a fresh client run id to `POST /api/sim/sessions/{id}/runs` (200s
request timeout), and returns the platform's result: status and reason,
per-test outcomes split into provided tests and the candidate's own, the
server snapshot hash, suite version, restored/ignored files and bounded
output. A local fingerprint of the files sent lets the UI show "Results from
an earlier version" after further edits (`workspace_fingerprint`). The run
is recorded server-side (`test_run_completed`); the desktop only writes its
local log. Nothing executes on this machine.

**Local (legacy packages).** Spawns the scenario's declared runner as a child
process in the workspace dir. Bounds: 120s wall-time timeout then kill,
256 KiB stdout/stderr caps, CPU (60s) / address-space (512 MiB) limits via
`setrlimit` on Unix, credential-like env vars scrubbed, minimal PATH. This is
hang/crash containment on the candidate's own machine, not isolation.

## 6. Provisioning (DESK-06)

`begin_session` is not one opaque call. It walks an explicit step list and
emits a `provision-progress` event for each step's `started`/`ok`/`failed`
transition (`session.rs`):

`version → preflight → fetch → runtime → start → materialize`

- `version`: the minimum-version gate (§11) is checked first; a blocked client
  refuses before any timed work begins.
- `preflight`: viewport/localStorage sanity (same data as the web preflight).
- `fetch`: the session payload is downloaded and parsed.
- `runtime`: remote-execution packages need nothing on this computer and
  pass immediately. Legacy packages resolve the declared test runner against
  the fixed `EXEC_PATH` (`/usr/local/bin:/usr/bin:/bin`); an unresolvable
  runner fails here with a clear message instead of mid-assessment.
- `start`: the platform start route is called — this is the only step that
  starts the server clock.
- `materialize`: the workspace is written to disk (hash-verified, §4).

The frontend (`App.tsx` → `Provisioning`) renders each step with its real
state and a retry button when one fails; the candidate's timer only starts
after all steps succeed, so a failed step never costs assessment time. Retry
re-runs the whole sequence; `start` is idempotent server-side (an existing
`started_at` returns the same session).

## 7. Save / remote-sync states (DESK-09)

Local persistence and remote acknowledgment are different facts and are never
conflated in the UI. `sync.rs` owns an explicit state machine:

`saved_local → syncing → synced`, with sticky `sync_failed` and `conflict`.

- Every durable local write (`workspace.rs::write_file`) bumps the per-file
  revision and calls `sync::mark_dirty`, recording the path in a durable
  `.fydell/sync-journal.json`. The journal survives restarts — unsynced work
  is never silently dropped.
- The frontend shows the local state and the remote phase separately:
  "Unsaved changes" (edit not yet written) · "Saving on device…" ·
  "Saved on this device" (durable local write) · "Syncing…" ·
  "Saved remotely" (server PATCH acknowledged) · "Sync failed — retry".
- A sync is a server state PATCH fenced by `baseRevision`. The app attempts
  one optimistic retry on 409; a repeated 409 moves the machine to `conflict`,
  which is **sticky**: only an explicit `resolve_sync_conflict`
  (`keep_local` re-fences at the new revision and re-pushes;
  `take_remote` accepts the server snapshot) leaves it. The conflict banner
  states plainly that another session changed the assignment and that local
  work is untouched.
- An explicit **Sync now** runs after each save (debounced) and from the
  recovery banner; "Sync failed" is a button that retries.
- At submit time, if remote state is unsettled (unsynced files, failed sync,
  unresolved conflict), the submit dialog says so explicitly and submits the
  local work as-is.

## 8. Interrupted-work recovery (DESK-10)

`recovery.rs` keeps a durable record so a crash, kill, or OS restart never
loses work silently:

- `.fydell/session.json` (the durable session record) plus
  `sessions/active.json` (the active-session pointer).
- On boot the frontend asks `recovery_status`, which assesses the durable
  state and returns one of: `none`, `resume_active` (with unsynced paths from
  the journal), `resume_joined`, `workspace_missing` (record points at a
  workspace that no longer exists — shown truthfully, not hidden),
  `locked` (another live process holds the session, §9).
- Resumed work is surfaced with an explicit banner ("Recovered N unsynced
  files from before the restart"), not silently merged.
- Closing the window with dirty tabs or unsynced/conflicted sync state shows
  an explicit dialog: pending autosaves are flushed first, then the dialog
  distinguishes "unsaved changes (will be lost)" from "saved on this device
  but not yet acknowledged (survives restart)". The user can keep working,
  quit anyway, or sync-and-quit.

## 9. Competing sessions (DESK-11)

Two writers must never silently overwrite each other — on this machine or
across machines:

- **Same machine:** a per-session single-writer lock file (`.fydell/lock`)
  with the holder's PID. `begin_session` (and boot assessment) refuse with
  `session_locked` when the lock belongs to a live process; on Linux liveness
  is verified via `/proc`, so a stale lock after a crash is treated as stale
  and the session can be re-entered. On Windows and macOS liveness is not
  checked (locks are treated as stale by policy); there,
  `tauri-plugin-single-instance` is what prevents a second app process.
  The frontend shows a dedicated "Already open" screen naming the holding
  process, with a check-again path.
- **Across machines:** every server write is fenced by `baseRevision`; a 409
  is a real signal, not retried away silently. After one optimistic retry, a
  repeated 409 becomes the sticky `conflict` phase (§7) requiring an explicit
  human choice. "Keep my version" re-fences at the server revision and
  re-pushes — it never bypasses fencing; "use server version" adopts the
  server snapshot.

## 10. Native capability restrictions (DESK-17)

The renderer is deliberately weak; the Rust backend is deliberately narrow:

- The `tauri-plugin-shell` dependency was removed — the app never spawns an
  arbitrary shell. Test execution (`execution.rs`) spawns only the scenario's
  declared runner as a child process with a fixed `EXEC_PATH`, wall-time
  timeout, output caps, and Unix rlimits; this is crash/hang containment on
  the candidate's own machine, **not a sandbox** (§5).
- `capabilities/main.json` grants the renderer only
  `core:event:allow-listen`, `core:event:allow-unlisten`,
  `core:window:allow-close`, `updater:allow-check`,
  `updater:allow-download-and-install` and `process:allow-restart` (§11).
  The updater only talks to the one endpoint in `tauri.conf.json` and only
  installs packages signed with the embedded public key. No shell, fs,
  dialog, or opener renderer permission exists. File I/O happens exclusively through the narrow
  `read_file`/`write_file`/`list_files` commands, scoped to the session
  workspace directory.
- CSP (`tauri.conf.json`) allows only `connect-src ipc: http://ipc.localhost`
  — the renderer makes no network calls; all platform traffic originates in
  Rust with the candidate's own session.
- The auth callback is restricted to the exact `fydell://auth/callback` URL
  with a constant-time `state` check (`auth.rs`); the sign-in URL is built by
  Rust from the configured platform base, never from renderer input.
- Tokens never cross the IPC boundary (`auth_session` returns only
  `{ signed_in, email, expires_at }`); diagnostics are scoped and redacted
  (§12).

## 11. Safe upgrades (DESK-19)

What exists, honestly:

- `version.rs` parses and compares `major.minor.patch` versions.
- `GET /api/desktop/version` exists on the platform
  (`src/app/api/desktop/version/route.ts`, policy in
  `src/lib/desktop/version-policy.ts`). If it is unreachable or invalid the
  gate fails open to `unknown` (visible, never silently assumed current).
- A blocked client (below `minimum`) is refused **before** the assessment
  starts, with an explicit "Update required" screen; nothing timed has begun.
- An available-but-not-required update is an advisory notice on the consent
  screen — the candidate may finish the assessment first.
- **Signed self-update (v0.1.6).** `tauri-plugin-updater` checks
  `https://github.com/MaahirPatel/fydell-mvp/releases/latest/download/latest.json`
  8 s after launch and every 6 h (`UpdatePrompt.tsx`). It only installs a
  package whose minisign signature matches the public key in
  `tauri.conf.json`; Windows installs run in NSIS `passive` mode, then the
  app restarts (`tauri-plugin-process`). The prompt is held while a timed
  simulation or an open engineering attempt is on screen, so an install
  never interrupts timed work.
- `createUpdaterArtifacts` is on, so every bundle build needs
  `TAURI_SIGNING_PRIVATE_KEY` (+ password). The release workflow
  (`.github/workflows/release-desktop.yml`) now passes both secrets; whether
  they are set in the repository has not been verified from here.

What does **not** exist (and is therefore not claimed): no Windows
Authenticode or macOS code signing/notarization (the updater signature
proves the package came from our release key; it does not satisfy
SmartScreen or Gatekeeper), and no rollback mechanism. The self-update path
has not been exercised end to end: no signed `latest.json` has been
published and installed by a previous version.

## 12. Diagnostics (DESK-20)

`diagnostics.rs` exposes a `diagnostics` command returning a deliberately
scoped payload: app version, OS/arch, the **platform host only** (never full
URLs, query strings, or paths), session status/sync metadata, file and event
counts, and a capped in-memory ring of recent errors.

- Every error the backend produces carries a stable code (`FYDELL-E1001` …
  `FYDELL-E1012`) and a stable reference; the frontend appends the reference
  to every visible error message, so support can identify a failure without
  any logs.
- Redaction is unit-tested: JSON secret fields, `key=value` secrets, and
  bearer tokens are scrubbed before anything enters the diagnostics ring
  (tokens never cross IPC at all, §10).
- The UI (Timeline → Diagnostics) shows the scoped fields and a "Copy
  diagnostics" button producing plain text that states its own guarantee:
  versions, sync state, counts, error references — never code, tokens, or
  message bodies.

**Distribution honesty.** Linux artifacts (`.deb`, `.rpm`, `.AppImage`)
were reported built earlier and were not re-verified since. On Windows
(2026-10-07, v0.1.6, `stable-x86_64-pc-windows-msvc`, rustc 1.99.0, tauri-cli
2.12.0): `cargo check` is clean with no warnings, `cargo test` passes 42
tests, and `npx tauri build` compiled the release binary and produced both
installers, `Fydell_0.1.6_x64_en-US.msi` (WiX 3.14) and
`Fydell_0.1.6_x64-setup.exe` (NSIS). The command then exited 1: "A public key
has been found, but no private key. Make sure to set
`TAURI_SIGNING_PRIVATE_KEY` environment variable." So no updater signatures
were produced for these installers (the `.sig` files in the bundle folder are
from an earlier build and do not match them). The installers are also not
Authenticode-signed (`NotSigned`), and none has been installed or run on a
clean Windows machine. macOS is not built. The single-writer liveness check
is Linux-only (§9).

## 13. Web platform additions required (not built)

The original simulation client changed nothing outside `desktop/`; the
engineering client added one candidate-scoped read route,
`GET /api/eng/attempts` (§4a). These small web-side additions are required
for the simulation loop; each is specified as a contract, not a mandate
for a specific URL (suggested shapes in parentheses).

- **W1 — Desktop auth callback (required for sign-in).** After the candidate
  signs in on the web app with `?desktop=1&state=<opaque>`, issue a
  single-use, short-lived (≤5 min) authorization code bound to that state and
  the user id, then 302-redirect to
  `fydell://auth/callback?code=<code>&state=<state>`. Provide a token-exchange
  endpoint (suggested `POST /api/auth/desktop/exchange`, body `{ code }` →
  `{ access_token, refresh_token, expires_at, user: { id, email } }`) that
  validates the code/state binding and returns the Supabase session. The
  desktop's `exchange_code` expects exactly this shape; without it, sign-in
  cannot complete (the app surfaces this explicitly).
  **Implemented on this branch:** `GET /auth/desktop/authorize` mints the
  code (single-use, 5-min TTL, bound to user+state) and 302s to the deep
  link; `POST /api/auth/desktop/exchange` redeems it for the session.
  The login form honors `?desktop=1&state=` after password sign-in.
  Codes live in an in-process store — multi-instance deployments need sticky
  routing or a shared store (see `src/lib/auth/desktop-codes.ts`).
- **W2 — Bearer token acceptance (required for non-browser clients).**
  `requireUser()` (`src/lib/simulations/auth.ts`) should, when no cookie
  session exists and an `Authorization: Bearer <jwt>` header is present, call
  `supabase.auth.getUser(jwt)` to validate it. Until then the desktop's cookie
  (verified format, §3) carries auth.
  **Implemented on this branch:** Bearer fallback added; cookie behavior
  unchanged (cookies are still checked first).
- **W3 — Scenario file package (implemented on this branch).**
  `GET /api/sim/sessions/{id}` serves `filePackage` for scenario-backed
  sessions (convention: template slug == `scenarios/<slug>/` directory).
  `src/lib/simulations/scenario-package.ts` builds it from the scenario's
  `files` allowlist only — pinned version, per-file SHA-256 manifest, canonical
  `testCommand`; `canonical.json` and hidden eval material are excluded by
  construction. The desktop verifies every file against the manifest before
  writing anything and pins the manifest to `.fydell/package.json`.
- **W4 — File snapshot on submit (implemented on this branch).** The submit
  route accepts `fileSnapshot` in the body: the server recomputes every hash
  (mismatch → 400, nothing stored), computes the receipt hash itself, and
  stores submission + snapshot + status flips transactionally via the new
  `submit_session_atomic` Postgres function (one additive migration; no RLS or
  existing-table changes). Idempotency preserved (`alreadySubmitted` returns
  the existing id and its stored receipt hash). The desktop sends the snapshot
  when the session was materialized from a verified package; otherwise it
  keeps the interim PATCH-fold path.

No Supabase dashboard changes are needed (the callback is issued by the web
app, not by Supabase's hosted authorize endpoint).

Desktop configuration (`config.rs`): `FYDELL_PLATFORM_URL` (runtime or
compile time) overrides the platform; otherwise every build, debug included,
uses `https://www.fydell.com`. Local development sets
`FYDELL_PLATFORM_URL=http://localhost:3000` explicitly. The
public Supabase URL and anon key come from `GET /api/desktop/config`;
`FYDELL_SUPABASE_URL` + `FYDELL_SUPABASE_ANON_KEY` override them.

## 14. Phased integrity (explicit, not silent)

- **V1 (this build):** honest local app. No lockdown claims. Evidence value
  comes from the realistic task, the test record, the event trail, and human
  review.
- **V2:** OS keychain for tokens (done in v1, actually — keyring), fullscreen
  focus mode (optional, explicit consent).
- **V3:** lockdown mode only if an employer requires observed conditions, only
  with explicit candidate consent and a visible indicator.

We will not claim proctoring we do not perform.

## 15. What remains unbuilt / unverified

- Verified in the native Windows debug build against a local platform and
  the development Supabase project, 2026-10-09: browser sign-in through the
  real `fydell://` deep link, refresh token in Windows Credential Manager and
  removed on sign-out, sign-in restored after a forced kill, an offline
  platform shown as a connection error rather than a sign-out, authored
  task setup and start, edits and handoff answers surviving a forced kill
  and delivered on restart, and a duplicate delivery after a lost
  acknowledgement creating no new revision. Submitting from the desktop and
  comparing the receipt with the website and employer views was not
  completed. macOS and Linux keychains are untested.
- Verified on Windows, 2026-10-07: the desktop TypeScript project
  type-checks and `vite build` succeeds; `lib/eng.test.ts` passes; `cargo
  check` is clean; `cargo test` passes 42 tests; `tauri build` produces
  unsigned MSI and NSIS installers and then fails at updater signing without
  `TAURI_SIGNING_PRIVATE_KEY` (§12). Linux installers were not re-verified.
- No Authenticode or Apple signing/notarization. The signed updater (§11)
  is wired but has never delivered an update. macOS is not built; no
  installer has been tested on a clean machine.
- The engineering assessment client (§4a) has never run against a live
  platform: invitation accept, starter download and extraction, setup
  check, the team thread, signed upload + finalize, submit, and report
  loading are unit-tested on the desktop side only. It is not released.
- W3–W4 are implemented on this branch but the `submit_session_atomic`
  transaction has not run against a live Postgres (no database in this
  environment); its logic is reviewed but unexecuted. The in-process unit
  tests cover package building, exclusion, manifest validation, receipt
  determinism, and snapshot assembly.
- The end-to-end loop (install → sign in → join → work → submit → employer
  report) has never run against a live platform. In particular, the sync
  conflict path (fencing, 409 → sticky conflict → explicit resolution) is
  unit-tested as a state machine but has not been exercised against the real
  API. `GET /api/desktop/version` now exists server-side (§11) but the gate
  has not been exercised against it from an installed build.
- The file-package builder reads `<repo>/scenarios` from `process.cwd()`:
  serverless deployments must bundle the scenarios directory or `filePackage`
  will be null (logged server-side; the desktop falls back to
  `state.workspace.files`).
- Offline-first is a non-goal (§16): sign-in, session sync, and submission
  require the network. The sync journal (§7) makes interrupted work
  resumable, but a long-offline session has not been soak-tested.
- Accessibility of the desktop UI is not implemented.
- The cookie format assumption (§3) must be re-verified if `@supabase/ssr` is
  upgraded.

## 16. Non-goals for v1

- Employer-side desktop features. Employers stay on the web.
- Real-time employer observation of sessions.
- Offline-first (network required for sign-in, session sync, and submission).
- A second editor shell or external-editor integration.
