# chunk-orphans — DEMO/DESK orphan grind (2026-09-28)

Branch: `feature/desktop-sim-client`. Scope: `src/lib/demo/**`, `src/lib/desktop/**`,
`scripts/test-orphans-grind-*.ts` only. No commits made (parent handles staging).
Statuses: DONE-TESTED = implemented with executable verification (pure rules +
in-process tests); NEEDS-LIVE = implemented but the passing condition requires a
live platform / running app / real device / release infra.

These 15 IDs were unclaimed by every other chunk (DEMO-05 went to the ops chunk;
DESK-01/02/04/06/09/10/11/15/16/17/19/20/21/22 went to the desktop chunk).

| ID | STATUS | one-line note |
|---|---|---|
| DEMO-01 | DONE-TESTED | Canonical 8-beat product story contract (finding→passport→workspace→code→teammate→submission→report→sharing); order/completeness validation unit-tested |
| DEMO-02 | DONE-TESTED | Inspectable fixtures: openable source citation, code/test/message evidence kinds, passing+failing tests, readable thread, sharing preview; label audit unit-tested |
| DEMO-03 | DONE-TESTED | Deterministic Candidate01 fixtures, visible sample-data label on every fixture, demo-scan disclaimer + copy-honesty guard (rejects "we scanned your repository"); unit-tested |
| DEMO-04 | DONE-TESTED | Adapters mapping demo fixtures onto the real component contracts (PassportData, NorthlineClaim/Citation, thread props); completeness asserted; unit-tested |
| DEMO-06 | DONE-TESTED | Conversion context retains audience + sanitized route, drops all fictional evidence/namespace (server half already in demo-isolation.ts); unit-tested |
| DEMO-07 | DONE-TESTED | Desktop explainer content model: every capability labeled simulated vs requires_install, Linux-only platform matrix with installer formats + install notes; unit-tested |
| DEMO-08 | NEEDS-LIVE | P1 sample-run eligibility gate implemented + unit-tested; cost/abuse/reliability preconditions unverified and no sandbox run path exists |
| DESK-03 | NEEDS-LIVE | Release manifest contract (per-OS signature + version + publisher + source) and unsafe-advice guard unit-tested; real signing/platform-PKI verification needs release infra |
| DESK-05 | DONE-TESTED | Assignment deep-link parse + resolution: opens only already-authorized attempts; expired/wrong-account/unknown links return recovery explanations; unit-tested with fakes |
| DESK-07 | DONE-TESTED | Editor state machine: tabs, undo/redo, find/replace, dirty tracking, read-only protected files, scenario create/rename/delete rules; unit-tested |
| DESK-08 | NEEDS-LIVE | Input-latency budget (50ms), large-file windowing, log tailing, no-network keystroke invariant; classification unit-tested; hardware measurement on lowest supported laptop required |
| DESK-12 | DONE-TESTED | Snapshot hashing (order-independent sha256) bound to run records; stale results labeled "Results from an earlier version"; unit-tested |
| DESK-13 | DONE-TESTED | Run lifecycle state machine, approved-command allowlist, stop/retry, bounded output with honest truncation, resource caps, "Test output" panel labeling; unit-tested |
| DESK-14 | DONE-TESTED | Brief versioning, teammate updates with unread counts, handoff note, editor-reserved shortcuts that app chrome cannot override; unit-tested |
| DESK-18 | DONE-TESTED | Account+attempt cache scoping, sign-out plan (warn-and-keep vs purge), purge manifest, token rules (OS-protected storage only); unit-tested |

## Verification evidence (this chunk)

- `npx tsx scripts/test-orphans-grind-demo.ts` — 48/48 pass (DEMO-01..08).
- `npx tsx scripts/test-orphans-grind-desk.ts` — 79/79 pass (DESK-03/05/07/08/12/13/14/18).
- `npx tsc --noEmit` — clean, exit 0, zero errors (was briefly 1 error in
  adapters.ts `capabilities.source`; fixed to `"rules"` + fixture `note`).

## Files added (13 lib modules, 2 test scripts)

- `src/lib/demo/story.ts` (DEMO-01)
- `src/lib/demo/fixtures.ts` (DEMO-02, DEMO-03)
- `src/lib/demo/adapters.ts` (DEMO-04)
- `src/lib/demo/conversion.ts` (DEMO-06)
- `src/lib/demo/desktop-preview.ts` (DEMO-07)
- `src/lib/demo/sample-run.ts` (DEMO-08)
- `src/lib/desktop/assignment-links.ts` (DESK-05)
- `src/lib/desktop/editor-state.ts` (DESK-07)
- `src/lib/desktop/responsiveness.ts` (DESK-08)
- `src/lib/desktop/run-controls.ts` (DESK-12, DESK-13)
- `src/lib/desktop/work-comms.ts` (DESK-14)
- `src/lib/desktop/privacy-lifecycle.ts` (DESK-18)
- `src/lib/desktop/distribution.ts` (DESK-03)
- `scripts/test-orphans-grind-demo.ts`, `scripts/test-orphans-grind-desk.ts`

No files outside this scope were modified. No commits made.

## Honest limitations

- DEMO-01..04/06/07: the pure contracts are tested, but the rendered 8-beat
  demo flow, adapter wiring into the live `/demo` page, and visual preview
  assembly need the running app (page exists today with a 4-step ProductStage).
- DEMO-08: gate only. No sandbox execution path, no cost/abuse/runtime
  verification — the actual sample run is future P1 work.
- DESK-03: no real signing, no platform-PKI verification, no release pipeline.
- DESK-05: route/session wiring (real stores, auth) not done here — resolution
  logic is injected and fake-tested.
- DESK-07/08: Monaco wiring and on-device latency measurement not done;
  budgets are asserted, hardware proof is NEEDS-LIVE.
- DESK-12/13: snapshot/run-control logic is standalone; binding it into the
  real sim run pipeline (sim-engine runtime) is integration work for the sim
  chunk, not duplicated here.
- DESK-18: OS keychain access is platform code, not implemented here.
