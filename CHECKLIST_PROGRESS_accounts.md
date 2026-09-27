# Checklist progress — chunk-accounts

Branch: `feature/desktop-sim-client` (stayed on it; no commit per instructions).
Owner files: `src/lib/auth/**`, `src/lib/orgs/**`, `src/lib/grants/**`, `src/lib/permissions/**`,
`src/app/api/auth/invitations/accept/route.ts`, `scripts/test-accounts-grind-*.ts`.
All tests are in-process via tsx with in-memory fakes (no live Supabase available).

| ID | STATUS | one-line note |
|---|---|---|
| AUTH-01 | NEEDS-LIVE | Full signup/verified-contact/reset/expired-link flows require live Supabase auth; not faked |
| AUTH-02 | DONE-TESTED | OAuth state is signed/expiring/user-bound with redirect allowlist; email-takeover refused — live GitHub round-trip NEEDS-LIVE |
| AUTH-03 | DONE-TESTED | Workspace creation generates org IDs server-side; client-supplied IDs ignored; ID-spoofing rejected |
| AUTH-04 | DONE-TESTED | owner/admin manage membership; reviewers get permitted hiring work only; billing is explicit (owner/admin do NOT inherit it); last-owner protected |
| AUTH-05 | DONE-TESTED | 256-bit tokens, hash-only storage, expiring, single-use, scoped to org+role+email; deliberate acceptance; revoked/used/expired unreusable; no domain auto-join |
| AUTH-06 | DONE-TESTED | Removal flips membership to removed + revokes all sessions immediately, including previously opened ones |
| AUTH-07 | NEEDS-LIVE | Operator MFA / privileged-access logging requires Supabase + production identity setup |
| AUTH-08 | NEEDS-LIVE | Customer MFA is a Supabase-supported-auth feature; needs live project to verify |
| NET-01 | DONE-TESTED | One stable passport → many permissioned application snapshots; employer can never mint grants over candidate evidence |
| NET-02 | DONE-TESTED | Provenance fields required at creation; per-evidence records, no universal cross-scope ability score by design |
| NET-03 | DONE-TESTED | Candidate selects eligible evidence per role invitation; unselected evidence stays private |
| NET-04 | DONE-TESTED | Grants reject non-portable items by construction (private/employer-confidential/hidden-test named in the error) |
| NET-05 | DONE-TESTED | Pre-share disclosure shows recipient, scope, expiry, retention, revocation, and honest downloaded-copy limits |
| NET-06 | DONE-TESTED | Re-evaluation versions evidence; material corrections are traceable and propagated with notification status to affected live grants (lineage-aware) |
| NET-07 | DONE-TESTED | Passports default undiscoverable, no auto-apply, no GitHub-connect outreach; reuse opt-out blocks new grants |
| NET-08 | DONE-TESTED | Separate grants per employer; B sees only its scope, never A's notes or confidential artifacts |
| NET-09 | DEFERRED-P1 | Employer acceptance marking — P1, out of scope for this chunk |
| NET-10 | DEFERRED-P1 | Permissioned discovery — P1, out of scope for this chunk |
| NET-11 | DEFERRED-P1 | Role-aware matching — P1, out of scope for this chunk |
| NET-12 | DEFERRED-P1 | Apply with Fydell / ATS handoff — P1, out of scope for this chunk |
| NET-13 | DEFERRED-P1 | Network abuse prevention — P1, out of scope for this chunk |
| NET-14 | DEFERRED-P1 | Beyond technical roles — P1, out of scope for this chunk |
| ACCESS-MATRIX | DONE-TESTED | `checkAccess` covers all 7 matrix rows × developer/employer/unrelated/operator, incl. billing-role explicitness and purpose-limited audited operators |
| STATE-MACHINES | DONE-TESTED | Server-side import/attempt/decision machines; repeated requests idempotent; stale-version concurrent requests get version_conflict, never regress |
| E2E-09 | DONE-TESTED | Two employers + two candidates: cross-org ID/file/report access denied, incl. guessed-org-ID and revoked-membership cases |
| E2E-13 | DONE-TESTED | Share → revoke → retry: new access denied; application snapshot retained exactly as disclosed |
| E2E-26 | DONE-TESTED | Separate evidence scopes to two employers; each sees permitted evidence only; hiring notes never leak |

## Test evidence (all `npx tsx`, in-process, zero network)

- `scripts/test-accounts-grind-orgs.ts` — AUTH-03/04/06 + E2E-09 org isolation — PASS
- `scripts/test-accounts-grind-invitations.ts` — AUTH-05 — PASS
- `scripts/test-accounts-grind-oauth.ts` — AUTH-02 — PASS
- `scripts/test-accounts-grind-permissions.ts` — access matrix + E2E-09/13/26 — PASS (74 assertions)
- `scripts/test-accounts-grind-grants.ts` — NET-01..08 — PASS (66 assertions)
- `scripts/test-accounts-grind-machines.ts` — import/attempt/decision machines — PASS

Total: 6 suites, all passing; permissions + grants suites report 140 assertions combined
(the other four use ok/FAIL counters without a final tally).

## Follow-ups for other chunks / parent

1. Invitation token persistence needs a `token_hash` column on `public.invitations`
   (migration) before `src/app/api/auth/invitations/accept/route.ts` can be wired to
   Supabase — currently NEEDS-LIVE with an in-memory store behind `getStores()`.
   Suggested owner: platform/DATA chunk.
2. AUTH-01/AUTH-07/AUTH-08 need a live Supabase project (signup, reset, MFA).
3. The route `POST /api/auth/invitations/accept` is implemented but untested against
   live DB (logic is lib-tested).
4. Did not touch profile hub UI (owned by another agent) or any styling.
