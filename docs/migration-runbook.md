# Migration runbook (pilot overhaul)

## Safety rules

1. Never run destructive `DROP` / column removal on production without explicit founder approval.
2. Prefer additive migrations (`010+`).
3. Rehearse on **staging** Supabase project (or branch) before production.
4. Backup production before applying.

## Before production apply

```bash
# 1. Staging: apply migrations and verify
npx tsx scripts/verify-migration-state.ts

# 2. Confirm existing counts (example SQL in Supabase SQL editor)
# select count(*) from auth.users;
# select count(*) from public.pilot_requests;
# select count(*) from public.organizations;
# select count(*) from public.simulation_attempts;
```

## Production sequence

1. Snapshot / backup (Supabase Dashboard → Database → Backups).
2. Apply `010_pilot_lifecycle.sql` (and later additive files) via Supabase SQL or CLI.
3. Run `npx tsx scripts/verify-migration-state.ts` against production (service role in env).
4. Smoke: login existing admin, open `/admin/pilot-requests`, confirm rows still present.
5. Redeploy Vercel.

## Rollback / forward-repair

Additive migrations: forward-repair with a new migration rather than DROP.
If a migration fails mid-way, do not re-run blindly — inspect `supabase_migrations` / applied SQL, fix, continue.

## Reserved org names

Enforced in app (`src/lib/org/reserved.ts`) and migration check constraints where practical:
`fydell`, `admin`, `support`, `security`, `system`, and `fydell.com` domains.
