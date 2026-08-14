# Wave 1 release candidates

| Commit | Role |
|---|---|
| `ec9e6b6` | First freeze of the Wave 1 product/contract work |
| `75c177b` | **`wave1-rc1`.** Historical. Not evidence-only: it changed product code (`src/app/product/page.tsx` dual CTA to one button plus a quiet link), added the acceptance harness, and recorded the no-ship gate. |
| see below | **`wave1-rc2`.** The database security fix. Current release candidate. |

## Why rc2 exists

`wave1-rc1` shipped two release-blocking database findings, both confirmed live:
`public.organizations` carried a policy while RLS was disabled, and
`public.scenario_events_candidate` executed as its owner and bypassed the RLS on
`scenario_events`. Fixing them changed the repository, so the resulting commit
is a new release candidate rather than an amendment to rc1.

rc2 contains:

- `supabase/migrations/023_org_rls_and_view_invoker.sql`
- `supabase/migrations/024_candidate_view_grant_order.sql`
- `src/lib/supabase/project-guard.ts` and its wiring into the admin and auth
  clients, so a server refuses to start against a project its keys do not match
- `scripts/test-db-security-contract.ts` and `scripts/test-project-guard.ts`,
  both added to `test:unit` and `test:release`
- three pre-existing em-dash copy-gate violations that were already failing
  `npm run test:release` at rc1

Evidence: `docs/wave1-db-security-verification.md`.

## Staging

Guarded apply of 015 through 022 plus the DA-01 seed is recorded in
`docs/wave1-staging-apply-record.md`. 023 and 024 were applied to `fydell-dev`
(`btbmvrvynnrhapjdkunz`) only.

Production (`qtrhwrcxthtqvkeerptp`) remains untouched.

**Before the next production release**, set `FYDELL_ALLOW_PRODUCTION_DB=true` in
the production environment. rc2 puts the production project on an explicit
denylist and the server will otherwise refuse to build its Supabase clients.

## Verdict

Still NO-SHIP. The two P0 database findings are closed and verified, but the
loop itself is unproven: staging auth, redirect URLs, storage and the analysis
provider are not configured, and the golden paths, adversarial suite and
authenticated visual approval have not run against a live environment.
