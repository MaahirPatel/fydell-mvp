# Handoff: current state for new agent sessions

Read this first, then `docs/release-checklist.md` (the paid-release tracker, 161 requirements) and `.cursor/rules/simulation-engine.mdc` (isolation rules that must be followed).

## Environments

- Staging database: Supabase `fydell-dev` (ref `btbmvrvynnrhapjdkunz`). Local `.env.local` points here. Migrations through 027 applied.
- Production database: Supabase `fydell` (ref `qtrhwrcxthtqvkeerptp`). Do not use for testing. Migrations 026 and 027 are not applied there yet.
- Hosting: Vercel project `fydell-mvp`. Preview environment variables are unverified.
- Secrets live only in `.env.local` (git-ignored) and Vercel settings. Never print or commit them.

## Working

- Marketing site (light theme), `/developers`, `/employers`, `/pricing` with estimator, `/demo`. Design rules in `DESIGN.md`.
- GitHub extractor (`src/lib/passport/github/`, `POST /api/passport/github`): real API reads, commit-pinned, cited findings, role suggestions with gaps. Tests: `npm run test:github`.
- Engineering Passports, share links with revoke, employer passport review.
- Stripe billing in test mode: checkout, customer portal, signed webhook, metered usage per completed simulation (`src/lib/billing/`, `src/app/api/billing/`, migration 027). Catalog created with `npm run stripe:setup`.
- Organizations, memberships, invitations, simulation sessions, events, submit, defense, decision routes.
- Python execution in Vercel Sandbox with Monaco editor (branch `codex/fydell-simulation`, see `docs/engineering-execution-increment.md`). Currently attached to the sandbox demo only.

## Not working yet (largest gaps)

- Execution is not connected to real employer invitations or the canonical engineering report.
- Only one engineering scenario (applied AI). No reviewed Python backend task with starter repo, public tests and hidden tests.
- Role creation and publishing flow for employers.
- Email delivery: `RESEND_API_KEY` and `EMAIL_FROM` are not configured, so invitations are not emailed.
- Invites are not gated on an active billing plan.
- Retention, deletion and export are manual.

## Founder-owned tasks (agents cannot do these)

Stripe live activation (account holder must be 18+), legal review of terms and privacy, domain and Resend DNS verification, AI provider account and data-retention settings, Vercel plan and login, production migration approval, a qualified human reviewer, and test employers and candidates.

## Working agreements

- One task per session. Commit when done.
- Additive migrations only, numbered from 028. Never touch production data as a test.
- No fabricated data, scores, or "all tests passed" claims. Label demo data.
