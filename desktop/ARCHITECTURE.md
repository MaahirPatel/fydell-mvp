# Fydell Desktop — Architecture

**Status:** draft (2026-09-27, reworked). V1 scope: a desktop simulation client
for candidates. No workplace surveillance — the app runs hiring simulations,
nothing else.

> **What this build does NOT claim.** It does not prevent AI use, prove
> authorship, proctor the candidate, or sandbox untrusted code. Candidate code
> runs as a local child process with bounded resources (timeouts, output caps,
> rlimits) — that is crash/hang containment, not a security boundary. The
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
  → candidate works locally (editor, files, local test runs)
  → app mirrors whitelisted events to the platform + keeps a local evidence log
  → candidate submits → app PATCHes the file snapshot into session state,
    then POSTs to the platform submit route (idempotent)
  → platform grades, employer reviews evidence (web)
```

## 2. Why desktop (and why Tauri)

- **Local execution without local setup.** The candidate runs the scenario's
  tests on their own machine; the app provisions the workspace from the
  session payload. Threat model is inverted vs server execution: the candidate
  already controls the host, so we need *bounded* execution (timeouts, output
  caps, CPU/memory limits, credential scrubbing), not tenant isolation.
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
4. Tokens (access + refresh) are stored in the OS keychain (`keyring` crate;
   best-effort — memory always works) and **never cross the IPC boundary**:
   `auth_session` returns only `{ signed_in, email, expires_at }`.
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
| Fetch session | `GET /api/sim/sessions/{id}` | user | `{ session: { id, status, durationMinutes, startedAt, endsAt, submittedAt, curveballPresentedAt, curveballAcknowledgedAt }, content, workbench, gate: { consentPolicyVersion, consentAccepted, preflightOk, preflightLimitations, desktopRequired }, state: { revision, currentTaskId, notes, deliverable, workspace, completedTaskIds }, messages: [{ id, thread, stakeholderId, sender, body, createdAt }] }`. `content` is the candidate-safe view (`src/lib/simulations/candidate-view.ts`): title, scenarioSummary, mission, tasks, resources, stakeholders, deliverableFields, curveball announcement. `gate.desktopRequired: true` already anticipates this client. |
| Consent | `POST /api/sim/sessions/{id}/consent` | user | `{ accepted: true, policyVersion }` → `{ ok, consentId, policyVersion }`; 409 on policy mismatch |
| Preflight | `POST /api/sim/sessions/{id}/preflight` | user | `{ viewportWidth, viewportHeight, userAgent, localStorageOk }` → `{ ok, preflightId, result, canStart }` |
| Start | `POST /api/sim/sessions/{id}/start` | user | → `{ ok, startedAt, endsAt }` (server clock starts) |
| State sync | `PATCH /api/sim/sessions/{id}/state` | user | `{ baseRevision, notes?, deliverable?, workspace?, currentTaskId?, completedTaskIds? }` → `{ ok, revision }` or 409 `{ ok: false, conflict: {...} }`; 409 also when not active |
| Events | `POST /api/sim/sessions/{id}/events` | user | `{ eventType, resourceId?, taskId?, payload?, clientEventId? }` → `{ ok, id, duplicate }`. Whitelist: `resource_opened, resource_downloaded, task_completed, task_reopened, notes_edited, deliverable_field_edited, workspace_action, curveball_acknowledged, table_sorted, table_filtered, row_flagged, ticket_selected, step_toggled, rule_reviewed, decision_selected, evidence_selected, deliverable_revised`. 400 on unknown type, 409 when not active |
| Submit | `POST /api/sim/sessions/{id}/submit` | user | `{ externalAiDisclosed?, answers? }` → `{ ok, submissionId, alreadySubmitted }` (idempotent; honors the `__aiDisclosure` key in answers) |

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
receipt over files + events → PATCH the snapshot into `state.workspace.files`
(one conflict retry) → POST submit with `{ answers: { handoff, __aiDisclosure:
{ used } }, externalAiDisclosed }` → persist `receipt.json` → lock the
workspace read-only. The local receipt covers the exact bytes; the platform
submission id is the durable handle.

**Workspace provisioning** (`session.rs::materialize_workspace`): the session
payload's candidate-safe `content` is written as a read-only `BRIEF.md`
(title, summary, mission, tasks, deliverable fields); `state.workspace.files`
(`{ path: content }`) is materialized as the editable file set when present;
`state.workspace.testCommand` (argv) is stored for the local test runner.

## 5. Layout

```
desktop/
  ARCHITECTURE.md            # this file
  src-tauri/
    Cargo.toml               # tauri 2, reqwest, keyring, url,
                             # tauri-plugin-{shell,opener,deep-link}
    tauri.conf.json          # deep-link scheme: fydell://
    src/main.rs              # app setup, plugin + deep-link registration, commands
    src/auth.rs              # system-browser sign-in, deep-link callback,
                             # keychain session, Supabase refresh, auth headers
    src/platform.rs          # typed client for src/app/api/sim/* (§4)
    src/session.rs           # idle → joined → active → submitted; join/consent/
                             # preflight/start; workspace materialization; state sync
    src/workspace.rs         # revision-checked file I/O, scoped to the workspace
    src/execution.rs         # bounded local test execution (timeouts, output
                             # caps, rlimits, credential scrubbing)
    src/events.rs            # local JSONL log + platform whitelist mapping
    src/submission.rs        # snapshot → PATCH → platform submit → receipt
  src/                       # frontend (Vite + React + TypeScript)
    App.tsx                  # sign-in → invite → consent → workspace → submitted
    components/Workspace.tsx # editor shell
    components/Panels.tsx    # brief, tests, team, submit (AI disclosure), timeline
    lib/tauri.ts             # typed Tauri command bindings
```

### Local test execution (`execution.rs`)

Spawns the scenario's declared runner (from `state.workspace.testCommand`)
as a child process in the workspace dir. Bounds: 120s wall-time timeout then
kill, 256 KiB stdout/stderr caps, CPU (60s) / address-space (512 MiB) limits
via `setrlimit` on Unix, credential-like env vars scrubbed, minimal PATH.
Raw output is preserved and shown to the candidate. This is hang/crash
containment on the candidate's own machine — not a sandbox, not isolation.

## 6. Web platform additions required (not built)

The desktop changes nothing outside `desktop/`. These small web-side additions
are required for the full loop; each is specified as a contract, not a mandate
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
- **W2 — Bearer token acceptance (required for non-browser clients).**
  `requireUser()` (`src/lib/simulations/auth.ts`) should, when no cookie
  session exists and an `Authorization: Bearer <jwt>` header is present, call
  `supabase.auth.getUser(jwt)` to validate it. Until then the desktop's cookie
  (verified format, §3) carries auth.
- **W3 — Scenario file package (required for multi-file code simulations).**
  The session API serves task/deliverable content but no versioned file
  package. Needed: per template version, a candidate-safe file map
  (`{ path: content }`, e.g. inside `state.workspace` or a new
  `/api/sim/...` route) plus an optional `testCommand` argv — excluding hidden
  evals, canonical answers, and secrets. Until then, code scenarios can only
  ship files the employer puts in `state.workspace.files`.
- **W4 — File snapshot on submit (needed for code tasks).** The submit route
  scores deliverable fields. Needed: accept a snapshot manifest
  (`{ path: sha256 }` + contents, or a bound upload) in the submit body so the
  graded artifact is the exact bytes the candidate ran. Interim (implemented):
  the desktop PATCHes files into `state.workspace` before submitting and
  keeps a local SHA-256 receipt of the exact bytes.

No Supabase dashboard changes are needed (the callback is issued by the web
app, not by Supabase's hosted authorize endpoint).

Desktop build configuration required: `FYDELL_PLATFORM_URL` (default
`http://localhost:3000`; production builds must set the real URL),
`FYDELL_SUPABASE_URL`, `FYDELL_SUPABASE_ANON_KEY` (public values).

## 7. Phased integrity (explicit, not silent)

- **V1 (this build):** honest local app. No lockdown claims. Evidence value
  comes from the realistic task, the test record, the event trail, and human
  review.
- **V2:** OS keychain for tokens (done in v1, actually — keyring), fullscreen
  focus mode (optional, explicit consent).
- **V3:** lockdown mode only if an employer requires observed conditions, only
  with explicit candidate consent and a visible indicator.

We will not claim proctoring we do not perform.

## 8. What remains unbuilt / unverified

- The app has never been compiled to a binary here (Rust `cargo check` blocked
  on system WebKit/GTK build deps in this VM — environmental, not a code
  verdict; TypeScript compiles clean).
- No packaged installer, signing, notarization, or auto-update (release gates).
- W1–W4 above are web-side and untouched by this branch.
- The end-to-end loop (install → sign in → join → work → submit → employer
  report) has never run against a live platform.
- Multi-device conflict handling, offline behavior, and accessibility of the
  desktop UI are not implemented.
- The cookie format assumption (§3) must be re-verified if `@supabase/ssr` is
  upgraded.

## 9. Non-goals for v1

- Employer-side desktop features. Employers stay on the web.
- Real-time employer observation of sessions.
- Offline-first (network required for sign-in, session sync, and submission).
- A second editor shell or external-editor integration.
