# chunk-sim — WORK / SCEN / SIM grind progress (2026-09-28)

Branch: `feature/desktop-sim-client`. Scope: `src/lib/simulations/**` (except
`submission-files.ts`), `src/app/api/sim/**` (except `*submit*`, `*finalize*`),
`scenarios/**`, `js/sim/**`; new tests only as `scripts/test-sim-grind-*.ts`.
`package.json` untouched.

Statuses: DONE-TESTED = implemented with executable verification (direct `npx tsx`
runs, `npx tsc --noEmit`); NEEDS-LIVE = implemented but the passing condition
needs a live platform / DB / real device; DEFERRED-P1 = explicitly deferred.
Hard rules honored throughout: no fabricated statistics/testimonials/scores, no
automatic hiring decisions, no "AI-proof" claims, simulated teammates always
labeled, hidden answer-key content never candidate-visible.

| ID | STATUS | one-line note |
|---|---|---|
| WORK-01 | DONE-TESTED | project-relay remediated: candidate stub, clean red/green states verified in-process, answer-key leak scrubbed, internal rubric documents intended regression / permitted fixes / tests / clarification facts / requirement update |
| WORK-02 | DONE-TESTED | evidence coverage + deterministic correctness backing validated across all shipped sims; four-dimension validator proven on a realistic fixture |
| WORK-03 | DONE-TESTED* | server-timestamped interruption ledger, fair deadline math, accommodation extensions, idempotent connectivity-restoration credit (pure logic tested; *Supabase-backed credit path in events route is code, NEEDS-LIVE) |
| WORK-04 | DONE-TESTED | deterministic requirement-update milestones; early submission blocked or marked intentional partial with unobserved dimensions named |
| WORK-05 | DONE-TESTED | authored replies deterministic + stable; per-candidate hint/fact ledger; AI-redraft prompt constrained to the approved reply (wire-level test) |
| WORK-06 | DONE-TESTED | AI provenance classification (external use never "observed"); candidate-facing policy text now served in the session payload |
| WORK-07 | DONE-TESTED | culture-fit language scan clean across all shipped sims, stakeholder blurbs included |
| WORK-08 | DONE-TESTED | process observations derived only from real event shapes; modesty validator rejects overclaims |
| WORK-09 | DONE-TESTED | form key pins template/version/cohort; no silent personalization in any shipped sim |
| WORK-10 | DEFERRED-P1 | explicitly deferred per chunk assignment |
| SCEN-01 | DONE-TESTED | project-relay: versioned runner + fixtures + manifest-hashed package (v2.0.1) |
| SCEN-02 | DONE-TESTED | rubric validator covers correctness / judgment / response-to-requirements / communication with observable anchors (proven on fixture; no long-form content published yet) |
| SCEN-03 | DONE-TESTED | red state (3 fix-dependent tests fail cleanly) and green state (6/6 pass, evals zero failures) verified in-process via direct test invocation |
| SCEN-04 | DONE-TESTED | package built from allowlist only; canonical.json and .fydell/ excluded by construction; traversal in allowlist rejected |
| SCEN-05 | NEEDS-LIVE | clean-machine/OS install verification requires real machines |
| SCEN-06 | NEEDS-LIVE | desktop preflight checks live in another chunk's route (untouched here); session payload surfaces preflight status |
| SCEN-07 | DONE-TESTED | AI policy explicit in candidate payload; permitted use not penalized; self-reported vs observed distinguished |
| SCEN-08 | DONE-TESTED | extension/accommodation API with auditable reasons; fair response window after requirement updates |
| SCEN-09 | DONE-TESTED | immutable versioned publishing; internal rubric records known issues / intended failures / expected outcomes; human review marked pending; reference answers access-controlled |
| SCEN-10 | DEFERRED-P1 | explicitly deferred per chunk assignment |
| SIM-01 | DONE-TESTED* | attempt binding/resume-key/resume rules tested in-process; *DB persistence of attempts NEEDS-LIVE |
| SIM-02 | NEEDS-LIVE | unified desktop workspace is the desktop chunk's surface; this chunk's contribution (versioned filePackage provisioning) is tested |
| SIM-03 | DONE-TESTED | simulated teammates labeled in every candidate view (micro, v2, long-form) |
| SIM-04 | DONE-TESTED | authored truth only; onceOnly semantics; fallback never invents requirements or grading secrets |
| SIM-05 | DONE-TESTED | deterministic server milestones; fair 10-minute response window; exposure + acknowledgment recorded |
| SIM-06 | DONE-TESTED* | intake contract tested (allowlist, banned captures, deterministic client ids, no-duplicate proactive); *Supabase dedupe of message/state retries NEEDS-LIVE |
| SIM-07 | DONE-TESTED* | degraded-streak counting fixed against route-realistic event ordering (authored fallbacks no longer reset the streak; only healthy ai_redraft does); threshold declares outage + extends deadline; scoring floor protects candidates (*live provider-failure path NEEDS-LIVE) |
| SIM-08 | DONE-TESTED | capture boundary validated: disclosed taxonomy only, banned captures (file focus, external tools, etc.) rejected |
| SIM-09 | DONE-TESTED | four-field handoff validated; submission-specific follow-up accepted/rejected on substance |
| SIM-10 | DEFERRED-P1 | explicitly deferred per chunk assignment |
| E2E-04 | DONE-TESTED* | full attempt lifecycle (bind → clock → chat → proactive → update → submit) green in-process; *fresh-install journey on a clean OS NEEDS-LIVE |
| E2E-24 | DONE-TESTED* | partial → update → resumed completion flow green in-process with forbidden-claim enforcement; *live DB-backed path NEEDS-LIVE |

## Fixes landed this session (2026-09-28)

- **Outage streak never fired (SIM-07):** `countConsecutiveDegraded` broke on every
  `message_received`, but each degraded redraft also records the authored fallback
  reply — the streak could never exceed 1 in production. Now only a healthy
  `ai_redraft` reply (or recovery/outage) resets the streak. The messages route
  also counted on a pre-record snapshot (always one behind); it now records the
  degraded event first and counts on the refreshed trail. `evaluateOutage`
  contract clarified: `consecutiveDegraded` includes the current attempt.
- **Auto-advance in v2 analysis:** `v2/run.ts recommendationFor` returned
  `"advance"` for strong/established bands — an automatic hiring decision. Now
  resolves to `"review"`; regression-guarded by a source scan in the journey test.
- **Connectivity credit:** `connectivity_restored` now triggers an idempotent
  deadline extension (`pendingConnectivityExtensions`, keyed on the stable ledger
  id, credited once) in the events route, using server timestamps.
- **Policy exposure:** session GET now returns a `policies` block (AI-use policy,
  telemetry disclosure, disclosed event taxonomy, handoff fields).
- **Internal rubric:** `scenarios/project-relay/.fydell/rubric.json` (internal,
  never packaged) with dimensions, observable anchors, intended regression,
  permitted fixes, clarification facts, requirement update, known issues,
  intended failures, expected outcomes; human review marked **pending**.
- **Test hygiene:** all five grind tests rewritten as self-contained
  `scripts/test-sim-grind-*.ts` (inline harness + inline `server-only` stub +
  dynamic imports); temporary `scripts/sim-test/` helper files deleted.

## Verification evidence (this chunk)

- `npx tsx scripts/test-sim-grind-timing.ts` — 53 passed, 0 failed
- `npx tsx scripts/test-sim-grind-teammates.ts` — 78 passed, 0 failed
- `npx tsx scripts/test-sim-grind-milestones.ts` — 37 passed, 0 failed
- `npx tsx scripts/test-sim-grind-content.ts` — 239 passed, 0 failed
- `npx tsx scripts/test-sim-grind-journey.ts` — 53 passed, 0 failed
- **Total: 460 assertions, 0 failures.** Run directly, no preload/helper files.
- `npx tsc --noEmit` — clean, exit 0, no errors. (Earlier stale incremental
  errors referencing `desktop/node_modules.hidden` resolved after the repo's
  "Exclude desktop/ Tauri app from Next.js type-check" commit.)
- Scenario red/green: stub restored (`NotImplementedError`); evals fail gracefully
  on the stub; temporary correct implementation passed 6/6 then was removed.
- `canonical.json` excluded from the candidate package by construction (asserted
  in tests); `.fydell/` internals likewise excluded.
- Versions consistent: `scenario.json`, `canonical.json`, `rubric.json`,
  package manifest all `2.0.1`.

## Live verification still required (exact list)

1. SCEN-05: clean-machine install + core workflow on declared OS versions.
2. WORK-03/SIM-06: Supabase-backed deadline credit and message/state dedupe
   against a live database.
3. SIM-07: sustained LLM-redraft failure against a live provider (outage
   declaration + 5-minute extension).
4. E2E-04: full fresh-install candidate journey on a clean supported OS.
5. E2E-24: live partial → update → resume path against the database.
6. Human review of project-relay scenario + rubric (marked pending).
7. Submit/finalize integration of candidate-visible policies (belongs to the
   submit chunk; not modified here).
