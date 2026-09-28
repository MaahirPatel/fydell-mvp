# Fydell incident response plan (SEC-12) — DRAFT

Last drafted: 2026-09-27. Review cadence: before launch and after every drill.

> NEEDS-LIVE: name an actual human incident commander before launch. Role
> titles below are placeholders for assignment.

## Roles

| Role | Responsibility | Assignee |
|---|---|---|
| Incident commander | Declares severity, coordinates, owns customer comms | NEEDS-LIVE: assign |
| Security responder | Containment, key rotation, access revocation | NEEDS-LIVE: assign |
| Comms owner | Customer notification drafts and sending | NEEDS-LIVE: assign |

## Severity levels

- **SEV-1:** confirmed or likely exposure of candidate personal data, payment
  data, or credentials; active exploitation. Page immediately.
- **SEV-2:** suspected exposure, evaluator compromise, or billing integrity
  issue without confirmed exfiltration.
- **SEV-3:** contained anomaly (e.g. blocked attack, failed intrusion).

## Response steps

1. **Detect & declare.** Correlate via structured logs (correlation IDs in
   `src/lib/security/logger.ts`) and `security_audit_events`
   (migration 030). Commander declares severity.
2. **Contain.** Revoke affected grants/tokens (`revoked_grants`, migration
   030; `src/lib/security/revocation.ts`); disable evaluator/scenario via the
   kill switch (`src/lib/ops/feature-flags.ts`) if evaluation integrity is in
   doubt.
3. **Rotate.** Rotate the compromised credential class: Stripe keys (dashboard
   roll + webhook secret), Supabase service-role key, Resend key, model
   provider key. Verify no secret appears in git history or frontend bundles
   (`src/lib/security/secret-scan.ts`).
4. **Preserve evidence.** `security_audit_events` and `operator_actions` are
   append-only — never delete during an incident. Export relevant slices to
   the incident record.
5. **Eradicate & recover.** Remove attacker access, re-verify access paths
   (API, storage, exports) with the access-abuse matrix
   (`scripts/test-platform-grind-security.ts`), restore service.
6. **Notify.** Affected customers without undue delay: what happened, what
   data was affected, what we did, what they should do. NEEDS-LIVE: confirm
   jurisdiction-specific notice timelines with counsel (see
   `docs/CUSTOMER_TERMS.md` §6).
7. **Learn.** Post-incident review within 5 business days; update this plan.

## What NOT to do

- Do not pay ransoms or negotiate through unofficial channels.
- Do not delete logs or audit rows to "clean up".
- Do not notify customers with unconfirmed speculation; confirm scope first,
  then communicate.

## Drills

Tabletop drill before launch; access-revocation + kill-switch drill quarterly
after launch. NEEDS-LIVE: schedule the pre-launch drill.
