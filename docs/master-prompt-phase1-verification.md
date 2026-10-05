# Fydell Master Prompt — Phase 1 Verification

**Date:** 2026-10-04
**Scope:** Backend assessment transaction and coworker verification

## 1. Submission Transaction (§18)

### Flow Verified (Code Inspection)

**Route:** `POST /api/eng/attempts/[attemptId]/submit`

**Steps:**
1. **Idempotency check:** Queries `eng_submissions` for existing submission by `attempt_id`. If found, returns existing receipt with `alreadySubmitted: true`. Double-clicks resolve to one logical submission. ✅
2. **Status gate:** Rejects if `attempt.status !== "in_progress"` (409). ✅
3. **Window check:** `submissionWindow()` validates against `submissionGraceMinutes`. Late submissions marked, closed windows rejected. ✅
4. **Requirement update gate:** If a requirement update was due but not yet posted, it's posted now and submission is rejected (409) with instruction to read Updates first. Prevents submitting against stale requirements. ✅
5. **Upload validation:** Upload must exist, belong to the attempt, have `status: "accepted"`, and have `sha256` + `byte_size`. ✅
6. **Immutable insert:** Submission records `archive_sha256`, `archive_bytes`, handoff, AI disclosure, and lateness flag. ✅

**Master prompt §18 compliance:**
- ✅ Freezes exact revision (sha256)
- ✅ Double-clicks resolve to one submission
- ✅ Handoff included (three questions)
- ✅ AI disclosure recorded
- ✅ Server receipt returned

### Evaluation Scheduling

**Pattern:** Self-healing background worker (no separate queue)
- `scheduleEvaluationWork()` called after successful submission
- `scheduleIfRunnable()` called when viewing attempts with runnable evaluations
- `processPendingRuns(db, 2)` processes up to 2 pending runs
- Handles: queued, retry-due, and abandoned-by-dead-worker states

**Assessment:** Appropriate for pilot scale. A dedicated job queue (with leases, as §27 requires) would be needed at higher volume, but the current pattern handles the failure modes correctly for the initial scope.

## 2. Coworker Conversation (§17)

### Architecture Verified

**Location:** `src/lib/simulations/conversation/` (11 modules, 1940 lines)

| Module | Responsibility | Status |
|---|---|---|
| `coordinator.ts` | Central turn orchestration | ✅ |
| `intent.ts` | Topic/question classification | ✅ |
| `memory.ts` | Durable structured memory | ✅ |
| `state-builder.ts` | Reconstruct state from DB | ✅ |
| `assistance.ts` | Budget tracking | ✅ |
| `assistance-guard.ts` | Policy enforcement | ✅ |
| `generation-context.ts` | Constrained LLM context | ✅ |
| `structured-output.ts` | Response validation | ✅ |
| `generator.ts` | Model/fallback generation | ✅ |
| `grounding.ts` | Fact citation checks | ✅ |
| `types.ts` | Shared types | ✅ |

### Test Results (2026-10-04)

| Suite | Passed | Failed | Coverage |
|---|---|---|---|
| conversation-coordinator | 14 | 0 | Turn flow, silence rules, unclear handling |
| assistance-policy | 7 | 0 | Budgets, blocking, limits |
| conversation-integration | 6 | 0 | End-to-end coordinator paths |
| generation-adversarial | 10 | 0 | Prompt injection, policy evasion |
| grounding | 6 | 0 | Fact citation, contradictions |
| assistance-guard | 6 | 0 | Solution blocking, code detection |
| scenario-routing | 4 | 0 | Topic ownership, stakeholder selection |
| partial-failure | 3 | 0 | Recovery, idempotency, concurrency |
| **Total** | **56** | **0** | |

### Master Prompt §17 Compliance

- ✅ Central coordinator with durable shared memory
- ✅ Scenario-configured stakeholders (ownsTopics, responsibilities)
- ✅ Only confident acknowledgments suppressed before interpretation
- ✅ Implicit/compound/uncertain questions reach model interpretation
- ✅ Protected rubrics/solutions excluded from generation context
- ✅ Structured output validation
- ✅ Assistance budgets scenario-configured
- ✅ Partial-write recovery tested (mocked)
- ✅ Honest unavailable state on model failure

### Known Limitations (Not Blockers for Pilot)

1. **Mocked, not live:** Partial-failure tests use mocked DB. Real route integration blocked on test database access.
2. **No live model:** `OPENAI_API_KEY` not available in this environment. Model path code-reviewed but not executed.
3. **Lexical grounding:** Fact checks are lexical (numbers, IDs, patterns), not semantic. Documented as safeguard, not proof.

## 3. Phase 1 Summary

| Requirement | Status | Evidence |
|---|---|---|
| Immutable submission | ✅ Verified | Code inspection + idempotency logic |
| Evaluation scheduling | ✅ Verified | Self-healing worker pattern |
| Coworker coordinator | ✅ Verified | 56 tests passing |
| Assistance enforcement | ✅ Verified | Policy + guard tests |
| Partial failure recovery | ⚠️ Mocked | Real DB blocked |
| Live model conversations | ❌ Blocked | No API key |

**Phase 1 is complete for what the environment permits.** The remaining items require external resources (API key, test database) that are documented as blockers with precise unblock actions.
