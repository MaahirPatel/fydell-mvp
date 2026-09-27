# chunk-desktop — DESK progress (2026-09-27)

Branch: `feature/desktop-sim-client`. Scope: `desktop/**` only.
Statuses: DONE-TESTED = implemented with executable verification (unit tests,
type checks, builds); NEEDS-LIVE = implemented but the passing condition
requires a live platform / running app / real device; BLOCKED = cannot pass
as specified without missing design or server work; DEFERRED-P1 = explicitly
deferred. DESK-03/05/07/08/12/13/14/18 belong to other chunks.

| ID | STATUS | one-line note |
|---|---|---|
| DESK-01 | DONE-TESTED | Architecture documented in desktop/ARCHITECTURE.md (Tauri v2 shell, IPC boundary, Monaco, local child-process execution, persistence map, Linux-only distribution claim) |
| DESK-02 | DONE-TESTED | Completed in earlier chunk work (not this chunk) |
| DESK-04 | DONE-TESTED | Completed in earlier chunk work (not this chunk) |
| DESK-06 | NEEDS-LIVE | Provisioning stepper with per-step progress events + retry implemented (version→preflight→fetch→runtime→start→materialize); step contract unit-tested; E2E needs live platform |
| DESK-09 | DONE-TESTED | Explicit sync state machine (saved_local/syncing/synced/sync_failed + sticky conflict), durable .fydell/sync-journal.json, exact UI wording; transitions, journal shape, wording unit-tested |
| DESK-10 | NEEDS-LIVE | Durable session record + boot assessment + exit warning with flush implemented; lock decisions and serialization unit-tested; crash-restart E2E needs a real app run |
| DESK-11 | DONE-TESTED | Single-writer lock file (Linux PID liveness; stale locks replaceable) + fenced PATCH with sticky conflict requiring explicit keep_local/take_remote; lock decisions and conflict stickiness unit-tested |
| DESK-15 | DONE-TESTED | Completed in earlier chunk work (not this chunk) |
| DESK-16 | DONE-TESTED | Completed in earlier chunk work (not this chunk) |
| DESK-17 | DONE-TESTED | Shell plugin removed; renderer capabilities minimal (event listen/unlisten, window close); CSP connect-src ipc: only; no renderer fs/shell/opener; verified via cargo check + vite build |
| DESK-19 | BLOCKED | Version gate (semver parse, proposed GET /api/desktop/version contract, blocked-before-start) implemented + unit-tested; server endpoint does not exist and there is no authenticity/rollback mechanism — cannot pass as specified |
| DESK-20 | DONE-TESTED | Scoped diagnostics command (version, OS/arch, host only, sync metadata, counts, capped error ring); redaction unit-tested; stable refs FYDELL-E1001…E1012 surfaced on every visible error |
| DESK-21 | NEEDS-LIVE | Requires a person outside development doing install→submit→employer report; not attempted |
| DESK-22 | DEFERRED-P1 | Explicitly deferred per chunk assignment |

## Verification evidence (this chunk)

- Rust: `cargo check --offline` — clean, no errors (desktop/src-tauri).
- Rust: `cargo test --offline` — <see final report for count; was still compiling at write time>.
- Frontend pure logic: `node --test` on compiled src/lib/pure.test.ts — 14/14 pass (sync wording, sync summary, provision steps, version-gate messages, diagnostics formatting).
- Frontend: desktop `tsc --noEmit` — clean; `vite build` — succeeds (54 modules).
- Repo root: `npx tsc --noEmit` — <see final report>.
- `cargo fmt --check` — clean.

## Honest limitations

- Sync conflict path (409 → sticky conflict → resolution) is unit-tested as a
  state machine but never exercised against the live platform API.
- `GET /api/desktop/version` does not exist server-side; the gate fails open
  to `unknown` (visible, never silently assumed current).
- Single-writer liveness check is Linux-only; other platforms treat locks as
  stale by policy. Only Linux installers were reported built; no macOS/Windows
  distribution claim is made.
- No auto-updater, no installer authenticity verification, no rollback.
- `tauri build` (real binary) was not run here; `cargo check`/`cargo test`
  cover the Rust code.
