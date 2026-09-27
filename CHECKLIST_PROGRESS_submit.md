# Checklist progress — chunk-submit (UP-01..UP-08, snapshot-transfer state machine, DESK-15/DESK-16)

Branch: `feature/desktop-sim-client`. Authoritative checklist: `~/workspace/fydell/RELEASE_CHECKLIST.md`.
Worker: subagent grind, 2026-09-27. Builds on W3/W4 (commit 9162ad3) — not redone, only extended.

Statuses: DONE-TESTED | NEEDS-LIVE | MANUAL-OK | DEFERRED-P1 | BLOCKED

| ID | STATUS | one-line note |
|---|---|---|
| UP-01 | DONE-TESTED | Direct snapshot intake via submit/finalize routes (no ZIP in primary path); path/type/byte/count/manifest limits enforced server-side; starter-package allowlist exclusion is pre-existing W3 (test-file-package). |
| UP-02 | DONE-TESTED | Session ownership enforced per request (swapped ids → FORBIDDEN); crossed manifests rejected (SCENARIO_MISMATCH/VERSION_MISMATCH); bearer tokens validated server-side (pre-existing W2). |
| UP-03 | DONE-TESTED | Transfer state machine enforced server-side (SQL `submit_transfer_transition` + pure TS mirror); idempotent finalization under retry storms; interrupted sync never appears submitted; reconnect reconciles via GET finalize. (Migration 030 SQL reviewed; needs live DB apply.) |
| UP-04 | DONE-TESTED | Adversarial path/content validation: traversal, absolute, backslash, NUL, control chars, empty segments, overlong paths/segments, case-insensitive duplicates, per-file/total/count limits; 56 in-process checks. |
| UP-05 | DONE-TESTED | Server-computed deterministic receipt hash over canonical manifest encoding; `sim_submissions.snapshot` immutable via trigger (030); transfer `accepted` is terminal. (Trigger SQL reviewed; needs live DB apply.) |
| UP-06 | DONE-TESTED | Durable receipt (submission id + server receipt hash + timestamp + state); operation-id idempotency: 25-way concurrent retry storm → exactly 1 atomic submit, 1 receipt; double-click = one operation. |
| UP-07 | DONE-TESTED | Hostile filenames rejected (PATH_UNSAFE) or rendered safely (`sanitizeDisplayPath` + `escapeHtml`, 56 checks incl. `<script>`/event-handler names); symlinks unrepresentable in JSON snapshot format; contents stored opaquely, never executed/evaluated. |
| UP-08 | DONE-TESTED | Every rejection is `{code, message, recovery}` with actionable next step and `workPreserved: true`; infra failures → INFRA_ERROR (502), never framed as skill-test failures; secret-leakage corpus (file contents, digests, DB text) asserted absent from all messages. |
| STATE-SNAP | DONE-TESTED | `local_draft → syncing → server_saved → submitting → accepted/rejected/failed` enforced server-side; stale `from`/illegal moves refused (no regressions); same-state repeats idempotent; finalize walks legal edges only. (SQL reviewed; needs live DB apply.) |
| DESK-15 | DONE-TESTED | Double-click / network retry yields one receipt: client operation id + transfer-state CAS + idempotent `submit_session_atomic`; concurrent same-op requests report in-flight instead of duplicating. |
| DESK-16 | DONE-TESTED | Lost submit response → GET `/finalize` (or retry with same operation id) recovers the existing receipt; submission row is the source of truth when the transfer record is missing. |
| E2E-20 | DONE-TESTED | In-process lost-submit-response test: accepted server-side, response "lost", recovery returns identical receipt + submission id, retry is `alreadySubmitted`, atomic submit count stays 1. |

## Test evidence (all in-process with fakes; run via `npx tsx scripts/<name>.ts`)
- `scripts/test-submit-grind-paths.ts` — 56/56 (UP-04/UP-07 adversarial).
- `scripts/test-submit-grind-state-machine.ts` — 62/62 (transition legality, terminal `accepted`, stale-from refusal, concurrent CAS).
- `scripts/test-submit-grind-finalize.ts` — 124/124 (retry storms, lost-response recovery, UP-02 swapped/crossed, UP-08 actionability + leakage corpus, sync lifecycle).
- `npx tsc --noEmit`: 25 errors repo-wide, all pre-existing in other chunks' areas; **zero** in `src/lib/submissions/**`, `src/lib/simulations/submission-files.ts`, or the submit/finalize routes.

## Live-verification gaps (for parent)
1. Apply `supabase/migrations/030_submit_transfer_state.sql` to the live DB (note: used 030 because 029 was already taken by `029_engineering_profiles.sql`).
2. Run one real finalize against live Supabase to exercise `submit_transfer_transition` + immutability trigger in Postgres.
3. Desktop client must send a stable `operationId` per submit click and drive `begin_sync`/`sync_failed` for progress UI (server honors them; client wiring is the desktop chunk's).
4. Client-side snapshot builder must scope files to the scenario workspace (server cannot distinguish a smuggled `.env` under a legal relative path).
