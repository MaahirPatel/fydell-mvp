# October pilot ops runbook

Short support reference for the GlobalFoundries shadow pilot. Pair with [PILOT_CONTRACT.md](./PILOT_CONTRACT.md) and [migration-runbook.md](./migration-runbook.md).

## Feature flags and rollout

Env-based flags in `src/lib/auth/flags.ts` (Vercel → Environment Variables):

| Variable | Production expectation | Effect |
|---|---|---|
| `NEXT_PUBLIC_FDE_MARKETPLACE` | `1` | Marketplace-style post-login routing by `profiles.account_type`. |
| `NEXT_PUBLIC_PILOT_MODE` | unset / `false` | Only for local demo when auth secrets are missing. Never enable in prod. |
| `NEXT_PUBLIC_PARTNER_SIGNUP` | unset | Partner signup path; off for pilot. |
| `EMPLOYER_SELF_SIGNUP_MODE` | `open` | Employers get a usable workspace after onboarding. |
| `ALLOW_DEMO_DATA` | `false` | Blocks demo seed paths in production. |

**Rollout rule:** change flags in Vercel preview first, smoke the golden path, then promote to production. No code deploy is required for flag-only toggles, but redeploy after env changes.

**Planned (not yet env-gated):** per-org invite caps, single-template lock to `missing-delays`, and partner marketplace UX remain code-path defaults until explicit flags are added.

## Invite delivery

### What the employer sees

- **Overview** (`/app/employer`) and **Candidates** (`/app/employer/candidates`): status column shows Invited → Opened → Accepted → In progress → Completed (derived from `sim_invitations` + linked `sim_sessions`).
- **Invite modal:** after send, copy confirms email delivery:
  - `emailDelivery === "sent"` → “An email is on its way…”
  - otherwise → “Email is not set up… share this link” plus the `/invite/{token}` URL.
- **Resend / copy link:** row actions on Candidates call `/api/sim/invitations/manage/{id}`; notice banner explains outcome.

Statuses map from `INVITATION_STATUS_LABEL` in `src/app/app/employer/_lib/data.ts`.

### Where email failures show

| Surface | Path | What to check |
|---|---|---|
| Employer (immediate) | Invite modal / resend notice | Delivery fallback message + manual link |
| Platform admin | `/admin/email` → **Failed** / **Bounced** tabs | `email_outbox.last_error`, `attempt_count`, recipient |
| Platform admin | `/admin/email` → **Outbox** | Pending / processing stuck rows |
| Platform admin | `/admin/invitations` | Platform (employer) invite send status |
| Repair | `/admin/repair` → **Retry failed email** | Requeues by `outboxId` |

Cron must run: `POST /api/cron/process-email-outbox` with `Authorization: Bearer $CRON_SECRET` (every 1–5 min). See [admin-access.md](./admin-access.md) for Resend setup.

## Session stuck

### Candidate resume (first step)

1. Candidate opens the **same session URL**: `/sim/{sessionId}` (requires login as the invited candidate).
2. If they only have the invite link, use `/invite/{token}` to accept again; an in-progress session should reconnect.

Timers and submission state are server-authoritative; do not ask candidates to “start over” unless ops invalidates the attempt.

### Admin reopen / invalidate (preferred)

Sign in at `/login` → `/admin/repair` (Repair console):

| Action | When to use |
|---|---|
| **Extend invitation** | Invite expired before candidate started (`invitationId`, `days`) |
| **Revoke invitation** | Link must stop working (`invitationId`) |
| **Cancel unsubmitted session** | Session wedged, candidate will restart (`sessionId`, `reason`) |
| **Retry failed email** | Invite email never left outbox (`outboxId`) |
| **Requeue report review** | Report stuck in human review (`reportId`) |

All actions audit to `audit_logs`.

### Manual DB (last resort only)

Only if Repair console is unreachable. Use Supabase SQL editor with a **founder-approved** change ticket:

```sql
-- Cancel an unsubmitted session (mirror repair cancel_session)
UPDATE sim_sessions
SET status = 'cancelled', locked_at = now()
WHERE id = '<sessionId>' AND status <> 'submitted';

-- Extend invitation expiry
UPDATE sim_invitations
SET expires_at = now() + interval '7 days', status = 'sent'
WHERE id = '<invitationId>';

-- Revoke invitation
UPDATE sim_invitations
SET status = 'revoked', revoked_at = now()
WHERE id = '<invitationId>';
```

Never delete rows. Never modify `sim_events` or submitted session payloads.

## Error monitoring

| Source | Where | Look for |
|---|---|---|
| **Vercel** | Project → Logs / Deployments → Function logs | 5xx on `/api/sim/*`, `/api/cron/process-email-outbox`, auth callback errors |
| **Vercel** | Runtime → Edge/Node errors | Timeouts during analyze/report generation |
| **Supabase** | Dashboard → Logs → Postgres / Auth / API | RLS denials, constraint violations, slow queries |
| **Supabase** | Table `email_outbox` | `status = failed`, rising `attempt_count` |
| **Supabase** | Table `audit_logs` | Recent `admin.*` repair actions |
| **Resend** | Dashboard → Emails | Bounces, domain verification regressions |

Smoke after incidents: `npm run verify:prod` (founder machine) and one employer invite → candidate complete → report visible.

## Migration rule

**Never apply a production migration without:**

1. **Explicit target** — named Supabase project ref and migration file(s).
2. **Backup** — Supabase snapshot before apply.
3. **Verification** — `npx tsx scripts/verify-migration-state.ts` on staging, then production.
4. **Rollback plan** — additive forward-repair only; no destructive `DROP` without founder sign-off.

Full sequence: [migration-runbook.md](./migration-runbook.md).

## Seeded nonprod accounts

- `scripts/seed-development.ts` creates **example.com** test data only when `ALLOW_DEV_SEED=true` and **not** production.
- Local admin bootstrap: `npm run bootstrap:admin` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see [admin-access.md](./admin-access.md)).
- Production pilot orgs come from approved `/admin/pilot-requests`, not seed scripts.

## Pilot data export

| Data | Export path |
|---|---|
| Evidence reports | In-app at `/app/employer/assessments/report/{sessionId}`; browser print-to-PDF |
| Pilot feedback (CSV) | `/admin/pilot-feedback` → **Export CSV** |
| Email / audit trail | `/admin/email`, `/admin/audit` (read-only; no bulk export UI) |
| Legacy candidate PDFs | `/admin/dashboard` → candidate detail (legacy path) |

For GF-facing summaries, prefer employer report links plus pilot-feedback CSV export.

## Incident contact

| Role | Contact |
|---|---|
| Pilot support (employers / candidates) | hello@fydell.com |
| Platform ops / admin access | admin@fydell.com |
| On-call engineering | Fydell founder (primary); escalate via hello@ with `P0` in subject |

**P0 definition:** candidate blocked from completing simulation, cross-tenant data visible, or auth/email fully down for pilot org.
