# Admin guide

How to run Fydell from `/admin`. For incident procedures see `runbook.md`,
and for interrupted work see `recovery.md`.

## Getting in

1. Sign in at `/login` with your normal Fydell account. There is no separate admin password.
2. Your account needs an active row in `platform_user_roles`. A super admin grants it from `/admin/users/<id>` ("Grant role").
3. Signed-out visitors are sent to `/login?next=…` and come back afterwards. Signed-in accounts without a role see `/admin/forbidden`, and so do roles that lack a page's capability.

When `ADMIN_MFA_REQUIRED=true`, three actions need a session verified with a
second factor (AAL2): granting code access, granting a replacement attempt, and
correcting a commercial record. It is off on dev and should be on in production.

## Roles and capabilities

Each page and action checks one capability. Capabilities are defined in
`src/lib/ops/admin-permissions.ts`.

| Capability | super_admin | admin | operator | support | reviewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| See operations, accounts, notifications, invitations | ✓ | ✓ | ✓ | ✓ | |
| Retry, cancel or requeue stuck work (`ops.act`) | ✓ | ✓ | ✓ | | |
| Open and review incidents, run diagnostics | ✓ | ✓ | ✓ | ✓ | |
| Send a password reset (`accounts.support`) | ✓ | ✓ | | ✓ | |
| Suspend or reactivate an account | ✓ | ✓ | | | |
| Grant a replacement attempt | ✓ | ✓ | | | |
| See commercial status | ✓ | ✓ | | ✓ | |
| Correct a commercial record | ✓ | ✓ | | | |
| Read the audit log, handle data requests | ✓ | ✓ | | | |
| Review reports | ✓ | ✓ | | | ✓ |
| Open time-limited access to private code | ✓ | ✓ | | | ✓ |
| Grant platform roles, change org membership, settings | ✓ | | | | |

No role can read a candidate's code by default (see "Private code" below).

## Where things are

| Page | What it shows |
| --- | --- |
| `/admin/overview` | Health at a glance and links to anything that needs attention |
| `/admin/organizations`, `/admin/users` | Organizations, accounts, memberships, roles; suspend and password reset |
| `/admin/activity` | Hiring roles, applications, work-sample generation and validation, active attempts, submission receipts, report versions, notification delivery |
| `/admin/engineering` | Report review queue; per-attempt evaluation runs and review (reviewers) |
| `/admin/operations` | Failed or stuck imports, uploads and evaluation runs, with retry, cancel and requeue |
| `/admin/cases` | Support incidents, replacement attempts, code-access grants, commercial corrections, diagnostics |
| `/admin/email` | Outbox and delivery status for every notification |
| `/admin/invitations`, `/admin/pilot-requests` | Invitation delivery; pilot requests and entitlements |
| `/admin/data-requests` | Account deletion and export requests |
| `/admin/repair` | Safe repair tools for known data problems |
| `/admin/audit` | Every admin action with actor, before and after |

## Everyday tasks

### Stuck or failed work

On `/admin/operations`:

- Pick the item and choose **Retry** (failed imports), **Requeue** or **Cancel** (evaluation runs), or **Reset** (a stuck upload).
- Give a reason. Each request carries an idempotency key, so a double click or a retried request returns the first outcome.
- The action is refused (409) when the item is not eligible, for example evaluating an attempt that expired without a submission. It is never forced.

### A candidate says the platform failed them

1. On `/admin/cases`, run **Diagnose** on the attempt. It shows states, timings and counts, never candidate content.
2. **Open an incident** on the attempt with the kind (runtime, evaluation, upload…) and a summary.
3. **Review** it.
   - The allowed transitions are: open → investigating → confirmed platform fault or not platform fault → resolved.
   - A review states the status you saw. If someone else changed it first, you get 409; reload and decide again.
4. Only after **confirmed platform fault** can an admin **grant a replacement attempt**:
   - The original attempt, its submission, events and reports are not changed.
   - The original invitation is closed and linked to the new one.
   - The grant is appended to the attempt history and to the audit log.
   - One replacement per attempt. No email is sent automatically; tell the candidate yourself.

### Private code

Only roles with `private_code.break_glass` can open private code, and only by
granting themselves access with a written justification:

1. On `/admin/cases`, choose **Open code access** on the attempt.
2. Give a justification and a duration (5 to 60 minutes).
3. The grant and each file read are audited.
4. Close the grant when you are done. Reads stop as soon as it is closed or expires.

### Commercial corrections

- Add a **credit** (positive) or an **adjustment** (either sign) on `/admin/cases`, with a reason and an idempotency key.
- The billing ledger and audit log are append-only. The database refuses updates and deletes, even from the service role.
- To fix a mistake, append another correction; never edit a row.
- A replay with the same key returns the original entry.

### Accounts

- **Suspend** bans sign-in immediately and ends API access. Suspending another admin requires `roles.manage`.
- **Reactivate** restores sign-in. Neither action deletes data.
- Account deletion is a soft delete. It is blocked while the account is the sole owner of an organization.

## One-time production setup

### Scheduled workers (pg_cron)

Migration `090_scheduled_workers` makes Supabase call the evaluation worker
(`/api/eng/worker`) and the email outbox (`/api/cron/process-email-outbox`)
once a minute through `pg_cron` and `pg_net`. No Vercel Pro plan is needed.
The migration schedules nothing until two Vault secrets exist, so applying it
alone changes nothing.

1. In Vercel, set `CRON_SECRET` for Production to a long random value (at least 16 characters; 32+ recommended) and redeploy.
2. In the Supabase SQL editor of the production project, store the same value and the public app URL in Vault. Type the values into the editor; never put them in a migration or commit them:

   ```sql
   select vault.create_secret('https://<production domain>', 'fydell_app_url');
   select vault.create_secret('<the CRON_SECRET value>', 'fydell_cron_secret');
   ```

   The URL must start with `https://`; anything else is refused.
3. Turn the schedule on:

   ```sql
   select public.fydell_schedule_workers();
   ```

   It returns `scheduled`, or `skipped: …` naming what is missing.
4. Check it after two minutes:

   ```sql
   select jobname, schedule, active from cron.job where jobname like 'fydell-%';
   select status, return_message, start_time from cron.job_run_details
     where jobid in (select jobid from cron.job where jobname like 'fydell-%')
     order by start_time desc limit 10;
   select status_code, created from net._http_response order by created desc limit 10;
   ```

   Expect `fydell-evaluation-worker` and `fydell-email-outbox`, runs that `succeeded`, and HTTP `200`. A `401` means the Vault secret and Vercel's `CRON_SECRET` differ.

To rotate the secret, change it in Vercel and redeploy, then run
`select vault.update_secret((select id from vault.secrets where name = 'fydell_cron_secret'), '<new value>');`.
The jobs read Vault on every run, so nothing needs rescheduling. To stop the
jobs, run `select public.fydell_unschedule_workers();`.

Only the service role can run these functions, and they call only the two
worker paths.

### Email confirmation

Production requires every new account to confirm its email address before it
can sign in. Outside production, accounts are confirmed on creation unless
`FYDELL_REQUIRE_EMAIL_CONFIRMATION=true`.

1. In Supabase, open Authentication → Providers → Email and turn on **Confirm email**. Configure custom SMTP (Resend) under Authentication → Emails → SMTP settings.
2. Under Authentication → URL Configuration, set the Site URL to the production domain and add `https://<production domain>/auth/callback` to the redirect URLs.
3. In the **Confirm signup** email template, link to the callback with the token hash so the link works in any browser:

   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
   ```

   The default `{{ .ConfirmationURL }}` also works, but only in the browser that signed up.
4. Check it with a real inbox. Sign up, then try to sign in before confirming: you should land on `/auth/check-email`, which can send a new link. After you click the link, sign-in works.

## Rules

- Admin actions never change candidate evidence or erase reports. Replacements add a new attempt; corrections add a new ledger entry; report fixes publish a new version.
- Every action lands in `/admin/audit` with the actor, the reason and the before and after state.
- Use synthetic accounts on dev to try things out. Never test on production data.
