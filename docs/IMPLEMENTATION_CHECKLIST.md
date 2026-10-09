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
| E9 | Employer reads shared evidence against a role | employer applicant view | Requirement-to-evidence mapping uses real requirement names; private notes never reach the engineer | Verified (2026-10-09): the walk engineer applies to a freshly published role with an analyzed project; a pinned share of exactly that project, a review and the pinned version are created; `/app/employer/openings/[id]/applications/[appId]` lists the role's own requirement names beside the shared findings (path and line); mappings store the stored role's requirement name for each index, cite the shared finding and its snapshot, refuse an out-of-range index and another person's finding; the team sees its reasons and private decision note, and the decision brief lists the requirement names; neither the reasons nor the note, nor any reviewer field, appears in 13 engineer-facing API and page responses; the engineer gets 403 on the employer review, mapping and decision endpoints and a redirect on the employer page; after withdrawal the employer can no longer map and the findings leave the page. No code change was needed. Not done: a browser click-through with screenshots | live DB (`scripts/test-employer-shared-evidence.ts` 28/28, run twice) |

## P0. Employer journey

Invitation, simulation, submission, analysis, employer report.

| # | Step | Route | Required behaviour | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | Role intake | `/app/employer/engineering/roles/[roleId]` | Requirements with must-have or preferred, expected evidence; versioned saves | Verified | live DB |
| R2 | Application link | role link | Interrupted signup keeps role context; one application only | Verified on DEV with email confirmation off (2026-10-09). Publish link and collect applicants verified earlier (opening journey 10/10). Signed out, Apply on `/jobs/[slug]` now goes to `/signup?next=/jobs/[slug]/apply` (was `/login`; sign-up's Log in link keeps the same `next`). After sign-up the new account lands on that role's application with the name given at sign-up prefilled (was blank, which left Send disabled with no reason; the button now says what is missing). One application only: a second POST returns 409 with the existing id, reopening the apply page goes to the receipt with "You've already applied", and signing in from the link with an account that already applied lands on that receipt; DB holds exactly one row. Remaining: the production confirm-by-email hop (`/auth/check-email?next=` then `/auth/callback?next=`) was read in code, not walked | browser (Playwright, fresh signed-out contexts: sign-up branch at 1280, sign-in branch at 390; `.scratch/acceptance/employer/r2-*.png`); live DB (one `role_applications` row for `delivered+r2-6d9f042a@resend.dev`); unit (`scripts/test-safe-next.ts` role-application `next` survives sign-up and the log-in hop) |
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
| A3 | Claims cite existing source lines at a pinned revision; tests that did not run never support a runtime claim | Verified (2026-10-09) for the import, upload and capability-review code. Fixed: redaction collapsed a multi-line private key block to one line, so every finding below it cited lines shifted from the real file (6 checks fail with the old redactor); redaction now keeps the line count. Fixed: model rewording of a test finding could say a test passes, succeeds, confirms or ensures, or that code was run; such text is now rejected and template wording kept. CI and parametrized-test titles no longer say "Runs". Proven: the GitHub import is pinned to the requested commit and never reads the branch head; every finding's path is an included manifest entry whose blob hash matches the content at that commit, its line range lies inside that file and its excerpt is exactly those lines; source links and finding ids carry the commit; uploads are pinned to a content hash of the files and change ids when a cited file changes; test findings and observations record `executed: false`, no capability carries an executed-test basis, a skipped test is narrowed, and no requirement is supported by read-only tests or CI unless an executed task demonstration exists. Still open: not run against live GitHub repositories; stored findings cannot be rechecked against source because file contents are not stored; snapshots analyzed before this fix with a key block above cited code keep their shifted line numbers until re-analyzed (analysis version not bumped) | mock (`scripts/test-passport-citations.ts`: fixture GitHub transport serving two revisions and an in-memory upload archive, 77/77); unit (redaction and model-rewording checks in the same script; existing passport suites still pass: extract 56/56, passport 55/55, injection 27/27, GitHub extractor, upload) |
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
| S1 | Engineer workspace routes | Partial, open items routed. Earlier: home, projects (incl. no-match), report with source drawer, profile, share preview, settings walked signed in; contrast AA measured. 2026-10-09 walk with a new synthetic engineer on dev Supabase (browser, live DB; screenshots in `.scratch/acceptance/engineer/screens/`): sign-up, `/onboarding/engineer` (empty, field errors, saved, ZIP upload, describe-a-project, done) at 390/768/1280/1440 with no overflow; the uploaded ZIP produced a Builder Report; home, projects, report, profile, recipient preview, practice, settings, reports, applications and receipts at all four widths with no overflow or console errors; profile X, Instagram and LinkedIn links render with brand logos; share flow (contribution, confirm, publish v1, link, `/p/<token>` at four widths, revoke shows "This link was revoked."); `/api/account/export` and `/api/passport/export` return JSON attachments; account delete needs the typed phrase (not executed). Fixed: profile and onboarding saves showed stale data until reload (refresh now runs in a transition); "Saving…" and "Uploading…" mojibake; social link rows and LinkedIn chip overflowed at 390; onboarding project tabs truncated at 390 and repeated their hint; onboarding said "Passport" and showed `upload/` prefixes; home Projects header wrapped at 390; report meta dividers dangled when wrapped; practice brief printed the task twice and the empty state had no heading. Open (outside this pass's files): GitHub field placeholder clipped at 390 (`PassportBuilder`); report breadcrumb says Passport while the top bar says Projects (`BuilderReport`); removing an uploaded project mentions GitHub (`RemoveProject`); a share link can be created with no projects (`SharePanel`); "Describe what you worked on first" stays after saving a contribution until reload (`EvidenceVersionPanel`). `/passport/new` not rendered; no screen reader run |
| S2 | Employer routes | Partial. 2026-10-09 sweep of 19 employer routes at 390, 768, 1280 and 1440 (browser): no horizontal overflow, breadcrumb, mobile title and active rail item agree on every page. Fixed: `/app/employer/assessments` is now "Simulation templates" under the Assessments breadcrumb with Assessments active in the rail (was "Evaluations" under Overview); attempt outcome quotes each acceptance criterion whole and wraps (was cut at 90 characters, "does not cr..."); `/openings/new` overflowed 46px at 390 (member select and Reviewers fieldset set the form width); Recent activity cut event text at every width; Overview attention rows hid the candidate email; mobile top bar truncated the section name; unknown `/candidates/[id]` silently redirected to Evidence and now shows the workspace not-found page, and sign-in from it keeps the return path; added Skip to content (first Tab stop, focus moves to the page). Checked: not-found for unknown role, attempt, opening, Passport and report ids; keyboard order and focus rings; mobile navigation sheet opens by keyboard, closes on Escape and returns focus. Open: invitation page needs a fresh invite; test names in the attempt's automated-evaluation list are ellipsised with a tooltip (`AuthoredEmployerReview`, work-samples runtime, routed); a 768 and 1440 pass of `/openings/[id]/edit`, `/passports/[id]/brief`, `/proof/*`, `/workbench/*`, `/compare`, `/cohort` was not run |
| S3 | Settings, billing, admin, auth | Partial: settings and auth at 390 and 1280 checked; admin routes unverified (no admin credentials). 2026-10-09: sign-up answers new and existing emails identically when confirmation is required (production); shared password policy rejects short, common and email-based passwords on sign-up, platform sign-up and reset (unit, browser); public copy uses Log in and Sign up. Later 2026-10-09 (browser, live DB on dev Supabase): `/login`, `/signup`, demo sign-up, `/forgot-password`, `/reset-password`, `/auth/check-email`, `/auth/link-invalid`, `/auth/confirmation-required` and `/signup/role` at 390/768/1280/1440 with no overflow, no "sign in" and no console errors; unknown email and wrong password give the same 401 and the same message; forgot-password gives the same 200 for both; full reset with a dev recovery link shows the rule, rejects email-based and common passwords, then lands on `/login?reset=1` and logs in. Fixed: remaining "sign in" copy on forgot-password, link-invalid, check-email, sign-up notice and employer onboarding; server "Sign in" wording rewritten on the client; login showed the raw "Invalid email or password." instead of the non-revealing message; reset page now shows the full password rule and checks against the account email; role choice shows plain errors for an ended session and network failure. Open: in development (confirmation off) sign-up still answers "already exists" for an existing email (`/api/auth/signup`, production unaffected); `/auth/update-password` not rendered; admin routes unverified |
| S6 | Navigation | Verified for keyboard at 390 and 1280 (browser); screen reader not run. Go to search (Ctrl K or top-bar button) in the engineer and employer workspaces over pages and actions, with section anchors scrolled into view. 2026-10-09: opener is reachable by Tab and named "Go to a page" at 390 ("Go to" at 1280) with `aria-keyshortcuts`; focus starts in the search field, Tab stays inside the dialog, Escape returns focus to the opener, and Ctrl K from a page link returns focus to that link; arrow keys keep the active option scrolled into view; a status region announces "16 results" or "No results"; "export" then Enter opens settings with the data section in view. All 16 engineer targets resolve and their anchors exist; employer targets have route files and redirect to log in when signed out (no 404). Fixed: focus was lost on close, Tab left the modal, the active option could sit off-screen, results were not announced, and the global focus outline doubled on the search field |
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
