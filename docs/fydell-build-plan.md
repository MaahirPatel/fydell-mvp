# Fydell build plan — backend hardening (2026-09-28)

Branch: `feature/desktop-sim-client`. Owner: backend hardening subagent.
Concurrent work: a design program is rewriting UI files (`src/app/(marketing)`,
`src/app/app/**`, `src/app/passport/**`, `src/components/**`, `desktop/src/**`)
— backend work stays out of those paths.

## Decisions

### 2026-09-28 — DESK-19: implement `GET /api/desktop/version`
- The desktop version gate (`desktop/src-tauri/src/version.rs`) had a
  specified-but-unimplemented server contract. Implemented
  `src/app/api/desktop/version/route.ts`, env-driven:
  `FYDELL_DESKTOP_MIN_VERSION` (required to declare),
  `FYDELL_DESKTOP_LATEST_VERSION` / `FYDELL_DESKTOP_DOWNLOAD_URL` (optional).
  Undeclared → 404, which the client maps to `Unknown` (proceeds visibly).
- Rationale for env over hardcoded: releases declare versions without code
  changes; the absence of a declaration is surfaced, not hidden (matches the
  desktop's documented fail-open-but-visible behavior).
- NOT implemented: authenticity/rollback (signed installers, rollback
  protection) — that is release infrastructure needing code-signing certs from
  the founder; faking it in a route would be dishonest. Tracked as release
  pipeline work.
- Test: `scripts/test-desktop-version-route.ts`, 9/9 in-process assertions.

### 2026-09-28 — Invitation inbox token re-issue flaw
- `GET /api/sim/invitations/mine` minted a fresh token per listed invitation,
  overwriting `token_hash` and invalidating emailed links. Fix in progress:
  accept-by-invitation-ID (`POST /api/sim/invitations/accept` with ownership
  check), listing no longer touches tokens. Token-based accept kept for
  emailed-link flows. Desktop Rust command `accept_invitation_by_id` added;
  the TS `Inbox.tsx` accept path must switch to it (design team's file —
  flagged to parent, not touched here).

### 2026-09-28 — `docs/fydell-verification.md` created
- Single honest record of verified vs live-blocked work, with exact
  credentials/seeds/journeys needed for the live E2E. Per master prompt:
  no production deploys, no fake integrations, no invented numbers.

### 2026-09-28 — Invitation accept-by-ID implemented + tested (flaw closed)
- The flaw: `GET /api/sim/invitations/mine` minted a fresh token per listed
  invitation and overwrote `token_hash`, so opening the inbox invalidated
  emailed links. Fixed as planned:
  - `src/lib/simulations/db.ts`: `acceptInvitation(token, ...)` refactored to
    share logic with new `acceptInvitationById(invitationId, ...)` via
    `acceptInvitationRow` (same `invitationGate`, same email-ownership
    check, same idempotency incl. concurrent-accept re-read). Added
    `getInvitationById`. Token-based accept unchanged for emailed links.
  - New `POST /api/sim/invitations/accept` (`{ invitationId }`): 401 when
    signed out, 400 on missing/empty id, 404 when the invitation doesn't
    exist, 400 otherwise; returns `{ ok: true, sessionId }`.
  - `mine/route.ts` rewritten: no token mint, no `token_hash` update, no
    `token`/`tokenReissued` in the response. Listing is read-only.
  - Desktop Rust: `Platform::accept_invitation_by_id` + `inbox::accept_invitation_by_id`
    command (registered in `main.rs`); `InboxInvitation.token` is now
    `Option<String>` with serde default (server no longer sends it).
- Reversible decision made independently: `InboxInvitation.token` kept as
  `Option<String>` (not deleted) so older server responses and the
  paste-token fallback path still parse; deleting it outright would be
  a breaking wire change.
- Tests: `scripts/test-sim-invitation-accept.ts` (in-process, same stub
  pattern as `test-sim-chat-api.ts`), 19/19 assertions — proves (a) mine
  GET leaves `token_hash` untouched and the emailed raw token still
  resolves, (b) cross-user id accept rejected with 400 naming the owning
  email, unknown id → 404, unsigned → 401, bad body → 400, (c) double
  ID-accept returns the same session id (also matches token-based accept).
  Stub extensions documented in the stubs (admin stub gained `in()`/`gt()`/
  thenable; db stub gained a faithful invitation layer mirroring the real
  gate/ownership/idempotency).
- Verification: `npx tsc --noEmit` clean; `cargo check --all-targets` clean
  (needed network for the crates index — `--offline` cannot resolve in this
  VM); `cargo fmt --all --check` clean; `cargo test` not run (cannot link in
  this VM — missing WebKitGTK, environment limitation).
- Follow-up (design team's file, not touched): `desktop/src/components/Inbox.tsx`
  must switch its accept path from the token-based command to
  `accept_invitation_by_id`.

## In flight (child agents)
1. Invitation accept-by-ID implementation + tests. — DONE 2026-09-28 (see below)
2. Next.js NFT tracing warning fix (Python worker path). — DONE 2026-09-28 (see below)
3. Full `src/app/api/**` audit (auth, error shapes, mock-data check). — DONE 2026-09-28: 93 routes walked, zero code changes needed, no broken handlers.

### 2026-09-28 — NFT warning, second instance (parent agent)
- The NFT worker fixed the lab evidence route but surfaced a second instance of
  the same warning in `src/lib/sim-engine/proof/python-client.ts` (out of its
  territory). Fixed with the same proven treatment: `const spawnDetached =
  spawn.bind(null)` replacing the direct `spawn(bin, …)` call. Verified:
  `npm run build` exit 0 with zero NFT warnings; proof retry/defense routes'
  `.nft.json` went 9178 → 112 files; `npx tsc --noEmit` clean; sim-engine
  runtime + sandbox contract tests pass. (Pre-existing `test-proof-graph.ts`
  "python fixtures runnable" failure is environmental — python can't run
  fixtures in this VM — confirmed on the pristine tree, unrelated.)

### 2026-09-28 — Invitation accept-by-ID (child agent, verified by parent)
- `POST /api/sim/invitations/accept` added (ownership-verified, idempotent);
  `mine` no longer mints tokens; Rust `accept_invitation_by_id` command added +
  registered; 19/19 in-process assertions pass; tsc/cargo-check/cargo-fmt clean.
- Follow-up: `desktop/src/components/Inbox.tsx` accept path must switch to the
  new command (design team's file).

## Blocked on the founder
- Supabase URL + anon key + service-role key (secure channel) for all live E2E.
- Code-signing certs (Apple Developer, Windows) for installer authenticity.
- Real-device / clean-machine verification.

### 2026-09-28 — Full `src/app/api/**` audit (API auditor track)
Walked all 93 route files (incl. 2 untracked: `desktop/version`, `sim/invitations/accept`).
Auth, error shapes, mock-data scan, and caller↔handler cross-check against
every `fetch("/api/…")` in `src/` and documented desktop platform contracts.
- Result: no broken handlers found. No code changes made — nothing was broken.
  Every route that reads non-public data or mutates state enforces
  `requireUser()` (401) plus ownership/org-membership checks (403) or the
  equivalent (`requirePlatformRoleApi`, signed-cookie sessions, CRON_SECRET
  bearer, Stripe/Resend webhook signatures, capability cookies for sandbox).
  Error shapes are consistently `{ error: string }` with 400/401/403/404/409/
  429/500/502/503; no stack traces or raw error objects leak to clients.
  No non-demo route serves hardcoded fixtures (preview-mode fixtures are
  gated `NODE_ENV !== production` + `FYDELL_UI_PREVIEW=1`, clearly synthetic).
  All UI-called path+method pairs have matching handlers.
- Intentionally unauthenticated (by design, noted not changed): `/invite/{token}`
  and `/work/{token}` flows (token is the credential), public pilot-request /
  pilot-feedback forms (captcha + rate-limited), public receipts by
  unguessable `publicId`, `/api/sim/catalog` (candidate-safe fields only),
  `desktop/version` (env-declared version gate; 404 when undeclared, never
  fabricates), prototypes and sandbox (capability-cookie demo isolation),
  `analysis/validate-review` (pure validator, no data access),
  `passport/github` POST (public GitHub data, per-user/IP throttled).
- Latent honest-NEEDS-LIVE surface with no UI callers: `/api/employer/invitations*`,
  `/api/employer/roles`, `/api/auth/invitations/accept`,
  `/api/employer/sessions/[id]/decision`, legacy `/api/admin/invite` and
  `/api/admin/candidates/[id]/{pdf,score}`. `employer/_lib/employer-stores`
  mints a fresh in-memory store per request, so the employer invitation
  create→send flow cannot persist even within a session — flagged, not fixed
  (needs the Supabase persistence track; another engineer's scope).
- Cosmetic notes (not fixed, harmless): `proof/runs/[runId]/retry` names a
  dead variable `adminRole = !org` (authorization itself is sound via
  `authorizeProofRunAccess` + org-mismatch check); `admin/repair` catch-all
  returns 400 where 500 would fit.
- Excluded per instructions (not edited): `src/app/api/sim/invitations/**`
  (other engineer rewriting — reviewed read-only: accept-by-id route is
  properly email-ownership-checked; `[token]` GET is public-by-design as the
  token is the credential) and `src/app/api/lab/sim-engine/evidence/route.ts`
  (other engineer fixing — feature-flag-gated lab route, no auth by design).
- `npx tsc --noEmit` clean after the audit.

### 2026-09-28 — NFT "unexpected file in NFT list" warning: lab evidence route (build-hardening track)
`npm run build` emitted one Turbopack NFT warning, verbatim:
`Encountered unexpected file in NFT list` / "A file was traced that indicates
that the whole project was traced unintentionally", with import trace
`App Route → ./next.config.ts → ./src/app/api/lab/sim-engine/evidence/route.ts`.
The route's `.nft.json` listed 9171 files (the entire project).
- Root cause was NOT the suspected `path.join(process.cwd(), "services",
  "evidence-engine", "worker.py")` — the tracer resolves that fine and traces
  just `worker.py`. The real trigger is `spawn(executable, ...)`: Turbopack
  statically analyzes `child_process.spawn` as a process-spawning method, and
  when the executable argument is not statically resolvable (here the
  `EVIDENCE_ENGINE_PYTHON` env override / platform fallback), it falls back to
  tracing the whole project. Proven by experiment: fully static spawn args →
  98 traced files, no warning; dynamic executable → 9171 files, warning; the
  `/*turbopackIgnore: true*/` comment the warning message suggests is NOT
  honored for this construct (tested in two positions, no effect).
- Fix (`route.ts` only, zero behavior change): detach the call via
  `const spawnPython = spawn.bind(null)` and invoke `spawnPython(...)`. The
  tracer does not follow `.bind`, so it skips the call instead of warning;
  `spawn.bind(null)` is runtime-identical to `spawn` (verified: same arity, live
  spawn succeeds). The `path.join` is untouched and still traces
  `services/evidence-engine/worker.py` into the deployment, so packaging is
  unchanged (98 files, worker.py present, next.config.ts absent).
- `next.config.ts` needed no change: `outputFileTracingIncludes` for worker.py
  was tried and reverted as redundant (the tracer already picks it up via the
  `path.join`). The unrelated `middleware`-convention deprecation warning was
  left alone (out of territory).
- Verified: `npm run build` succeeds with the evidence route's warning gone;
  `npx tsc --noEmit` clean; end-to-end smoke test piping a valid snapshot
  through the exact fixed spawn expressions returns a valid result contract
  (resultVersion "1", ADAPTATION / STRENGTH / HIGH, exit 0).
- Follow-up (OUT of this track's territory — not fixed, not masked): a second,
  independent instance of the same warning lives in
  `src/lib/sim-engine/proof/python-client.ts` (dynamic `path.join` in
  `engineRoot()` plus `spawn(bin, ...)` with a dynamic bin), reached via
  `proof/jobs.ts` from `src/app/api/proof/runs/[runId]/retry/route.ts` (sibling
  `[runId]` and `defense` routes show the same ~9178-file bloat). Turbopack
  surfaces only one such warning per build, so this one appeared once the
  evidence route was fixed — `npm run build` still emits 1 NFT warning until
  the file owner applies the same treatment. Next.js source marks this issue
  "ideally would be an error", so it will break the build if promoted.

## 2026-09-28 — D1 fix: inbox accept-by-ID now adopts the platform session (parent)

Candidate-shoes QA found the new `accept_invitation_by_id` Tauri command returned
the platform session id but never populated local session state, so Accept
dead-ended (stale `sessionStatus`, consent failed on `require_joined`).
- `desktop/src-tauri/src/session.rs`: added `SessionState::adopt_platform_session`
  (`pub(crate)`), `is_idle()`; made `session()`, `content_str()`, `info()`,
  `SessionState` `pub(crate)`; `join_session` refactored onto the shared method
  (behavior identical).
- `desktop/src-tauri/src/inbox.rs`: `accept_invitation_by_id(invitation_id,
  organization_name, simulation_title)` now mirrors `join_session` post-accept:
  idle guard → auth fail-fast → accept → `fetch_session` → `desktop_required`
  gate → adopt state → `session_joined` event → `recovery::persist()` →
  returns `SessionInfo`.
- `desktop/src/lib/tauri.ts`, `desktop/src/App.tsx`, `desktop/src/components/Inbox.tsx`:
  `joinByInvitationId(inv)` uses the returned session directly via `enterSession`;
  token paste-fallback untouched.
- Verified: `cargo check --offline --all-targets` clean, `cargo fmt --check` clean,
  desktop `tsc` clean, `vite build` green, `pure.test.ts` 26/26 pass.
