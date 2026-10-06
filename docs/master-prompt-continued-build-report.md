# Fydell Master Prompt — Continued Build Report

**Date:** 2026-10-04 (evening, continued)
**Session:** Extended build per Maahir's "take as much time as you need"

## UI Components Built (This Session)

### Employer: VerificationRequestPanel
`src/components/employer/VerificationRequestPanel.tsx`
- Embedded in RequirementEvidenceReview after the follow-up thread
- Create verification requests tied to a specific requirement mapping
- Review candidate responses (accept/reject with note)
- Lists existing requests with status badges

### Candidate: VerificationInbox
`src/components/candidate/VerificationInbox.tsx`
- Lists pending verification requests from all employers
- Submit focused responses (4000 char limit)
- Shows submitted state while awaiting employer review

### Employer: ReceiptAcceptance
`src/components/employer/ReceiptAcceptance.tsx`
- Accept a candidate's share token as evidence
- Optional note for the audit trail
- Lists previously accepted receipts

## Hardening Applied

1. **Verification request audit preservation:** `mapping_id` FK changed from
   `on delete cascade` to `on delete set null` — request history survives
   mapping deletion.
2. **Spam guard:** Max 3 open verification requests per mapping.
3. **Server-side candidate resolution:** The verify API resolves candidate
   from share → passport → owner, instead of trusting client input.

## Architectural Gap Documented: Application Entity

**Finding:** No unified `applications` table exists. The candidate→role
relationship is spread across:
- `eng_invitations` (invite)
- `eng_attempts` (assessment, linked via `invitation_id`)
- `eng_reports` (employer review)
- `eng_decisions` (outcome)

There are 5 legacy invitation tables (`invitations`, `candidate_invitations`,
`fde_invitations`, `sim_invitations`, `proof_invitations`) from different
build phases. Only `eng_invitations` is active in the current flow.

**Assessment:** The chain works (invitation → attempt → report → decision),
but there's no single record representing "candidate X's application to
role Y" with unified status. This is a refactor, not a missing feature.
**Not attempted** without a live DB to test the migration safely.

## Test Status

93 tests passing across 10 suites. Typecheck clean (7 pre-existing errors
unrelated to this work).

## Still Blocked on External Resources

1. Supabase access — migrations 040, 041, 042 not applied
2. Live DB — API routes not tested against real data
3. Browser — new UI not visually verified
