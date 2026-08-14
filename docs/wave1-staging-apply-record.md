# Wave 1 guarded staging apply record

**Target:** fydell-dev only  
**Date:** 14 August 2026  
**Branch:** `wave1-rc1`  
**Release candidate:** `75c177b` (not `ec9e6b6`). `75c177b` changed product code, not evidence only.

## Guard

| Check | Result |
|---|---|
| Allowlisted name | `fydell-dev` |
| Allowlisted ref | `btbmvrvynnrhapjdkunz` |
| Allowlisted host | `db.btbmvrvynnrhapjdkunz.supabase.co` |
| API URL | `https://btbmvrvynnrhapjdkunz.supabase.co` |
| Denied production name | `fydell` |
| Denied production ref | `qtrhwrcxthtqvkeerptp` |
| Denied production host | `db.qtrhwrcxthtqvkeerptp.supabase.co` |
| `.env.local` | Denied (production). Not loaded for writes. |
| Apply path | MCP `project_id=btbmvrvynnrhapjdkunz` only |
| Production writes | None |

`get_project` on the allowlisted id returned name `fydell-dev`, status `ACTIVE_HEALTHY`, region `us-east-2`.

## Pre-state

Captured in `docs/wave1-staging-pre-state.json` before 015: migrations through 014, no `sim_*` tables, `organizations` and `system_heartbeats` RLS disabled, zero user rows.

001–014 on disk matched repository history and were already applied on fydell-dev.

015–022 inspection: no `DROP TABLE` / `TRUNCATE` / `DELETE FROM` / `INSERT`. SECURITY DEFINER functions pin `search_path = public`.

## Migration plan executed

Applied sequentially via MCP `apply_migration`. Stop-on-failure. None skipped, none marked applied by hand.

| # | Name | Version | Result |
|---|---|---|---|
| 01 | `015_fde_evidence_math` | `20260814223756` | applied |
| 02 | `016_attempt_kind` | `20260814223803` | applied |
| 03 | `017_workspace_engine` | `20260814223830` | applied |
| 04 | `018_shadow_lock` | `20260814223850` | applied |
| 05 | `019_applied_roles_simulations` | `20260814223942` | applied |
| 06 | `020_micro_sims_feedback` | `20260814223950` | applied |
| 07 | `021_october_pilot_cohort` | `20260814224013` | applied |
| 08 | `022_close_answer_key_reads` | `20260814224018` | applied |

`list_migrations` on fydell-dev now shows 001–022. Production was not queried and not written.

## Schema verification

Required DA-01 tables exist. RLS enabled on all of them:

`sim_templates`, `sim_template_versions`, `sim_invitations`, `sim_sessions`, `sim_session_state`, `sim_session_events`, `sim_messages`, `sim_ai_interactions`, `sim_submissions`, `sim_analysis_runs`, `sim_competency_results`, `sim_evidence_items`, `sim_credentials`, `sim_employer_decisions`, `sim_feedback`, `sim_receipt_shares`, `sim_receipt_share_access`, `pilot_cohorts`, `candidate_consents`, `preflight_checks`, `oral_defense_sets`, `oral_defense_questions`, `oral_defense_responses`, `pilot_audit_events`.

Checked columns, check-constraint enums, foreign keys, and indexes on the core DA-01 tables match 019–021. Notable enums:

- invitation status: `sent|opened|accepted|started|completed|expired|revoked`
- email delivery: `queued|sent|failed|not_configured` (no `delivered`)
- session status: `accepted|active|submitted|analyzed|report_ready`
- report status: `not_available|pending|human_review_required|ready|failed|superseded`

Public tables with RLS still disabled: `organizations` only. `system_heartbeats` is now RLS-enabled (022). Advisor ERROR remains: `organizations` has policy `organizations_select_member` but RLS is not enabled. Do not enable it in this apply; that is a configuration/security follow-up, not a new migration invented here.

Known inherited gap: `scenario_events_candidate` is a view without `security_invoker` (017 as written). 022 revoked base-table SELECT of `evaluator_only`.

## Seed

Only DA-01 was seeded.

| Field | Value |
|---|---|
| slug | `ops-yield-investigation` |
| role | `data_analyst` |
| status | `published` |
| content version | `northline-ops-yield@3.0.0` |
| hash | `dd44fce7209abbc9` |
| template id | `7860bd62-6d11-45af-86a8-fcb37494b947` |
| version id | `550f195a-9da4-4676-97a9-6c924bdfe0dc` |
| version | 1 |

No other `sim_templates` rows exist.

Isolated test identities were **not** inserted into `auth.users` by SQL. The acceptance protocol creates owner / member / candidate / outsider through the product. That step is blocked until a fydell-dev service-role key exists in a gitignored staging env file.

## RLS probes (no test users yet)

| Actor | `sim_sessions` | `sim_invitations` | `sim_templates` |
|---|---|---|---|
| `anon` | 0 | 0 | 0 |
| authenticated outsider (unknown `sub`) | 0 | 0 | 1 published catalog row |

Owner / member / candidate row access still requires product-created identities plus a fixture invitation/session. Do not invent those rows by hand.

## Configuration (schema ≠ config)

Staging is schema-equivalent after 015–022. It is **not** automatically configuration-equivalent.

| Surface | Status |
|---|---|
| Email / Resend | Leave unset on staging so invite honesty is `not_configured`. Do not copy a production Resend key. |
| Auth redirect URLs / site URL | Not verified. Must be localhost or a staging origin, never the production host. |
| Storage policies | Not verified. |
| Scheduled jobs | Not verified. |
| Analysis provider | App code pins DA-01 to v2 and forbids keyword fallback. Live proof still requires the staging app. |
| Environment | `.env.local` points at production. Writes must not load it. `.env.staging.local` must contain only fydell-dev URL + keys. |
| Service-role key | **Missing.** MCP exposes publishable/anon only. Supabase CLI is not logged in (`Access token not provided`). API smoke, seed-via-script, and golden paths cannot start until the fydell-dev service-role key is placed in `.env.staging.local`. Never paste the production key (`qtrhwrcxthtqvkeerptp`). |

## Tests run after migrate/seed

| Command | Result |
|---|---|
| `npx tsx scripts/test-wave1-contract.ts` | Pass |
| Live API smoke | **Not started** — no fydell-dev service-role key; current `localhost:3000` must not be assumed to be staging |
| Fresh golden path ×2 | **Not started** |
| Recovery golden path ×2 | **Not started** |
| Live adversarial suite | **Not started** |
| Authenticated visual approval | **Not started** |
| Hiring-manager sessions | **Not started** |

## Resulting commit

No new commit was created. HEAD remains the RC on `wave1-rc1` (`75c177b` or later local acceptance-only commits). This record is uncommitted documentation.

## Stop line

Production is untouched. The next allowed step is **not** Wave 2. It is:

1. Put the **fydell-dev** service-role key in `.env.staging.local` (script-enforced allowlist).
2. Restart the app on that file only.
3. Recheck Auth redirects, Resend (unset), storage, jobs, and analysis env.
4. Create isolated identities through the product.
5. API smoke → fresh golden path → recovery golden path → adversarial suite.
