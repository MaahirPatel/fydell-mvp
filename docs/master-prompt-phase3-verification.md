# Fydell Master Prompt — Phase 3 Verification

**Date:** 2026-10-04
**Scope:** Employer flows (role criteria, review, follow-up, decisions)

## 1. Role Intake (§12)

**Route:** `POST /api/employer/role-intake`

**Verified:**
- ✅ Org membership required (`requireOrgMember`)
- ✅ Idempotency-Key header (8-80 chars) for safe retries
- ✅ Protected characteristic filtering: criteria naming protected characteristics or culture fit rejected with 422, nothing stored
- ✅ Scenario recommendations from catalog
- ✅ Persists intake; creates role request when nothing fits
- ✅ Role-family catalog exposed without answer keys (`GET`)

**Master prompt §12 compliance:**
- ✅ Observable criteria (no "rockstar" or "culture fit")
- ✅ Employer reviews before candidate use (intake is explicit)
- ✅ Scenario version associated

## 2. Requirement-to-Evidence Review (§20)

**Route:** `POST /api/employer/review/[roleId]/[shareId]/mappings`

**Verified:**
- ✅ Per-requirement mapping with statuses: `suggested`, `accepted`, `corrected`, `questioned`, `unresolved`
- ✅ Links requirement text to specific evidence (project ID + evidence ID)
- ✅ Reviewer notes supported
- ✅ Org membership enforced

**Master prompt §20 compliance:**
- ✅ Requirement matrix (criterion → evidence → status)
- ✅ Reviewer can accept, correct, or question mappings
- ✅ Unresolved state is explicit (not a silent zero)

## 3. Decision Recording (§21)

**Route:** `POST /api/eng/org/attempts/[attemptId]/decision`

**Verified:**
- ✅ Decisions limited to Advance/Hold/Decline (no auto-hire)
- ✅ Requires released report first (decisions recorded against a report version)
- ✅ Records deciding member, organization, timestamp
- ✅ Notes capped at 4000 chars
- ✅ Audit event emitted (`decision_recorded` with report version)

**Master prompt §21 compliance:**
- ✅ Human decision (no automatic hire/no-hire)
- ✅ Decision linked to specific report version
- ✅ Actor and time recorded
- ✅ Private rationale supported (notes)

## 4. Reviewer Notes and Flags

**Routes:**
- `POST /api/eng/org/attempts/[attemptId]/notes` — private reviewer notes
- `POST /api/eng/org/attempts/[attemptId]/flags` — finding flags

**Verified:**
- ✅ Private notes separate from candidate-visible report
- ✅ Finding flags for disagreement/amendment

## 5. Phase 3 Summary

| Requirement | Status | Evidence |
|---|---|---|
| Role intake with criteria screening | ✅ Verified | Intake route |
| Requirement-evidence mapping | ✅ Verified | Mappings route |
| Human decision recording | ✅ Verified | Decision route + audit |
| Private reviewer notes | ✅ Verified | Notes/flags routes |
| Employer-candidate follow-up thread | ⚠️ Partial | Tables exist; bidirectional flow unverified |
| Candidate comparison | ⚠️ Partial | No dedicated comparison view found |

**Phase 3 core flows are implemented.** The follow-up thread and
cross-candidate comparison need live verification.
