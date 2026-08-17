# Fydell pilot audit

State of the product as found, before the pilot build. Everything here was read
from the running system, the production database, or the source; nothing is
inferred from what the code appears to intend.

Audited against production project `qtrhwrcxthtqvkeerptp` and a local preview
server. Row counts are as of the audit.

---

## 1. Why the workspace said "temporarily unavailable"

**Root cause: a liveness check that only asked whether credentials existed, in
front of a call that throws when they cannot be used.**

`src/app/app/employer/layout.tsx` gated its data loading on
`isSupabaseConfigured()`, which returns true when the URL and service key are
merely *set*. The next statement called `createAdminSupabaseClient()`, which runs
`assertProjectBinding()` and throws when the environment is not allowed to touch
the project the credentials name. Production points at the production project
and does not set `FYDELL_ALLOW_PRODUCTION_DB=true`, so the guard refused, the
layout threw, and every route under `/app/employer` fell to the error boundary.

Two things made this hard to see:

- `/api/health` reported `"database":"error"` but the console rendered generic
  copy, so the two never got connected.
- The `else` branch was worse than the throw. When credentials were absent
  entirely, the layout skipped the query block and rendered a *normal* console
  with an empty workspace. An employer reads that as "I have no candidates"
  when the truth is that the server never reached the database.

| Property | Finding |
|---|---|
| Failing call | `createAdminSupabaseClient()` → `assertProjectBinding()` |
| Scope | Every route under `/app/employer` |
| Affected users | All, regardless of workspace or membership |
| Environments | Production, and any local run without the opt-in |
| Data at risk | None. It fails before any read or write. |

**Repair.** `supabaseAdminStatus()` answers the same question without throwing
and distinguishes `ready`, `missing_credentials`, and `project_refused`. The
layout now returns `WorkspaceUnavailable`, which names the failure class, states
that nothing was written or deleted, and offers retry, sign-in, and a
`WS-…` reference matching a server log line. Operator detail stays in the log.

**Regression cover.** `scripts/test-workspace-availability.ts` asserts all six
credential permutations, including that production-without-opt-in classifies as
`project_refused` rather than `ready`. Wired into `test:unit` and `test:release`.

**Still required to actually restore production:** set
`FYDELL_ALLOW_PRODUCTION_DB=true` in the production deployment. The repair makes
the failure honest and recoverable; it does not grant access.

### Two adjacent defects found on the same trace

1. **`/onboarding/employer` was unreachable.** A `/onboarding/:path*` catch-all
   redirect in `next.config.ts` swallowed it, despite three call sites pushing
   there. Anyone choosing "I am hiring" on `/signup/role` skipped workspace
   naming and silently got a workspace named after their email domain. The
   catch-all now excludes that segment. *Caveat: the redirect was
   `permanent: true`, so browsers that hit it during the broken window hold a
   cached 308.*
2. **Login leaked workspace copy.** `LoginForm` passed the internal message
   through, so a failed sign-in claimed the *workspace* was unavailable. It now
   says sign-in is.

---

## 2. Route map

130 route files. Grouped by whether the pilot keeps them.

### Employer console — keep, this is the pilot surface

| Route | State | Notes |
|---|---|---|
| `/app/employer` | Works | Home. Rebuild as operating console. |
| `/app/employer/assessments` | Works | Evaluations. Rename to match nav language. |
| `/app/employer/assessments/report/[sessionId]` | Works | Evidence report. |
| `/app/employer/candidates` | Works | Needs detail view; none exists. |
| `/app/employer/reports` | Works | |
| `/app/employer/settings` | Works | Shows signup identity as of this session. |
| `/app/employer/workbench` | New | Engine catalog, added this session. |
| `/app/employer/workbench/[scenarioId]` | New | Runs the engine in-workspace. |
| `/app/employer/workbench/[scenarioId]/analysis` | New | |
| `/app/employer/cohort`, `/compare` | Works | Pilot extras, not in nav. |

`loading.tsx` and `error.tsx` exist at the `/app/employer` root only. No
per-route loading, no permission-denied state, no expired-session state.

### Candidate — incomplete

| Route | State | Notes |
|---|---|---|
| `/invite/[token]` | Works | Invitation acceptance. |
| `/app/candidate` | Thin | Not the lifecycle-aware home the pilot needs. |
| `/sim/[sessionId]` | Works | Production `WorkbenchRunner`. |
| `/sim/[sessionId]/result` | Works | |
| `/results/[token]`, `/record/[token]` | Works | Token-scoped receipt surfaces. |
| `/app/fde` | Works | Prior-generation surface. |

**Missing entirely:** candidate home keyed to lifecycle state, system check,
oral-defense stage, Work Receipt sharing controls.

### Duplicate and legacy forks — decide before building

`/app`, `/app/candidates`, `/app/reports`, `/app/templates`,
`/app/simulations/new` are an earlier console that duplicates `/app/employer`.
`/dashboard` redirects. These are not linked from the current nav but are
reachable and will drift. **Recommend: retire, not maintain.**

### Simulation engines — three coexisting

1. `/sim/[sessionId]` — production `WorkbenchRunner`, has the real data.
2. `/lab/sim/*` — the strangler-fig engine built in phases 1–4.
3. `/app/employer/workbench/*` — same engine, mounted in the workspace.

2 and 3 share one runtime; only the chrome differs. The pilot must decide
whether the Data Analyst evaluation runs on the engine or on `WorkbenchRunner`.
**The engine is the better base** — it has evidence/observation separation and
`INSUFFICIENT_EVIDENCE` outcomes, which the report format requires — but it
persists to localStorage only, which is development-only and cannot back a real
evaluation.

---

## 3. Supabase schema and authorization

96 public tables. **Four generations of overlapping schema**, of which one holds
real data.

| Generation | Tables | Rows | Verdict |
|---|---|---|---|
| 1. original | `candidate_invites`, `simulation_attempts`, `simulation_events`, `evidence_reports`, `hiring_decisions` | all 0 | Dead |
| 2. `pilot_*` | `pilot_candidates`, `candidate_invitations`, `pilot_simulation_sessions`, `pilot_session_*`, `evidence_reports_v2`, `employer_decisions` | all 0 | Dead |
| 3. `fde_*` | `fde_profiles` (3), `fde_audit_logs` (6), `relay_sessions`, `work_receipts`, `receipt_permissions` | near-0 | Mostly dead; receipt tables unused |
| 4. `sim_*` | `sim_sessions` (106), `sim_session_state` (106), `sim_session_events` (30), `sim_competency_results` (15), `sim_messages` (6), `sim_evidence_items` (5), `sim_submissions` (3), `sim_analysis_runs` (3), `sim_credentials` (3), `sim_invitations` (2) | **live** | **Build here** |

**The pilot should build on `sim_*` and leave the other three alone.** They cost
nothing empty, and dropping them is a migration risk with no upside during a
pilot.

Tables the pilot needs that already exist and are empty — schema present, wiring
absent: `oral_defense_sets`, `oral_defense_questions`, `oral_defense_responses`,
`sim_receipt_shares`, `sim_receipt_share_access`, `candidate_consents`,
`preflight_checks`, `sim_employer_decisions`, `pilot_audit_events`.

This is the important finding for scope: **most of the pilot's persistence layer
is already migrated.** The gap is product surface and wiring, not schema.

### Identity

`profiles` 4 · `organizations` 2 · `organization_members` **1**

Three of four users have no active membership, so they take the
`ensureDefaultOrganization` path on first load — which is exactly the path the
broken `/onboarding/employer` redirect was meant to precede. Worth confirming
those three are test accounts before the pilot.

### Security findings

RLS is enabled on 95 of 96 tables. Two errors and one systemic warning:

| Severity | Finding | Assessment |
|---|---|---|
| **ERROR** | `system_heartbeats` has RLS **disabled** — fully readable and writable with the anon key | Fix before pilot. Table is empty, so enabling RLS breaks nothing. |
| **ERROR** | View `scenario_events_candidate` is `SECURITY DEFINER`, so it bypasses the caller's RLS | Review; a candidate-facing view is the wrong place for definer rights. |
| **WARN** | ~25 `mvp_*` `SECURITY DEFINER` functions are `EXECUTE`-able by `anon` over `/rest/v1/rpc/…` | Most take a `p_secret` argument, so they are shared-secret gated rather than open. But `mvp_dashboard`, `mvp_create_invite`, and `mvp_finalize_attempt` are reachable without going through the app if that secret leaks. |
| **WARN** | `handle_new_user()` and `prevent_last_super_admin_removal()` are trigger functions exposed as callable RPC | Should not be `EXECUTE`-able by anyone. |
| **WARN** | 7 functions have a mutable `search_path` | Privilege-escalation vector for definer functions. Cheap to fix. |
| **WARN** | Leaked-password protection is off in Supabase Auth | One setting. |
| INFO | 37 tables have RLS on with no policies | Deny-all, which is safe. Fine while all access is service-role. |

Nothing here indicates data exposure has occurred. The `system_heartbeats` row
is the only genuinely open surface and it holds no rows.

---

## 4. Capability matrix

| Pilot requirement | Schema | Server | UI | Gap |
|---|---|---|---|---|
| Auth, workspace, membership | Yes | Yes | Yes | Repaired this session |
| Signup identity in console | Yes | Yes | Yes | Done this session |
| Publish one evaluation | Yes | Partial | Partial | Lifecycle not modelled |
| Invite candidate | Yes | Yes | Yes | Delivery state not surfaced honestly |
| Invitation delivery health | Yes | Partial | No | `email_outbox`/`email_events` unused |
| Lifecycle state machine | Partial | `v3/state.ts` exists, tested | No | Not wired to any page |
| Candidate home by state | Yes | No | No | Not built |
| System check / consent | Yes | No | No | Tables empty |
| Data Analyst workbench | localStorage only | No | Engine exists | **Needs durable persistence** |
| Evidence-linked claims | Yes | No | Engine partial | Notebook not built |
| Changed information + revision | No | No | Engine has world flags | Needs version history |
| Final submission, single-use | Yes | Guard fn exists | No | `sim_submission_guard` present |
| Analysis queue | Yes | Partial | No | 3 historical runs |
| Evidence report | Yes | Partial | Partial | Citation inspection missing |
| Oral defense | **Yes** | Partial | No | **Has a data-loss bug, below** |
| Employer decision | Yes | No | No | |
| Work Receipt + sharing | **Yes** | No | No | Scoped/expiring links unbuilt |

---

## 5. Known defects to carry into the build

1. **Oral-defense regeneration deletes candidate answers.** `oral-defense.ts:43`
   regenerates a question set by deleting existing rows, taking submitted
   responses with them. This is a hard-failure item under "candidate work
   disappears"; it must be fixed before the defense stage ships.
2. **Engine persistence is localStorage.** Development-only by design. A real
   evaluation cannot rest on it; this is the largest single piece of work.
3. **`system_heartbeats` RLS.** One statement, blocked on your decision:
   ```sql
   ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;
   ```
4. **Legacy console fork** at `/app/*` will drift from `/app/employer/*`.

---

## 6. What must not be touched

- `WorkbenchRunner` and the v2 scoring path, which own the 106 live sessions.
- `sim_session_events` write paths.
- The four generations of empty tables — leave them; dropping is risk without
  benefit during a pilot.
- The Fydell mark, wordmark, and design tokens.

---

## 7. Sequence

The audit changes the plan in one material way: **schema is not the bottleneck.**
Most tables the pilot needs already exist and are empty. The work is durable
persistence for the engine, then surfaces.

1. Restore production (`FYDELL_ALLOW_PRODUCTION_DB`), enable the one missing RLS.
2. Move engine persistence from localStorage to `sim_*`. Everything downstream
   depends on this.
3. Vertical slice: invite → accept → start → one persisted evidence-linked claim
   → refresh → employer sees correct state.
4. Complete the workbench: sources, analysis, notebook, changed information,
   revision, final review.
5. Report and oral defense, fixing the regeneration bug first.
6. Work Receipt with scoped, expiring, revocable links.
7. Visual capture at 1440/1366/1280/1024, then one batched correction round.
