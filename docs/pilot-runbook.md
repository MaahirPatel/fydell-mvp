# October pilot operator runbook

No secrets or real candidate data in this file.

## Local setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill required names from `docs/pilot-audit.md`.
3. Apply migrations to a disposable Supabase project (forward-only). Never rewrite applied migrations.
4. `npm run dev`
5. Smoke: `npm run test:release`

## Migration procedure

1. Confirm current migration head with `npm run verify:migrations` when available.
2. Apply new SQL under `supabase/migrations/` in order on staging first.
3. Run app against staging; verify employer invite + candidate start.
4. Backup production, then apply the same migrations.
5. Rollback assumption: reverse by feature flags / disabling cohort Open status; do not drop tables with candidate data without an explicit owner decision.

## Creating the first employer organization

1. Sign up at `/signup` as employer (or approved invite path).
2. Complete `/onboarding/employer` with company name.
3. Land in `/app/employer` with empty truthful queue (no fake candidates).

## Opening the Data Analyst pilot cohort

1. Open **Pilot cohort** in the employer workspace.
2. Confirm evaluation: Operations performance investigation (pinned version).
3. Set status to **Open**. Opening does not mutate historical attempts.
4. Pause/Close persist and block new invitations when Closed.

## Inviting candidates

1. Enter display name + email.
2. Review cohort, evaluation, time estimate, AI policy, expiration.
3. Create invitation. Raw token is shown once / emailed; DB stores hash only.
4. If email is not configured: status is **Link created - not emailed**; copy `/invite/{token}`.
5. Resend / revoke / expire from the cohort table. Revocation blocks future access and keeps audit history.

## Candidate path

1. Open invite link → review org, task, policies, desktop requirement.
2. Accept exact consent version (unchecked by default).
3. Pass real preflight (browser, viewport, network).
4. Optional untimed control sample.
5. Start evaluation once. Timer is server-authoritative.
6. Work survives refresh. If offline, retry queue drains on reconnect.
7. Curveball arrives once after investigation window.
8. Submit immutable artifact once.
9. Complete oral defense (candidate responses or facilitator structured notes).
10. Work Receipt available when report reaches an allowed state; candidate controls sharing.

## Report and review

1. Employer opens report from cohort queue.
2. Citations open source evidence excerpts.
3. If model unavailable or citations invalid: **Human review required**.
4. Record review status and human decision: Advance / Hold / Decline.
5. Record whether Fydell evidence changed, confirmed, or did not affect the interview decision.
6. Compare only same-cohort, same evaluation version candidates.

## Receipt shares

1. Candidate claims private receipt.
2. Creates share with allowed fields + expiration.
3. External viewer sees only authorized projection.
4. Revoke immediately blocks old URL.

## Support actions (platform admin)

- Extend invite / grant retake with audit note (`/admin/repair`).
- Inspect email outbox (`/admin/email`).
- Retry failed report job (idempotent).
- Manual identity review status: factual labels only.
- Never expose service-role keys or raw tokens in UI.

## Day-of-pilot smoke checklist

- [ ] Sign in as employer; cohort Open
- [ ] Invite test candidate; link resolves
- [ ] Consent + preflight + start
- [ ] Refresh mid-session restores work and time
- [ ] Submit once; second submit rejected
- [ ] Report Ready or Human review required (honest)
- [ ] Citation opens source
- [ ] Decision + influence saved
- [ ] Receipt claim → share → revoke works
- [ ] Second org cannot see first org rows

## RC freeze checklist

Before treating a build as the October pilot candidate:

1. `npm run test:release` PASS
2. `npm run build` PASS
3. Migration head includes `021_october_pilot_cohort.sql` / `october_pilot_cohort` on the target DB
4. `ops-yield-investigation` published and selected by the employer cohort
5. Day-of-pilot smoke checklist above completed on the target environment
6. No fake GF branding, fake email success, or fake recording claims in the pilot path
7. Freeze content changes to the pinned template version; ship fixes only as new versions or hotfix with owner sign-off
8. Document any remaining UNVERIFIED DoD rows in `docs/pilot-definition-of-done.md`

## Remaining limitations (truthful)

- No enterprise SSO / SAML in this release.
- No remote desktop or device-control detection claims.
- No facial/emotion/personality inference.
- No predictive validity claim.
- Recording/transcription not required; facilitator notes used instead.
- GlobalFoundries name/logo not shown publicly without explicit permission.
- Local seed scripts need a filled `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (remote seed already applied for the flagship).
