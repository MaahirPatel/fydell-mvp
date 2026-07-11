# Founder admin access checklist

## Admin portal login (transitional)

| Field | Value |
| --- | --- |
| URL | https://www.fydell.com/admin |
| Email | `admin@fydell.com` (must match `ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_EMAIL`) |
| Password | Set via `ADMIN_PASSWORD` in Vercel / `.env.local` — **not stored in git** |

Generate and save a password locally:

```bash
npm run admin:password
```

Then copy the same `ADMIN_EMAIL` + `ADMIN_PASSWORD` into **Vercel → Project → Settings → Environment Variables** and redeploy.

After login you land on `/admin/pilot-requests`. Sidebar: Overview, Pilot Requests, Organizations, Users, Invitations, Email Center, Audit, Settings, Security/MFA.

## Required one-time setup

1. **Supabase env on Vercel**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)
   - `NEXTAUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL=https://www.fydell.com`

2. **Admin gate + bootstrap**
   - `ADMIN_EMAIL=admin@fydell.com`
   - `ADMIN_PASSWORD=<strong secret>`
   - `BOOTSTRAP_ADMIN_EMAIL=admin@fydell.com`
   - `ADMIN_NOTIFICATION_EMAIL=admin@fydell.com`
   - Run: `npm run bootstrap:admin` (invites Auth user / grants `super_admin`)

3. **Email (Resend)**
   - `RESEND_API_KEY`
   - `RESEND_WEBHOOK_SECRET`
   - `EMAIL_FROM_TRANSACTIONAL=Fydell <admin@fydell.com>` (until domain verified)
   - `EMAIL_REPLY_TO=admin@fydell.com`
   - Webhook URL: `https://www.fydell.com/api/webhooks/resend`
   - Cron every 1–5 min: `POST https://www.fydell.com/api/cron/process-email-outbox` with `Authorization: Bearer $CRON_SECRET`

4. **Auth redirect URLs in Supabase**
   - `https://www.fydell.com/auth/callback`
   - `https://www.fydell.com/auth/update-password`
   - `https://www.fydell.com/reset-password`
   - `https://www.fydell.com/login`
   - `https://www.fydell.com/dashboard`
   - `https://www.fydell.com/admin`

5. **CAPTCHA (Cloudflare Turnstile)** — optional until keys exist
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - Until configured, forms skip CAPTCHA automatically

6. **MFA**
   - Accept Supabase invite for `admin@fydell.com`
   - Enroll TOTP (see `/admin/settings/security`)
   - Then set `ADMIN_MFA_REQUIRED=true`

## Verify

```bash
npm run verify:prod
npm run test:unit
```

## Acceptance smoke test

1. Submit https://www.fydell.com/request-pilot → see `FYD-…` reference
2. Confirm row in Supabase `pilot_requests`
3. Sign in at `/admin` → request visible
4. Process email queue / wait for cron → Email Center shows sent/failed
5. Approve pilot → organization appears under Organizations

**Important:** There is no hard-coded admin password in the app. If login fails, `ADMIN_PASSWORD` is missing or wrong in the environment that serves the site.
