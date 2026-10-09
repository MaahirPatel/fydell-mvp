# Fydell implementation checklist

This is the one authoritative list. It replaces working from the individual
prompts (completion contract, product-wide UI contract, capabilities,
workspaces and simulations prompt). Those remain background; when they
conflict, the newer explicit decision wins:

- The demo lives only inside the employer Demo workspace, reached through the
  workspace switcher. Old public sandbox URLs redirect there.
- A repository import, fork or contribution note never becomes a personal
  capability claim on its own. Contribution evidence is a separate layer.
- No new features (Stripe, code signing, GitHub App, CLI) until P0 and P1 are
  verified.

## How an item counts as done

Every row names the route, the behaviour a user actually gets, and the
evidence. Evidence types are labelled and never mixed:

| Label | Meaning |
| --- | --- |
| unit | Pure function tests, no network |
| mock | Runs the code with a stubbed provider or database |
| live DB | Real dev Supabase (`btbmvrvynnrhapjdkunz`), real HTTP routes |
| real model | Real Groq call |
| real sandbox | Real Vercel Sandbox execution |
| browser | Clicked through in a real browser, screenshot saved |
| native | The Tauri desktop app, run as a person would |
| prod | Checked on www.fydell.com |
| user | Watched an uncoached real person complete it |

An item is not done while a step is disconnected, a report is generic, or
persistence is unverified. A green build alone proves nothing here.

Status values: **Not started**, **Built, unverified**, **Partial** (says what is
missing), **Verified** (with labels).

## P0. Engineer journey

Import work, review an accurate report, share selected evidence, employer
reviews it against a role.

| # | Step | Route | Required behaviour | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| E1 | Import public repo | `/app/candidate/work-record` | Preview scope (files, limits, exclusions), start a durable job, survive reload | Verified | live DB, browser (`.scratch/acceptance/engineer/walk/`) |
| E2 | Upload project | same | Zip or project-folder upload with limits, same pipeline | Verified: ZIP (live DB, browser). 2026-10-09: "Project folder" option packs a VS Code or Cursor folder in the browser with the server's own file selection; dependency folders and credential files never leave the machine; uploads analyze up to 300 files and 6 MB (GitHub stays at 80); a packed 402-file project is accepted and all 300 packed files are analyzed | unit (`scripts/test-folder-zip.ts` 10/10, `test-passport-upload.ts`, extract 56/56), browser (folder picker rendered, opened from Go to search) |
| E3 | Relationship and contribution | project page | Engineer states relationship (maintained, contributor, team, fork, learning, reference); statement shown separately from source evidence; "make this evidence yours" removed | Verified: all seven relationships offered; changing to contributor creates a new report version with the stated reason and keeps earlier versions; statement shown in its own panel beside source evidence | browser (`.scratch/acceptance/capabilities/showcase/flows/` 1-8), live DB |
| E4 | Accurate report | report page | Overview, capability review, evidence inspection; each capability has specific work, evidence, contribution, result, limits, follow-up | Verified: synthetic showcase engineer (seeded through the import pipeline with fixture GitHub transport, `scripts/seed-showcase-engineer.ts`) shows commit-linked capabilities, project-only findings, a reference repo, narrowed and contradicted projects, and a task demonstration; colour per evidence basis and coverage state, AA in light theme | unit, live DB (7/7), browser at 390/768/1280/1440 (`.scratch/acceptance/capabilities/showcase/`) |
| E5 | Third-party code | report page | Third-party or reference repo gives project findings only, no personal capability claim | Verified | real model (capability differential 15/15: same code gives 6 linked capabilities when attributable, 0 when third-party); browser: showcase `acme-corp/job-runner` shows project findings only |
| E6 | Report stability | report page | Same report on every read; re-analysis creates a new version with a reason | Verified | live DB (52/52) |
| E7 | Corrections | report page | Correction stored with status, never overwrites the original | Verified: context note (Open) and proposed correction (Withdrawn) stored beside the finding; finding text unchanged; corrections feed the report input hash so a new version is offered | browser (`showcase/flows/` 9), live DB |
| E8 | Curate and share | `/app/candidate/profile`, share links | Choose projects and versions, recipient preview, revoke; revoked links fail everywhere | Verified | live DB, browser |
| E9 | Employer reads shared evidence against a role | employer applicant view | Requirement-to-evidence mapping uses real requirement names; private notes never reach the engineer | Partial: mapping exists, not walked from a share end to end | |

## P0. Employer journey

Invitation, simulation, submission, analysis, employer report.

| # | Step | Route | Required behaviour | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | Role intake | `/app/employer/engineering/roles/[roleId]` | Requirements with must-have or preferred, expected evidence; versioned saves | Verified | live DB |
| R2 | Application link | role link | Interrupted signup keeps role context; one application only | Partial: publish link and collect applicants verified (opening journey 10/10); interrupted-signup case not run | full journey |
| R3 | Invitation | `/assess/invite/[token]` | Real email in production only; expired and used links handled | Verified | live DB, real Resend to `delivered@resend.dev` |
| R4 | Pre-start disclosure | assessment start | Scope, timing, permitted AI, what is recorded, who sees it | Verified | browser (a1984e9) |
| R5 | Work in the editor | workbench | Editor loads or recovers within 20s; files persist; tests run in the sandbox | Partial: editor fix in prod; persistence verified by agent E; full matrix pending agent S | browser, prod |
| R6 | Coworker chat | workbench | Grounded, no reference or hidden-test leakage, server cutoff | Partial: leakage, allowance races, cutoff and outage fallback verified; no real-model chat evidence yet (provider down during runs) | live DB, real sandbox |
| R7 | Submission | workbench | Stable client id, frozen manifest with hashes, receipt, no duplicates on retry | Verified: all five crash points and a killed worker end with exactly one submission, evaluation and report; manifest hashes pinned to the simulation version. Desktop does not send a client id yet | live DB + process kill, real sandbox |
| R8 | Analysis | worker | Durable job on the exact snapshot; infrastructure failure never shown as candidate failure | Verified (journeys 8 and 10) | live DB, real sandbox |
| R9 | Employer report | applicant review | Requirement split view, executed checks, handoff, limits, follow-ups, human decision with private notes | Verified: two-candidate journey 16/16 (correct fix passes all criteria; superficial fix fails the hidden restart test and its statements say so); collaboration behaviours linked to sources or "not assessed"; concurrent reviewer decisions give one save and one 409; private notes absent from candidate responses | full journey, live DB, real sandbox |
| R10 | Decision brief and export | applicant review | Brief with evidence links; export excludes private notes | Verified: opening to decision brief 10/10 | full journey, live DB |

## P0. Analysis proof

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| A1 | Correct, defective, limited and third-party inputs give materially different reports | Verified: fixtures (15/15) and the showcase profile, where the same pipeline gives linked, project-only, narrowed and contradicted reports side by side. Uses fixture repositories, not live GitHub | `.scratch/acceptance/capabilities/`, `.scratch/acceptance/capabilities/showcase/` |
| A2 | Work-sample differential: correct, partial, superficial, alternative, missing evidence, execution failure differ | Verified | real model (15/15) |
| A3 | Claims cite existing source lines at a pinned revision; tests that did not run never support a runtime claim | Partial | unit |
| A4 | README and repository text cannot change analyzer policy | Verified | unit (injection suite) |

## P0. Persistence and access

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| P1 | Cross-org, cross-engineer, anonymous, expired and revoked access correctly scoped | Verified | live DB (68/68 including Cache-Control on a production build) |
| P2 | Recovery: stuck jobs, worker restart, retries without duplicates | Verified | live DB (recovery 16/16, stuck work 17/17) |
| P3 | Demo workspace never touches live records, email, billing or metrics | Verified | live DB (66/66) |
| P4 | Scheduled workers in production | Built, unverified in prod | needs Vault secrets at release |

## P1. Screens

Every implemented route checked at 390, 768, 1280 and 1440 for loading,
empty, error and saved states, keyboard use and long content. Tracked
route by route in `docs/qa/route-checklist.md`; open items there are part of
this checklist.

| # | Area | Status |
| --- | --- | --- |
| S1 | Engineer workspace routes | Partial: home, projects (incl. no-match), report with source drawer, profile, share preview, settings walked signed in; overflow clean at 390 and 768; contrast AA measured. Onboarding and Passport creation not rendered |
| S2 | Employer routes | Partial: overview, role and applicant review, candidates search, assessments, reviews, team, settings, demo walked. Open: `/app/employer/assessments` titled "Evaluations" with an "Overview" breadcrumb; invitation page needs a fresh invite; attempt result text truncates criteria mid-word |
| S3 | Settings, billing, admin, auth | Partial: settings and auth at 390 and 1280 checked; admin routes unverified (no admin credentials) |
| S4 | Simulation workbench | Partial: seven templates validated in the sandbox (backend, applied AI); other tracks labelled not offered; workbench screenshots at 1280 and 1440 |
| S5 | Desktop app sign-in, sync, crash recovery | Verified (native, browser, live DB; local server, dev Supabase). Earlier: browser sign-in through `fydell://`, refresh token in Windows Credential Manager only, sign-in survives force-kill and offline, handoff answers and unsent file edits restored after a crash, duplicate delivery creates no extra version. 2026-10-09: authored submit from the desktop shows receipt `c9fd9834-6209-4287-9311-fb1c3c1ffa6c` and archive SHA-256 `483bb556…2197f` on the desktop receipt, `/assess/5b3fa4fd-…` and `/app/employer/engineering/attempts/5b3fa4fd-…`, with the same two changed files (native, browser, live DB). Standard-flow handoff answers are journaled to `app_data/eng/<id>.drafts.json` before `PUT …/drafts`; an answer typed with the server down survived a force-kill and reached `eng_drafts` at revision 1 after restart (native, live DB, unit). Website sign-out (`/api/platform/logout`, `SignOutButton`) is local-scoped: website sign-out leaves the desktop signed in and desktop sign-out leaves the website signed in; before the fix a website sign-out signed the desktop out (native, browser). Debug builds do not register `fydell://` unless `FYDELL_DEV_REGISTER_SCHEME=1`. Not verified: macOS and Linux, prod, a signed release. Every build opens www.fydell.com unless `FYDELL_PLATFORM_URL` is set |

## P2. Real users

Done by the owner, not agents. Watch without coaching and note where people
stop or distrust the result.

1. An engineer imports their own project, reads the report, corrects context, and shares it.
2. A hiring manager creates a role, invites a test candidate, and reaches a decision from the report.

Findings from these sessions become P0 rows.

## Deferred until P0 and P1 are verified

Windows code signing, GitHub App for private repositories, CLI, Stripe.
