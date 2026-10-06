# Fydell Master Prompt — Deep Audit Corrections (2026-10-04)

Corrections and new findings from continued Phase 0-3 work.

## Corrections to Earlier Assessment

### Follow-up thread: FULLY IMPLEMENTED (was marked partial)
- `review_questions` table: question/response/status/open/answered/closed, linked to requirement mappings
- `askQuestion` / `answerQuestion` in `src/lib/employer/review.ts`
- API: `POST /api/employer/review/[roleId]/[shareId]/questions`
- The earlier "partial" was wrong — I hadn't dug deep enough.

## Confirmed Gaps (Real)

### 1. Cross-employer receipt acceptance: NOT IMPLEMENTED
What exists:
- `work_receipts` table (versioned, revocation-aware)
- `revoked_grants` table
- Public receipt lookup: `GET /api/receipts/[publicId]`

What's missing:
- No flow for Employer B to accept/import Employer A's receipt
- No UI or API for "I was assessed by Company X, share with Company Y"
- The receipt is viewable but not actionable across orgs

This is the §22 reuse loop. The infrastructure is 70% there; the
acceptance handshake is the missing 30%.

### 2. No-GitHub developer onboarding: NOT IMPLEMENTED
- `/passport/new` is GitHub-only
- No manual project entry (describe a project, link artifacts, upload evidence)
- Developers with private repos or no GitHub are blocked at step one

This is a §7 onboarding gap. The passport data model supports non-GitHub
projects (`passport_projects` is source-agnostic), but there's no entry path.

### 3. Targeted verification simulations: NOT IMPLEMENTED
- When a requirement mapping is "unresolved" or "questioned," there's no
  mechanism to create a shorter focused simulation for that specific gap
- The scenario catalog has full simulations only
- No "verify this one criterion" flow

This is §15. It's a new product surface, not a wiring task.

## Updated Status Table

| Area | Was | Now |
|---|---|---|
| Follow-up thread | ⚠️ Partial | ✅ Implemented |
| Cross-employer reuse | ⚠️ Partial | ❌ Missing (acceptance flow) |
| No-GitHub onboarding | ⚠️ Unclear | ❌ Missing |
| Targeted verification | ⚠️ Partial | ❌ Missing |

## Recommended Build Order

1. **No-GitHub onboarding** — smallest scope, unblocks developers. Add manual
   project entry to `/passport/new`. The data model already supports it.
2. **Cross-employer acceptance** — add "accept receipt" API + UI. Builds on
   existing receipt infrastructure.
3. **Targeted verification** — largest scope, new product surface. Design
   needed before building.
