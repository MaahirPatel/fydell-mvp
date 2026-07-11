# Fydell debug handoff — 2026-07-11 (durable loop)

## Root cause of remaining production failure

1. Local `.env` had empty Supabase keys → file store only (works on one Node process, **not on Vercel**).
2. Existing Supabase `public` schema is organizations/pilots — incompatible with MVP workspaces code.
3. Invite links used `/c/...` which refused to run without Supabase.

## Fixed

- Isolated `mvp` schema + secure RPCs on Supabase project `fydell`
- App uses anon key + `FYDELL_MVP_DB_SECRET` (no service role required for the loop)
- Invite URLs → `/workroom/...`
- Submit no longer silently succeeds without persistence

## Runtime proof (local → live Supabase)

- INVITE created with real token
- START attempt id returned
- SUBMIT `overall_score: 63`
- DASH `attempts=1 invites=1 completed=1`
- REPORT `signal=moderate hasMemo=True`

## Vercel (required for fydell.com)

Copy from local `.env.local` into Vercel Project → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FYDELL_MVP_DB_SECRET`
- `NEXT_PUBLIC_APP_URL=https://www.fydell.com`

Then redeploy.
