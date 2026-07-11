# Fydell production setup

This document lists the manual configuration the application cannot safely perform by itself.

## Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXTAUTH_SECRET=
NEXT_PUBLIC_APP_URL=https://www.fydell.com

BOOTSTRAP_ADMIN_EMAIL=admin@fydell.com
ADMIN_NOTIFICATION_EMAIL=admin@fydell.com
ADMIN_EMAIL=admin@fydell.com
ADMIN_PASSWORD=          # transitional env gate for /admin login; rotate regularly

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
CAPTCHA_DISABLED=false   # set true only for local/e2e
ADMIN_MFA_REQUIRED=false # set true after TOTP enrollment

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
EMAIL_FROM_TRANSACTIONAL=Fydell <admin@fydell.com>
EMAIL_REPLY_TO=admin@fydell.com
CRON_SECRET=
```

Never prefix private keys with `NEXT_PUBLIC_`.

## Supabase

1. Apply migrations, including `006_platform_ops.sql`.
2. Confirm Site URL is `https://www.fydell.com`.
3. Redirect URLs (minimum):
   - `https://www.fydell.com/auth/callback`
   - `https://www.fydell.com/auth/update-password`
   - `https://www.fydell.com/reset-password`
   - `https://www.fydell.com/login`
   - `https://www.fydell.com/dashboard`
   - `https://www.fydell.com/admin`
   - localhost equivalents for development
4. Enable email/password auth.
5. Configure custom SMTP (Resend) for auth emails.
6. Enable database backups.
7. Confirm RLS remains enabled on ops tables (anon/authenticated revoked).

## Bootstrap admin

```bash
npx tsx scripts/bootstrap-platform-admin.ts
```

This invites or finds `admin@fydell.com` and grants `super_admin` in `platform_user_roles`.
It never prints passwords or invite tokens.

After bootstrap:

1. Accept the Supabase invite if new.
2. Sign in at `/admin` with the transitional env credentials (or Auth once fully migrated).
3. Open `/admin/pilot-requests`.
4. Enroll MFA before enabling high-risk mutations in production.

## Resend / DNS

1. Verify sending domain for fydell.com.
2. Add SPF, DKIM, and DMARC.
3. Create API key and store as `RESEND_API_KEY`.
4. Configure webhook later at `/api/webhooks/resend` (signature verification required).
5. Schedule outbox processing:
   - `POST /api/cron/process-email-outbox`
   - Header: `Authorization: Bearer $CRON_SECRET`
   - Recommended interval: every 1–5 minutes

## Acceptance checks for founders

1. Submit `/request-pilot`.
2. Confirm success screen shows `FYD-YYYY-######` only after DB insert.
3. Confirm row exists in Supabase `public.pilot_requests`.
4. Confirm emails appear in `email_outbox`.
5. Process outbox (cron, Email Center, or admin “Process email queue”).
6. Confirm request appears in `/admin/pilot-requests`.
7. Change status and add a note; verify timeline + audit_logs.
8. Approve pilot → organization created once; employer invited.
9. Confirm `/admin/email` shows delivery state; Resend webhook updates status.
10. Run `npx tsx scripts/verify-production-readiness.ts`.

## Admin routes

- `/admin` — login
- `/admin/overview` — live ops metrics
- `/admin/pilot-requests` — inbound leads
- `/admin/organizations` — workspaces from approvals
- `/admin/email` — outbox / failed / suppressions
- `/admin/audit` — append-only audit trail
- `/admin/settings` — system health (no secret values)

Admin access requires a signed admin session **and** an active `platform_user_roles` record (bootstrap grants `super_admin` to `BOOTSTRAP_ADMIN_EMAIL`).

## Webhooks

- `POST /api/webhooks/resend` — requires `RESEND_WEBHOOK_SECRET`
- `GET /api/health` — safe readiness probe
- `POST /api/cron/process-email-outbox` — Bearer `CRON_SECRET`

## Security notes

- Service role key is server-only.
- Public users cannot read `pilot_requests`.
- `/admin` is not linked from the public footer.
- Admin authorization requires credentials **and** an active `platform_user_roles` record (bootstrap creates it for `BOOTSTRAP_ADMIN_EMAIL`).
- Email failure never deletes a stored pilot request.
