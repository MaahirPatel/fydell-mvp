# Fydell Master Prompt — Phase 0 Audit

**Date:** 2026-10-04
**Scope:** Repository audit against the master prompt (33 sections)
**Method:** Code inspection, schema inventory, route inventory

## 1. Implementation Baseline

### Repository Stats
- **API routes:** 125 (`src/app/api/**/route.ts`)
- **Database tables:** 142 (41 migrations)
- **Desktop app:** Tauri 2.x, v0.1.5
- **Simulation engine:** `src/lib/simulations/` (coordinator, grounding, assistance, memory)

### Core Loop Mapping (§3)

| Stage | Required | Status | Evidence |
|---|---|---|---|
| Work | Simulations run | ✅ Implemented | `sim_sessions`, `eng_attempts`, desktop app |
| Source-linked evidence | Claims with sources | ✅ Implemented | `evidence_atoms`, `proof_evidence_claims` |
| Engineer-controlled profile | Profile curation | ✅ Implemented | `engineer_profiles`, `passports` |
| Role-specific sharing | Scoped grants | ✅ Implemented | `passport_shares`, `sim_receipt_shares` |
| Employer review | Report inspection | ✅ Implemented | `eng_reports`, `employer_passport_reviews` |
| Targeted verification | Follow-up questions | ⚠️ Partial | `review_questions` exists; employer-to-candidate thread unclear |
| Human decision | Decision recording | ✅ Implemented | `employer_decisions`, `eng_decisions` |
| Outcome feedback | Permitted feedback | ✅ Implemented | `outcome_feedback`, `hiring_outcomes` |
| Reusable evidence | Work receipts | ✅ Implemented | `work_receipts`, `receipt_versions` |

## 2. Schema Coverage (§27)

### Required Entities vs Tables

| Entity | Table(s) | Status |
|---|---|---|
| user/engineer identity | `profiles`, `platform_user_roles` | ✅ |
| organization/member | `organizations`, `organization_members`, `workspaces`, `workspace_members` | ✅ |
| provider connection | `profile_connected_accounts` | ✅ |
| project snapshot | `passport_projects`, `submission_snapshots` | ✅ |
| contribution | `proof_evidence_claims` (partial) | ⚠️ |
| claim/version | `proof_evidence_claims`, `proof_claim_events`, `artifact_versions` | ✅ |
| profile publication | `passports`, `engineer_profiles` | ✅ |
| share grant | `passport_shares`, `sim_receipt_shares`, `receipt_permissions` | ✅ |
| role/rubric | `eng_roles`, `hiring_roles`, `proof_roles` | ✅ |
| application | `pilot_candidates` (partial) | ⚠️ |
| invitation | `candidate_invitations`, `eng_invitations`, `sim_invitations`, `invitations` | ✅ |
| scenario/version | `sim_templates`, `sim_template_versions`, `eng_scenario_versions` | ✅ |
| attempt/revision | `eng_attempts`, `sim_sessions`, `simulation_attempts` | ✅ |
| event | `sim_session_events`, `eng_attempt_events`, `simulation_events` | ✅ |
| message | `sim_messages`, `eng_messages`, `proof_messages` | ✅ |
| submission | `sim_submissions`, `eng_submissions`, `final_submissions` | ✅ |
| evaluation run | `eng_evaluation_runs`, `evaluation_runs`, `sim_analysis_runs` | ✅ |
| finding | `fde_evidence_findings`, `eng_finding_flags` | ✅ |
| report/review | `eng_reports`, `sim_report_reviews`, `employer_passport_reviews` | ✅ |
| follow-up thread | `review_questions`, `oral_defense_*` | ⚠️ Partial |
| decision/outcome | `employer_decisions`, `eng_decisions`, `hiring_outcomes` | ✅ |
| receipt | `work_receipts`, `receipt_versions` | ✅ |
| entitlement/usage | `subscriptions`, `billing_ledger_entries`, `organization_billing` | ✅ |
| notification/outbox | `email_outbox`, `command_outbox`, `admin_notifications` | ✅ |
| employment/milestone | `proof_post_hire_outcomes` (partial) | ⚠️ Gated |

**Legend:** ✅ Implemented | ⚠️ Partial | ❌ Missing

## 3. Key Gaps Identified

### High Priority
1. **Employer-to-candidate follow-up thread** (§21): `review_questions` and `oral_defense_*` tables exist but the full bidirectional thread (employer asks → candidate replies → linked to criterion) needs verification.
2. **Application entity** (§13): Multiple invitation tables but no unified application relationship with duplicate handling.
3. **Contribution attribution** (§9): `proof_evidence_claims` exists but fork/collaboration distinction needs verification.

### Medium Priority
4. **Cross-employer reuse flow** (§11, §22): Tables exist (`work_receipts`, `revoked_grants`) but the Employer A → Employer B acceptance flow needs end-to-end verification.
5. **Targeted verification** (§15): Shorter gap-verification simulations are not yet implemented as a distinct flow.

### Blocked (External)
6. **Live model conversations**: No `OPENAI_API_KEY` in this environment.
7. **Desktop build**: Missing GTK libraries in this VM.
8. **Test database**: No Supabase access from sandbox.

## 4. Conflict Resolution (§4)

| Conflict | Resolution |
|---|---|
| Frontend redesign vs preserve | **Recent user decision wins:** Polish with SpaceX/xAI inspiration, do not redesign. Master prompt §2 (do not redesign) is superseded by the 2026-10-04 polish directive for marketing pages only. |
| Example profiles | **Removed** per 2026-10-04 user order. Master prompt §4 confirms: keep fabricated profiles off the main site. |
| Simulation surface | **Desktop app** is current. Do not migrate to cloud (master prompt §4 confirms). |
| Coworker target | **Grounded LLM** with controlled facts (master prompt §4 confirms, matches current implementation). |
| Pricing | **Reverted** to previous plans per 2026-10-04 user order. $750 pilot removed. |

## 5. Phase 1 Readiness

### Backend Assessment Transaction
- **Desktop → submission:** `eng_attempts` → `eng_submissions` flow exists
- **Evaluation:** `eng_evaluation_runs` table and worker route exist
- **Employer report:** `eng_reports` table and report routes exist
- **Status:** Implemented, needs live verification (blocked on test DB)

### Coworker Verification
- **Coordinator:** `src/lib/simulations/conversation/` (59 tests passing)
- **Partial failures:** Mocked tests pass; real DB integration blocked
- **Live model:** Blocked on `OPENAI_API_KEY`

## Next: Phase 1 Execution
Proceed to verify the backend assessment transaction and coworker paths
where the environment permits. Document blockers precisely.
