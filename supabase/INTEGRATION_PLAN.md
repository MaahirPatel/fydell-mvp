# Fydell — Supabase Integration Plan

Design + prep only. **`index.html` is not modified by this plan.** This document
maps every current `localStorage` read/write in the shipped single-file app to
its Supabase equivalent, defines a thin data-access layer, and lays out an
incremental rollout that keeps the live site working the entire time.

Companion file: [`schema.sql`](./schema.sql) — the full idempotent Postgres
migration (tables, RLS, indexes, triggers). Paste it into the Supabase SQL
editor to provision the backend.

---

## 0. Current state (what the app does today)

- Entire app is one file: `index.html`.
- All state lives in `localStorage` behind two helpers:
  - `lsGet(key, default)` / `lsSet(key, value)` (JSON, with an in-memory
    fallback `__fdMem` when storage is blocked).
- Two overlapping models coexist:
  1. **Legacy per-user keys**: `fydell_users`, `fydell_session`,
     `fydell_data_<email>`, `fydell_invites`, `fydell_events`,
     `fydell_decisions`.
  2. **Unified data model** (`fydell_dm_*`): `organizations`, `pilots`,
     `candidateInvites`, `simulationAttempts`, `evidenceReports`,
     `hiringDecisions`, `activity`, accessed through the `dm*()` helpers.
- Auth is fake: passwords are stored in plaintext inside `fydell_users`;
  "session" is just the current email string in `fydell_session`.
- A best-effort `fetch` to `http://localhost:8787` (`syncSignup`, admin portal)
  is the only existing server touch-point; it is offline-tolerant.

---

## 1. localStorage inventory → Supabase mapping

Legend: **DAL** = function in the new data-access layer (§3).

### 1.1 Storage primitives

| index.html | Location | Supabase equivalent |
|---|---|---|
| `lsGet(k,def)` | ~L1886 | Replaced per-entity by `supabase.from(...).select()` via DAL |
| `lsSet(k,v)` | ~L1891 | Replaced per-entity by `insert`/`update`/`upsert` via DAL |
| `__fdMem` fallback | ~L1885 | Keep as-is for offline resilience; DAL falls back to it on network error |

### 1.2 Auth + users (`fydell_users`, `fydell_session`, `fydell_data_<email>`)

| index.html read/write | Location | Supabase equivalent |
|---|---|---|
| `allUsers()` → `lsGet('fydell_users')` | L1895 | `profiles` table (via `db.getProfile`, admin list via service role) |
| `currentEmail()` → `lsGet('fydell_session')` | L1896 | `auth.getUser()` / session; `db.currentUser()` |
| `currentUser()` | L1897 | `db.currentProfile()` (join `auth.uid()` → `profiles`) |
| `authSubmit()` signup branch | L2020–2042 | `auth.signUp({ email, password, options:{ data:{ role, username, workspace } } })`; profile row auto-created by `handle_new_user` trigger |
| `authSubmit()` login branch | L2043–2051 | `auth.signInWithPassword({ email, password })` |
| `logout()` → clears `fydell_session` | L2053 | `auth.signOut()` |
| `syncSignup()` → POST `:8787/api/signup` | L3463 | Drop; sign-ups now land in `profiles` automatically |
| `dmEnsureOrg(user)` | L1921 | `db.ensureOrg()` → `organizations` upsert + `profiles.organization_id` update |
| `dmPersistUser(user)` | L1931 | `db.updateProfile({ organization_id })` |
| `userData()` / `saveUserData()` / `addActivity()` (`fydell_data_<email>`) | L1898–1900 | Company activity → `activity_log`; per-user "authored simulations"/practice attempts are **not** migrated (the shipped product uses 4 fixed simulation keys, and practice runs are private/local — keep them client-only or drop). |

**Auth migration summary.** Replace the plaintext `fydell_users` auth with
Supabase Auth email/password:

1. Sign-up: `supabase.auth.signUp` with `options.data = { role, username, workspace }`.
   The `handle_new_user` trigger inserts the `profiles` row. For `company`
   users, immediately call `db.ensureOrg()` to create the `organizations` row
   and link `profiles.organization_id`.
2. Login: `supabase.auth.signInWithPassword`.
3. Session: `supabase.auth.getSession()` on load + `onAuthStateChange` listener
   to drive routing (`console` for company, `candidatehome` for candidate).
4. Role: default set at sign-up; **do not** trust `user_metadata.role` for
   authorization. RLS uses the `profiles.role` column (server-owned). If roles
   ever gate sensitive access, promote role into `app_metadata`.
5. Password rules stay the same (email format + min 6 chars) — Supabase Auth
   enforces its own minimum; keep client validation for UX parity.

### 1.3 Organizations / pilots / invites (unified model)

| index.html | Location | Supabase equivalent |
|---|---|---|
| `dmOrgs()` / `dmEnsureOrg` | L1912/1921 | `organizations` — `db.ensureOrg`, `db.getOrg` |
| `dmCreatePilot(orgId, opts)` | L1934 | `db.createPilot()` → insert `pilots` |
| `dmPilots()` / `dmFindPilot(id)` | L1913/1944 | `db.listPilots()` / `db.getPilot()` |
| `dmCreateInvite(pilot,name,email,token)` | L1946 | `db.createInvite()` → insert `candidate_invites` |
| `createInvite()` / `createInviteFull()` (legacy `fydell_invites`) | L2084/2324 | Collapse into `db.createInvite()`; legacy invite `sim{}` blob is derived from `simulation_key` at render time (no separate table needed) |
| `dmInviteByToken(token)` / `invFind` | L1954/2081 | `db.getInviteByToken()` |
| `dmUpdateInvite(token, fn)` / `invUpdate` | L1955/2082 | `db.updateInvite(token, patch)` |
| `dmDashboard(orgId)` | L1988 | `db.getDashboard(orgId)` — parallel selects of pilots/invites/reports/decisions/activity, counts computed client-side (same logic) |
| `attemptProgressFor(inviteId)` | L2208 | Included in `db.listAttempts()` / dashboard query |

### 1.4 Attempts + events

| index.html | Location | Supabase equivalent |
|---|---|---|
| `dmStartAttempt(inv)` | L1956 | `db.startAttempt(inviteId)` → insert `simulation_attempts` + update invite status |
| `dmCompleteAttempt(inv,res)` | L1965 | `db.completeAttempt(...)` → update attempt, insert `evidence_reports`, update invite |
| `logSimulationEvent(type,payload)` (+ `fydell_events`) | L2386 | `db.logEvent(attemptId, event)` → insert `simulation_events`; keep pushing to `FD.run.events` for the live UI feed. Batch/flush is recommended (see §5.4). |
| `evtGet(attemptId)` | L2401 | `db.listEvents(attemptId)` |
| `storeAttempt(res)` (practice, `fydell_data`) | L2070 | Practice runs stay client-side (not company data) — no Supabase write |

### 1.5 Evidence reports + hiring decisions + chat

| index.html | Location | Supabase equivalent |
|---|---|---|
| `dmReports()` | L1916 | `db.listReports(orgId)` |
| report row insert (inside `dmCompleteAttempt`) | L1972–1975 | `db.completeAttempt` inserts into `evidence_reports` incl. full memo in `report_json` |
| `generateEvidenceReport()` / `renderReport()` | L3317/3378 | Unchanged logic; source rows come from `evidence_reports` + `simulation_events` instead of localStorage |
| `saveDecision(key,dec,el)` (`fydell_decisions`) | L3406 | `db.saveDecision(reportId, decision, notes)` → upsert `hiring_decisions` (unique on `report_id`) + update invite `decision`/status |
| `saveDecisionNote(key,val)` | L3412 | `db.saveDecision(...)` (notes column) |
| `dmSaveDecision(...)` | L1980 | Same → `db.saveDecision` |
| `postMsg(token,from)` / `inv.messages[]` | L2187 | `db.sendMessage(inviteId, sender, body)` → insert `chat_messages` |
| `renderChat(token, meSide)` | L2178 | `db.listMessages(inviteId)` (optionally Realtime subscription) |

### 1.6 Activity + admin

| index.html | Location | Supabase equivalent |
|---|---|---|
| `dmLogActivity(orgId,type,text)` | L1919 | `db.logActivity(orgId, type, text)` → insert `activity_log` |
| `renderAdmin()` fetch `:8787/api/users` | L3519 | Admin view over `profiles` (requires service role / admin-gated Edge Function — never expose service key in the client) |

---

## 2. Loading supabase-js in the single HTML file

Add the CDN client + a small config block in `<head>` (ESM build; pin the
major version and verify the current release before shipping):

```html
<script type="module">
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  // Config: see §2.1 for where these values live.
  window.fydellSupabase = createClient(
    window.FYDELL_SUPABASE_URL,
    window.FYDELL_SUPABASE_ANON_KEY,   // publishable/anon key ONLY — never service_role
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
</script>
```

The DAL (§3) is then a second `<script type="module">` (or inlined) that reads
`window.fydellSupabase`. Because the app is otherwise plain global-function
JS, expose the DAL as `window.db = { ... }` so existing inline handlers can be
repointed with minimal churn.

### 2.1 Where the URL + anon key live

- **Do not commit real keys** and do not invent them.
- The Supabase **project URL** and **anon/publishable key** are safe to ship in
  the browser (they are protected by RLS) — but keep them out of source where
  practical:
  - Simplest for this static Vercel deploy: a tiny committed
    `supabase-config.js` that sets `window.FYDELL_SUPABASE_URL` /
    `window.FYDELL_SUPABASE_ANON_KEY`, generated at build time from Vercel
    env vars (`FYDELL_SUPABASE_URL`, `FYDELL_SUPABASE_ANON_KEY`). Loaded with a
    `<script src="/supabase-config.js"></script>` before the module above.
  - Never place the `service_role`/secret key in any client file. Admin-only
    reads (the sign-up portal) must go through a server route / Edge Function.

---

## 3. Proposed data-access layer (DAL)

A single module, e.g. `supabase-dal.js` (or an inline module), exposing
`window.db`. Signatures below; all return Promises and fall back to the
existing `__fdMem`/localStorage path on network failure during rollout.

```js
// ---- auth ----
db.signUp({ email, password, role, username, workspace })     // -> { user, error }
db.signIn({ email, password })                                // -> { session, error }
db.signOut()                                                  // -> void
db.currentUser()                                              // -> auth user | null
db.currentProfile()                                           // -> profile row | null
db.onAuth(callback)                                           // subscribe to auth state

// ---- organizations / profiles ----
db.ensureOrg()                                                // -> org (create+link if missing)
db.getOrg(orgId)                                              // -> org
db.updateProfile(patch)                                       // -> profile

// ---- pilots ----
db.createPilot(orgId, { simulationKey, title, roleTitle, department, dueDate, priorities })
db.listPilots(orgId)                                          // -> pilot[]
db.getPilot(pilotId)                                          // -> pilot

// ---- invites ----
db.createInvite(pilot, { name, email, token })                // -> invite
db.getInviteByToken(token)                                    // -> invite
db.listInvites(orgId)                                         // -> invite[]
db.updateInvite(token, patch)                                 // -> invite

// ---- attempts / events ----
db.startAttempt(invite)                                       // -> attempt
db.completeAttempt(invite, res)                               // -> { attempt, report }
db.logEvent(attemptId, event)                                 // -> event (batched flush)
db.listEvents(attemptId)                                      // -> event[]

// ---- reports / decisions ----
db.listReports(orgId)                                         // -> report[]
db.getReport(reportId)                                        // -> report
db.saveDecision(reportId, { decision, notes })                // -> decision (upsert)

// ---- chat / activity / dashboard ----
db.sendMessage(inviteId, sender, body)                        // -> message
db.listMessages(inviteId)                                     // -> message[]
db.logActivity(orgId, type, text)                             // -> void
db.getDashboard(orgId)  // -> { pilots, invites, reports, decisions, activity, counts }
```

Mapping notes:
- `token` is preserved as the invite share-link identifier (unique column), so
  `#invite=<token>` deep links keep working unchanged.
- `db.completeAttempt` does the current `dmCompleteAttempt` work in one call:
  update attempt → insert `evidence_reports` (store the full `generateEvidenceReport`
  memo in `report_json`) → update invite to `completed`.
- `db.getDashboard` reproduces `dmDashboard`'s counts client-side from the
  fetched rows (no schema change needed).

---

## 4. Field-by-field mapping (localStorage object → column)

| Legacy object.field | Table.column |
|---|---|
| user.email / username / role / workspace / avatar / createdAt / organizationId | profiles.email / username / role / workspace / avatar_url / created_at / organization_id |
| user.password | **dropped** (Supabase Auth) |
| org.name / ownerEmail / createdAt | organizations.name / owner_email (+ owner_id) / created_at |
| pilot.roleTitle / simKey / simTitle / department / dueDate / priorities / status | pilots.role_title / simulation_key / simulation_title / department / due_date / priorities (jsonb) / status |
| invite.candidateName / candidateEmail / token / simKey / status / progress / fit / decision / acceptedAt / startedAt / completedAt | candidate_invites.candidate_name / candidate_email / token / simulation_key / status / progress / fit / decision / accepted_at / started_at / completed_at |
| attempt.inviteId / pilotId / candidateId(email) / simulationId / status / progress / startedAt / submittedAt / state / finalResponse | simulation_attempts.invite_id / pilot_id / candidate_email (+ candidate_id) / simulation_key / status / progress / started_at / submitted_at / state / final_response |
| event.id / attemptId / userId / type / category / section / label / dim / detail / payload / t / timestamp / visibleToReviewer | simulation_events.client_event_id / attempt_id / user_email / type / category / section / label / dim / detail / payload / elapsed_seconds / event_time / visible_to_reviewer |
| report.attemptId / candidateId / pilotId / organizationId / fit / overall / createdAt | evidence_reports.attempt_id / candidate_email (+ candidate_id) / pilot_id / organization_id / fit / overall / created_at (+ recommendation, confidence, report_json) |
| decision.reportId / decision / notes / createdAt | hiring_decisions.report_id / decision / notes / created_at |
| invite.messages[].from / text / at | chat_messages.sender / body / created_at (+ invite_id, organization_id) |
| activity.organizationId / type / text / at | activity_log.organization_id / type / text / created_at |

---

## 5. Incremental rollout (site never breaks)

Ship in small, independently-deployable steps. Each step keeps the localStorage
path as a fallback until the Supabase path is proven.

1. **Provision (no app change).** Run `schema.sql` in the Supabase SQL editor.
   Verify tables + RLS with a couple of test rows. No effect on the live site.
2. **Add config + client (dormant).** Add `supabase-config.js` (from Vercel env
   vars) and the CDN client block. Nothing calls it yet. Deploy — site
   unchanged.
3. **Add the DAL (dormant).** Add `window.db` with all functions. Still unused
   by handlers. Deploy.
4. **Auth first (highest value, self-contained).** Repoint `authSubmit` /
   `logout` / session bootstrap to `db.signUp` / `db.signIn` / `db.signOut` /
   `auth.getSession`. Keep `fydell_users` writes in parallel for one release as
   a safety net, then remove. Company sign-up also calls `db.ensureOrg`.
5. **Pilots + invites.** Repoint pilot-wizard writes (`dmCreatePilot`,
   `createInviteFull`) and dashboard reads (`dmDashboard`) to `db.*`. Dual-write
   to localStorage for one release; verify the dashboard renders identical data.
6. **Attempts + events.** Repoint `dmStartAttempt`, `logSimulationEvent`,
   `dmCompleteAttempt` to `db.*`. Batch events (flush every N events or on
   phase change / submit) to avoid a write per micro-action. Keep
   `FD.run.events` in memory for the live evidence feed exactly as today.
7. **Reports + decisions + chat.** Repoint `renderReport` source data,
   `saveDecision`/`saveDecisionNote`, and `postMsg`/`renderChat` to `db.*`.
   Optionally add a Realtime subscription on `chat_messages` for the invite
   thread.
8. **Remove fallbacks + retire `:8787` server.** Once each surface is verified,
   drop the parallel localStorage writes and the `syncSignup`/admin fetches;
   replace the admin portal with an admin-gated Edge Function over `profiles`.

Rollback at any step = revert that step's handler repoint; the localStorage
path is still present until step 8.

### 5.4 Notes / gotchas

- **UPDATE needs SELECT (RLS).** Candidates updating their own invite/attempt
  requires both a SELECT and an UPDATE policy — both are provided in
  `schema.sql`. Without SELECT, updates silently affect 0 rows.
- **Event volume.** `logSimulationEvent` can fire dozens of times per attempt.
  Batch inserts (array insert) and keep the in-memory feed for UI so the
  simulation never blocks on the network.
- **Report trust.** The current app lets the candidate's browser compute and
  store `fit`/`overall`. `schema.sql` allows this (candidate INSERT on
  `evidence_reports`) for faithfulness, but the recommended hardening is to move
  scoring/report generation into an Edge Function (service role) and remove the
  candidate INSERT policy.

---

## 6. Config / secrets checklist

- [ ] `FYDELL_SUPABASE_URL` and `FYDELL_SUPABASE_ANON_KEY` set as Vercel env vars.
- [ ] `supabase-config.js` generated from those at build; committed file contains
      no real secrets (or is git-ignored and produced by the build step).
- [ ] `service_role` key stored only in server/Edge Function env — never in
      `index.html`, `supabase-config.js`, or any browser-reachable file.
- [ ] RLS confirmed enabled on all 10 tables (it is, in `schema.sql`).
- [ ] Auth email confirmation setting chosen in the Supabase dashboard (the app
      currently logs users in immediately on sign-up; disable email confirm for
      parity, or add a "check your email" state).
