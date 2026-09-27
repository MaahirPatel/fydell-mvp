# Checklist progress — chunk-analysis (AI-01..AI-14, RUN-01..RUN-09, E2E-05..08)

Branch: `feature/desktop-sim-client` (stayed on it; did not commit — parent checkpointed as `cc8bb75`).
Builds on the existing code-analysis prototype (commit `10a7c22`, `src/lib/code-analysis/`): AST extraction,
detectors, and its 10-expectation eval were inspected and NOT redone.

Statuses: DONE-TESTED | NEEDS-LIVE | MANUAL-OK | DEFERRED-P1 | BLOCKED

| ID | STATUS | one-line note |
|---|---|---|
| AI-01 | DONE-TESTED | Deterministic vs interpretive sections are separate types AND runtime-checked: model JSON declaring test verdicts (`testsPassed`, nested `suitePassed`, …) is rejected; 9 in-process tests |
| AI-02 | DONE-TESTED | `buildInputBundle` pins starter/submission/tests/events/transcript by sha256; `.env`/`node_modules`/secrets omitted with reasons; oversize files truncated and tracked; 5 tests |
| AI-03 | DONE-TESTED | 4-dimension rubric with evidence requirements, level anchors, severity guidance, limitations; no evidence → `insufficient_evidence` (never default pass/fail); alternatives explicitly allowed; tested |
| AI-04 | DONE-TESTED | Citation validator: material findings need ≥1 citation to valid snapshot lines / recorded test outputs / transcript messages; out-of-range, unknown-file, and missing citations fail; 18 tests; also enforced by `POST /api/analysis/validate-review` |
| AI-05 | DONE-TESTED | Candidate content quarantined as labeled data; reviewer prompt states instruction hierarchy; reviewer tool allowlist is exactly `read_evidence, cite_source_lines, request_human_review` (no messaging/billing/secrets/permissions); hostile paths neutralized; 27 adversarial tests. No "AI-proof" claim — attack surface is bounded and tested |
| AI-06 | DONE-TESTED | Model-output schema/label/bound/contradiction validation; invalid output → `retry` (structural) or `human_review` (judgment) — never a fabricated complete report; 13 tests |
| AI-07 | DONE-TESTED | `groundClaims`: reproduced-defect requires failing test or defect-role citation, else demoted to hypothesis; style demoted to observation (never a defect); tested |
| AI-08 | DONE-TESTED | Communication assessed narrowly (clarification/uncertainty/impact/handoff, each cited); culture-fit/personality/accent/sentiment/suitability phrasing rejected; 16 tests |
| AI-09 | DONE-TESTED | `reconcileHandoff`: handoff claims vs harness record → agrees/disagrees/unverifiable; accurate self-assessment recorded, never used to upgrade failing code; tested |
| AI-10 | DONE-TESTED | Provenance pins evaluator/rubric/prompt/model versions + input hashes; overrides require editor+change+reason (append-only); revisions retain superseded versions; tested |
| AI-11 | DONE-TESTED | 22-fixture labeled benchmark (correct/partial/alternative/broken/adversarial) run through the deterministic pipeline: precision 1.00 / recall 1.00 over 9 bug+security expectations; CALIBRATION set, not predictive validity; 6 blind spots documented in `labels.json`; repeat-run consistency not yet measured |
| AI-12 | MANUAL-OK | QA gate state machine + workload/turnaround tracking implemented and tested in-process; the actual verification of consequential findings is human by definition — unclear cases stay pending, no auto-approve |
| AI-13 | DONE-TESTED | Minimization allowlist (submission/starter/surrounding/test/event/transcript only, each justified); credential patterns never sent; policy doc refuses unverified no-training claims — provider retention/training settings must still be verified at deploy time |
| AI-14 | DEFERRED-P1 | P1 per checklist: automation expansion gated on measured errors/consistency/reviewer agreement, none measured yet |
| RUN-01 | NEEDS-LIVE | Sandbox spec codified + validated (no host mounts, no docker socket, no prod creds, pinned digest); validator tested incl. hostile spec — real sandbox verification required before release |
| RUN-02 | NEEDS-LIVE | Egress-deny default, allowlist rules, CPU/mem/disk/process/time/concurrency limits in spec; validator tested — live enforcement verification required |
| RUN-03 | NEEDS-LIVE | Pinned-digest requirement enforced by validator (placeholder digest is flagged until deploy substitutes the real one); controlled-install config — live image verification required |
| RUN-04 | DONE-TESTED | Sealed test bundles (hash verified before run), traversal/absolute path rejection, verdict computed from harness signals only — candidate-printed "ALL TESTS PASSED" with exit 1 is still a fail; tested |
| RUN-05 | DONE-TESTED | Signed-harness invocation channel required by spec (HMAC result envelopes); tamper-evident verdict path tested; known-failing-fixture re-runs are the benchmark's blind-spot fixtures |
| RUN-06 | DONE-TESTED | Classifier: code_error / test_failure / timeout / setup_incompatibility / platform_outage / indeterminate; ambiguous signals surface as indeterminate (never a candidate fault); 8 signal-combination tests |
| RUN-07 | DONE-TESTED | Durable (journaled) queue: idempotent run IDs, bounded retries with backoff, explicit `exhausted` state, stale-worker requeue, idempotent completion, restart recovery; 12 tests |
| RUN-08 | DONE-TESTED | Artifact policy in spec (log size bound, redaction patterns, wipe-between-runs); redaction tested incl. secrets and oversize logs — live cleanup verification rides on RUN-01 NEEDS-LIVE |
| RUN-09 | NEEDS-LIVE | Bounded-concurrency contract modeled and tested in-process (limit respected, transient retry, crashed-worker recovery via stale detection); real cohort-scale / resource-exhaustion / worker-restart runs need the live sandbox |
| E2E-05 | DONE-TESTED | Known-good journey in-process: bundle → deterministic → validated review → assembled report → QA approval → ships; no invented findings |
| E2E-06 | DONE-TESTED | Known-partial journey: SILENT_DROP detected; honest handoff recorded as accurate self-assessment; review does not upgrade failing code |
| E2E-07 | DONE-TESTED | Alternative (dict-based) solution: zero findings, accepted on evidence; reference text never compared |
| E2E-08 | DONE-TESTED | Hostile upload journey: traversal filename neutralized, prompt injection quarantined+flagged, resource-hog analyzed without execution, no false report, handling recorded in provenance |

## Test totals (all via `npx tsx`, in-process, real assertions)

| Script | Checks |
|---|---|
| scripts/test-analysis-grind-separation.ts (AI-01) | 9 |
| scripts/test-analysis-grind-citations.ts (AI-04) | 18 |
| scripts/test-analysis-grind-injection.ts (AI-05) | 27 |
| scripts/test-analysis-grind-model-output.ts (AI-06) | 13 |
| scripts/test-analysis-grind-rubric.ts (AI-03/07/09) | 27 |
| scripts/test-analysis-grind-communication.ts (AI-08) | 16 |
| scripts/test-analysis-grind-provenance.ts (AI-02/10/12/13) | 30 |
| scripts/test-analysis-grind-runtime.ts (RUN-01..09) | 47 |
| scripts/test-analysis-grind-benchmark.ts (AI-11, E2E-05..08) | 45 |
| **Total** | **232 passed, 0 failed** |

## Benchmark honesty statement (AI-11)

- 22 fixtures, labels written from the documented detector trigger rules before running.
- Deterministic pipeline only (AST analysis; the analyzer never executes code).
- Result: TP=9 FP=0 FN=0 → precision 1.00 / recall 1.00 over bug+security expectations.
- This is a **calibration set, not predictive validity**: it does not measure real-world defect detection, reviewer agreement, or hiring validity. Do not quote these numbers as product accuracy.
- 6 blind spots are documented as fixtures, not hidden: `partial/normalize_via_list`, `broken/wrong_order` (semantic inversion), `broken/mutates_input`, `broken/empty_crash`, `adversarial/exfil_attempt` (socket), `adversarial/resource_hog` (infinite loop). The last two are defended by sandbox controls (RUN-02), which are NEEDS-LIVE.
- Repeat-run consistency and experienced-engineer adjudication of disagreements are not yet done.

## tsc

`npx tsc --noEmit`: all chunk-analysis files clean. Repo-wide run still reports pre-existing errors in other
chunks' files (`src/app/api/auth/invitations/accept/route.ts`, `src/components/sim/WorkbenchRunner.tsx`,
`src/lib/grants/share-grants.ts`, `src/lib/invitations/candidate-invites.ts`) — untouched by this chunk.

## Notes / open questions for parent

- No design/styling touched. No commits made by this chunk (parent checkpoint `cc8bb75` picked up the new files). `package.json` untouched.
- The `/api/analysis/validate-review` route validates proposed reviews; it never assembles or ships reports itself.
- Live-sandbox verification (RUN-01/02/03/09, plus RUN-08 cleanup) is the main remaining risk before release; the spec validator defines exactly what the live sandbox must satisfy.
- AI-14 stays deferred until error/consistency/agreement metrics exist.
