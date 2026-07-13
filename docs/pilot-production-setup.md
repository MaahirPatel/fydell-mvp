# Pilot production setup

## 1. Staging first
Create a separate Supabase project (or branch). Apply migrations `001`–`010` there.
Run `npx tsx scripts/verify-migration-state.ts`.

## 2. Production backup
Supabase → Database → Backups before applying `010_pilot_lifecycle.sql`.

## 3. Auth URLs + email confirmation (pilot)
Site URL: `https://www.fydell.com`
Redirects:
- `https://www.fydell.com/auth/callback`
- `https://www.fydell.com/auth/update-password`
- `https://www.fydell.com/reset-password`
- `https://www.fydell.com/login`
- `https://www.fydell.com/onboarding/employer`
- `https://www.fydell.com/candidate/invite/*`

**Pilot default:** disable email confirmation so employers can sign in immediately after signup.

Supabase → Authentication → Providers → Email → turn **Confirm email** **OFF**.

The app also auto-confirms new users via the service role if a session is not returned on signup.

## 4. Env (Vercel)
See `.env.example`. Production defaults:
- `EMPLOYER_SELF_SIGNUP_MODE=approval_required`
- `ALLOW_DEMO_DATA=false`

## 5. Email
Set Resend keys; configure Supabase Auth SMTP; cron for `/api/cron/process-email-outbox`.

## 6. Admin
`npm run bootstrap:admin` then sign in at `/login` with admin credentials → `/admin`.
Use `/admin/repair` to approve organizations (`approve_organization`).

## 7. Production smoke
1. New employer email → signup → confirm → onboarding with non-reserved company name
2. Admin approves org
3. Invite candidate email
4. Candidate accepts → consent → starts Meridian → autosave → submit
5. Employer dashboard shows submission; report awaiting review
6. Document IDs/timestamps internally (no secrets)

## Golden path test
`PILOT_GOLDEN_PATH=1 PLAYWRIGHT_BASE_URL=https://staging... npx playwright test tests/e2e/pilot-golden-path.spec.ts`
