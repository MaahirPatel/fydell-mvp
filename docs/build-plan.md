# Fydell build plan and progress ledger

Status: planning complete; Phase 1 next. No product code has been changed by this plan.
Supersedes the `docs/pilot-progress.md` name used in `docs/fydell-pilot-build.md`; the "pilot" framing is retired from the product.
Inputs: `docs/fydell-pilot-build.md` (seven-stage brief), the product vision of 26 Sep 2026 (Engineering Passport, developer-first, full employer experience), and a read-only inspection of this repository.

---

## 1. Product in one line

Fydell is the Proof of Work Network for software talent. Developers turn existing GitHub work into a candidate-owned **Engineering Passport**; employers combine that evidence with realistic programming simulations to make better-supported hiring decisions.

Chain: GitHub work → source-linked project evidence → Engineering Passport → relevant simulation → observed results and evidence report → employer decision → shareable evidence back in the passport.

Market this release: backend, frontend, full-stack, and AI/ML engineers (applied AI development, ML engineering, and research-oriented work kept distinct). One validated Python/FastAPI backend simulation. Nontechnical roles are out of scope.

Build order: **developer side first**, then employer side.

---

## 2. What the repository already has

### Reusable as-is
| Capability | Where |
|---|---|
| Supabase email/password auth, signup and role APIs, validated `next` redirects | `src/app/api/auth/*`, `src/lib/auth/safe-next.ts`, `src/lib/auth/resolve-post-login.ts` |
| Organizations with server-derived membership (client org ids are not trusted) | `organizations`, `organization_members` (007, 009, 023); `requireOrgMember` in `src/lib/simulations/auth.ts` |
| Hashed, expiring, revocable invitation tokens with resend | `sim_invitations` + `src/lib/simulations/db.ts`; landing `/invite/[token]` |
| Transactional email with delivery webhooks | `src/lib/email.ts`, `src/lib/ops/email-outbox.ts`, `src/app/api/webhooks/resend` |
| Field-scoped, revocable, access-logged share links | `sim_receipt_shares` + `sim_receipt_share_access` (021); `/record/[token]`; `src/app/api/sim/results/[sessionId]/share` |
| Human review states and employer decisions (Advance / Hold / Decline) | `proof_claim_reviews` (025), `EmployerReviewActions.tsx`, `sim_employer_decisions` |
| Durable job table and outbox | `durable_jobs` (014), `src/lib/ops/process-outbox.ts` |
| Sandbox isolation pattern (kill switch, dev-project-only credentials, fail closed) | `src/lib/sim-engine/proof/sandbox/kill-switch.ts`, `credentials.ts` |
| UI primitives on tokens | `src/components/ui/{Table,Panel,Tabs,Dialog,PageHeader,EmptyState,Field,Skeleton}.tsx` |
| Employer shell and rail | `EmployerShell.tsx`, `src/lib/workspace/navigation.ts` |
| Geist Sans + Geist Mono, bundled locally | `src/app/layout.tsx` |

### Reusable with changes
| Capability | Change needed |
|---|---|
| `profiles.account_type` (single value: `employer`, `fde`, `partner`, ...) | One person cannot hold developer and employer contexts. Derive contexts from facts (passport exists, org membership exists) and add a context switcher. `fde` stays as the stored value for existing rows. |
| Proof invitations (`proof_invitations`) | Tokens stored in plaintext; move to the hashed pattern already used by `sim_invitations`. |
| Invite email | Hardcodes "Data Analyst work simulation". Make the subject/body come from the evaluation's own title, so existing Data Analyst invitations stay accurate. |
| Evidence engine (`services/evidence-engine`, FastAPI) | Deterministic rules for SE/Applied AI fixtures only. Can host repository analysis rules or remain for the proof graph; no deploy manifest exists. |
| `StatusTag`, `Button` accent variant | Hardcoded dark-theme hex values; move to tokens. |
| Design tokens (`src/app/globals.css`) | Final light `:root` block is warm ivory with sage/apricot ambient washes; replace with a neutral light system (see section 4). Dead dark `:root` block and stale comments can go once nothing references them. |
| `stripe` package, `subscriptions` table (001) | Installed and present but unused; `BACKEND_MVP.md` references deleted Stripe routes. |
| Visual QA scripts | `capture-*.ts` force `colorScheme: "dark"`; `scan-retired-terms.ts` does not scan for SE / Northline / placement-fee terms; `test-homepage-positioning.ts` locks in the old Solutions Engineer homepage. |

### Missing entirely
- GitHub API client, public repository import, commit-pinned snapshots, bounded file retrieval.
- Evidence extraction with validated source citations; role-family catalog and suggestions.
- Engineering Passport as a durable object, with preview, sharing, revocation, and export.
- Any execution of candidate code. The "code run" in sim-engine is a pattern-matching mock (`technicalRuntime.ts`); `RELAY_EXECUTION=pyodide` has no implementation; Monaco is installed but never imported.
- A Python/FastAPI simulation (catalog has SE, Data Analyst, Implementation, Support, BSA, Applied AI).
- Stripe Checkout, webhooks, entitlements.
- A public demo that works without the dev-project sandbox (current `/sandbox` requires `FYDELL_SANDBOX_ENABLED` and dev Supabase credentials).

### Must not be touched (production and historical)
From `.cursor/rules/simulation-engine.mdc` and `docs/rebuild/PROTECTED_PRODUCTION_PATHS.md`: `WorkbenchRunner`, v2 scoring, `sim_session_events` write paths, live reports, `/sim/[sessionId]`, migrations 001–025. Existing Data Analyst (Northline DA-01) customers, evaluations, `RoleKey` values, and `pilot_requests` records keep their names.

---

## 3. Stale positioning to replace (active presentation only)

| Surface | Current | Action |
|---|---|---|
| `/` (`SolutionsEngineerHome.tsx`), root metadata | Solutions Engineer, "worth interviewing", rollout / SSO / sponsor / oral defense scenes | New homepage (Phase 1) |
| `SiteNav`, `SiteFooter` | "Run a pilot", SE footer blurb | New IA (Phase 1) |
| `/how-it-works`, `/product`, `/contact` | SE flow, Northline fixtures, "Request a pilot" | Rewrite (Phase 1) |
| `/request-pilot` | "Run your first pilot", Northline artefacts | Becomes the employer sales contact; `/request-pilot` redirects |
| `/simulations` | Public Data Analyst evaluation page | Becomes the simulation catalog with honest availability |
| `/pricing` | Verify $250, Search 15%, Partner $2,500 | Plans page with Contact sales (Phase 9) |
| `/trust` | Northline demos; "including by us" immutability claim; unverified "encryption at rest" | Correct claims (Phase 1); full review in Phase 10 |
| `/signup` aside | Data Analyst `quality_events.csv` preview | Developer / employer branch (Phase 2) |
| `EmployerShell` | "Pilot · Live" badge | Remove (Phase 5) |
| `src/lib/ops/email-outbox.ts` | Pilot subjects, "finance teams", Project Meridian | Rewrite templates (Phase 6) |
| `/account/setup-required`, `api/platform/signup` | "Request a pilot" | "Contact sales" (Phase 2) |
| Sandbox fixtures (`sample-artifacts.ts`, Acme fixtures) | SE / Acme; Applied AI episode is current | Replaced by the new public demo (Phase 1b); sandbox code kept |
| Unused `AppliedAiHome.tsx`, `NarrativeScenes.tsx`, `HeroShortlistScene.tsx` | Unmounted or SE-only scenes | Delete once the new homepage ships |

---

## 4. Design direction, from the references

References inspected in the browser on 26 Sep 2026: figma.com (rendered this time), stripe.com, docs.stripe.com/dashboard/basics, linear.app (live, plus the captures in `assets/linear_refs/homepage_2026/`), meta.com. What each one contributes, translated for Fydell:

| Reference | Observed | Fydell translation |
|---|---|---|
| **Figma** (primary for marketing) | Near-black type on white; a short statement heading followed by a muted continuation sentence; the real product file placed on one flat pale tinted field (lime) with collaborator cursors; two captions under the canvas, each a small glyph + title + one line + underlined "Explore →" link | Homepage chapters are the **artifact itself** (a source file, a passport, a report) on one flat tinted field (pale teal for developer chapters, pale violet for employer chapters, taken from the mark). Headings use the statement + muted continuation form. No gradients, no ambient washes. |
| **Stripe** (primary for the app) | Left-aligned hero with the same two-tone sentence; faint vertical column rules; product fragments in framed cards. Dashboard docs: primary navigation by business object (Home, Balances, Transactions, Customers, Product catalog), filterable and exportable lists, a record opens from its name into a detail page, Shortcuts for pinned and recent pages, global search, `?` for keyboard shortcuts | Employer nav by object: **Home, Roles, Candidates, Simulations, Reports**; Settings and Billing secondary. Every list has filters, a count, and row actions; the candidate name opens the candidate detail with its evidence, runs, report, and decision. Recent items and search in the top bar. |
| **Linear** | Headline and one-line subhead, then the actual application window immediately below; chapter visuals are full-width code diffs with file path header and line numbers; fine borders, compact chrome | The homepage product stage sits directly under the hero and shows real code. The simulation and report views use a split diff with file path, line numbers, and added/removed tint. Compact 13px chrome inside product frames. |
| **Meta** | One product, one pill action per section; a four-tile category row, each tile with one clear action | Exactly one primary action per section. A four-tile role-family row (Backend, Frontend, Full-stack, AI/ML), each showing what evidence is analyzed and whether a validated simulation exists. |

Tokens (replaces the ivory system; keeps token names so the app moves with it):
- Surfaces: neutral light canvas, white raised surfaces, one dark editor surface for code.
- Accents from the mark: teal (developer / observed evidence) and violet (employer / model interpretation), each with a pale tint for chapter fields. Coral from the mark only for counterevidence.
- Type: Geist Sans and Geist Mono (already bundled). Hero 52–68px desktop, 36–44px mobile; marketing body 17–19px; app body 14px; meta 12–13px.
- Spacing on 4/8: 4, 8, 12, 16, 24, 32, 48, 64. Section rhythm 64–88px desktop, 40–56px mobile. Content max width 1200–1280px, gutters 20–48px.
- 1px hairlines, 6–10px radii, shadow only for real elevation, motion 120–200ms with reduced-motion support. Remove `AmbientBackground` washes and the GSAP scroll scrubbing.

Public information architecture (26 Sep maturity requirements override earlier pilot CTAs):
- Nav: **For developers · For employers · Product · Pricing · Sign in · Get started**. Contact sales appears only where a customer needs help or a tailored agreement. "Pilot" and "prototype" never label the product; customer-specific pilot terms live in proposals and agreements.
- Homepage actions: **Get started** (primary) and **Explore the demo** (secondary). Developer section: **Create your passport**. Employer section: **Start hiring**. A working self-service path is never replaced by a contact form.
- Example data always carries a visible "Example data" label. No invented customers, testimonials, certifications, coverage, integrations, or performance claims.
- Homepage: hero → interactive product stage (Project evidence / Coding simulation / Employer report) → Engineering Passport chapter → employer review chapter → role-family row → trust and access → footer.
- Hero: eyebrow "The Proof of Work Network"; headline "See what software engineers can actually build."; supporting line on GitHub evidence plus programming simulations. Actions: **Get started** (primary) and **Explore the demo** (secondary).

---

## 4b. Cross-cutting product requirements (26 Sep)

Priority order: product identity → visual coherence → complete primary workflows → trustworthy evidence → persistence and recovery → access control → commercial clarity.

Quality bar, checked in every phase: every visible control performs its stated action or says why it is unavailable. No dead buttons, placeholder success messages, fabricated analysis, indefinite spinners, inconsistent terminology, or unrecoverable errors.

| Area | Requirement | Observable acceptance | Phase | Dependency |
|---|---|---|---|---|
| Account | Developer and employer signup paths | Choosing "I'm a developer" never creates a workspace; "I'm hiring" always reaches workspace creation | 2 | — |
| Account | Email verification and resend | Unverified account is held on a "check your email" screen with a working, rate-limited resend; verified link signs in and continues to the intended destination | 2 | Resend sender configured in Supabase Auth SMTP |
| Account | Sign in, sign out | Sign out clears the session on every tab; signed-out visit to `/app/*` returns to login with `next` preserved | 2 | — |
| Account | Password reset and recovery | Reset email → new password → signed in; expired link shows a specific error with a resend action | 2 | Same SMTP |
| Account | Validation, loading, duplicate prevention | Field-level errors; submit button disabled with visible progress while pending; double click creates one account | 2 | — |
| Account | Session persistence and expiry | Refresh keeps the session; an expired session on a form preserves input and asks to sign in again | 2 | — |
| Account | Invitation and destination preservation | Invitation link → signup or login → lands on the invitation, not a dashboard | 2 | — |
| Account | Settings and profile editing | Name, email change with re-verification, password change, sign out of all sessions | 2 | — |
| Account | Workspace membership and permissions | Member roles enforced in route handlers and RLS; non-admin cannot invite teammates or change billing | 5 | — |
| Account | Dual context | One account switches between passport and workspace without signing out; each context shows only its data | 2 | — |
| Account | Accessible, responsive forms | Labels, error association, focus order, and 390px layouts pass `test:a11y` and manual keyboard check | 2 | — |
| Developer activation | Choose repositories → import → preview passport → role suggestions → sharing | Each step reachable from the previous one; never lands in an employer dashboard | 3–4 | `GITHUB_TOKEN`, Vercel paid plan |
| Developer activation | Failed import | Shows the specific cause (not found, fork, empty, too large, rate limited, partial) and a retry or edit action | 3 | — |
| Developer activation | Completed import persists | Evidence visible after refresh and after signing out and in | 3 | — |
| Employer activation | Workspace → role → preview → invitation → tracking → evidence | Dismissible checklist; completed steps tick from real data; after first invitation the overview shows real candidates and attention items | 5–8 | Sandbox provider for real runs |
| Employer activation | No fictional data in live workspaces | Empty workspace shows empty states with next actions, never sample metrics or profiles | 5 | — |
| Commercial | Pricing clarity | Pricing states what the employer receives, the billing unit, included usage, and material limits; Contact sales for tailored agreements | 1 (copy), 9 | Founder-approved plan contents |
| Commercial | Checkout and billing | Where configured: hosted checkout, confirmation, billing status, invoices; access granted only after verified webhook | 9 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, approved prices |
| Commercial | Existing agreements preserved | Existing customer records and billing references unchanged | all | — |

## 5. Phases

Each phase ends with its exit checks passing and this ledger updated. One phase per working session.

### Phase 0 — Decisions and guardrails (done 26 Sep)
- Decisions recorded in section 7.
- `.cursor/rules/simulation-engine.mdc` amended: additive migrations from 026 are allowed; 001–025 and Wave 1 paths stay frozen.

### Phase 1 — Design foundation, homepage, public copy
- Replace tokens in `globals.css`; delete `AmbientBackground` washes; strip GSAP scrub from the homepage.
- New `SiteNav` / `SiteFooter`; new homepage composed from the section 4 structure, with an interactive, keyboard-accessible product stage driven by an explicitly labelled fixture (`src/lib/marketing/demo-fixture.ts`: fictional Candidate 01, a synthetic repository, one Python task, one versioned example report).
- Rewrite `/how-it-works`, `/product`, `/contact` (sales contact replaces `/request-pilot`, which redirects), `/simulations` (catalog with honest availability). Correct the trust-page immutability claim; mark encryption-at-rest as needing verification.
- Update root and page metadata.
- Rewrite `PRODUCT.md` (still describes the Solutions Engineer proof graph) and `DESIGN.md` (still describes the ivory "evidence instrument" world) to match this plan, so future design work starts from the new direction.
- Rewrite `scripts/test-homepage-positioning.ts` for the new contract; extend `scripts/scan-retired-terms.ts` with SE / Northline / placement-fee / "Run a pilot" terms scoped to active marketing paths; switch capture scripts to the light theme.
- Exit: `typecheck`, `lint`, `test:homepage`, `test:copy`, `build:next` pass; screenshots at 1440×900, 1280×800, 390×844 with the product stage top visible at 1440×900; every nav and CTA link resolves.

### Phase 1b — Public demo (no signup, no database)
- Four steps: inspect project evidence → preview task → explore workspace → review example report. Inline step indicator, skip, back, reset, "open report now". Persistent "Demo · example data" label.
- Static fixture only; no Run button unless a rate-limited isolated runner exists (Phase 7). Recorded output is labelled as recorded.
- `/sandbox` stays available to staff but is no longer the public entry.
- Exit: all four steps keyboard-operable; no network writes (verified in the browser network panel).

### Phase 2 — Identity and onboarding for both sides
Depends on: Phase 1 (public entry points).
- Signup choice: **I'm a developer** (account, no workspace, lands on passport setup) / **I'm hiring** (account → workspace → first role).
- Real email verification. Today `src/app/api/auth/signup/route.ts` (line 93) force-confirms every address with the service role. Replace with Supabase confirmation through the configured Resend sender; keep invited candidates able to finish without a dead end.
- Contexts derived from facts: developer context if a passport exists, employer context for each active org membership. Context switcher in both shells. Update `resolve-post-login.ts` and the employer layout's `fde` redirect. `account_type` remains for existing rows.
- Invited candidates keep the invitation destination and are never forced to import GitHub first.
- "Request a pilot" on `/account/setup-required` and in `api/platform/signup` becomes "Contact sales".
- Acceptance: new developer signs up without a workspace; new employer is taken to workspace creation; unverified email cannot reach the app; password recovery works end to end; one account can switch between developer and employer contexts; invited candidate returns to the invitation after sign-in. `test:identity`, `test:auth`, `test:auth-flows` updated and passing.

### Phase 3 — GitHub extractor (working prototype)
Depends on: Phase 2 (developer account), `GITHUB_TOKEN`, Vercel paid plan for frequent job processing (D3).
- Additive migration: `github_repositories` (id, owner, name, default branch), `repo_snapshots` (repository id + commit SHA, unique), `passport_import_jobs` (state: queued → fetching → extracting → reviewing → complete / partial / failed, attempts, error, phase timestamps), `passport_projects` (passport, snapshot, candidate contribution statement, attribution status), `passport_evidence_items` (stable id, source type, snapshot, path, line range, finding, basis, attribution status, source URL, analysis version, limitations, created at), `passport_coverage` (files analyzed / skipped with reasons). RLS: owner read; service-role write.
- Jobs run through the existing `durable_jobs` table (014) and a Vercel cron worker, with bounded retries, timeouts, and cancellation.
- Server module `src/lib/passport/github/`: validate owner/repo/ref; GitHub REST only (`repos`, `git/trees?recursive=1`, `contents` / blobs); no arbitrary hosts; honour rate-limit headers; token server-side only.
- Bounds (configurable): 3 repositories per import, 80 files per repository, 128 KiB per file, 2 MiB per repository. Skip binaries, vendored and generated files, secrets-like files, submodules, symlinks.
- Evidence classes kept separate end to end: repository observation, attributable contribution, candidate statement, model interpretation, observed simulation result.
- Extraction: deterministic detectors first (API routes with request validation, test suites and what they exercise, dependency manifests, CI config, typed models, migrations, ML training code vs LLM API calls). Optional model interpretation with a strict zod schema that may only cite retrieved paths and line ranges; every citation re-validated against the stored snapshot before publishing; model failure keeps deterministic findings and marks interpretation unavailable.
- Repository text is data. Prompts isolate it; README instructions are never followed; no code is executed and no dependencies are installed.
- Forks, empty repositories, oversized trees, partial responses, 404, and rate limits each produce a specific, visible state. Re-importing the same commit does not duplicate evidence.
- Acceptance: unit tests for each failure mode, a fabricated model citation (rejected), and a hostile README (ignored); one real public repository imported on staging with persisted, source-linked findings and honest coverage; progress shows real phases, not percentages.

### Phase 4 — Engineering Passport, role suggestions, sharing, export
Depends on: Phase 3.
- Developer navigation: **Passport · Projects · Simulations · Sharing · Settings**.
- Passport sections: introduction, selected projects with contribution statements and attribution status, evidence grouped by project, role families supported, simulation results, limitations and unassessed areas.
- Versioned role catalog (`src/lib/passport/roles/catalog.ts`): backend, frontend, full-stack, applied AI development, ML engineering, research-oriented ML. Each requirement lists which evidence types can support it. Suggestions show requirement, supporting evidence ids, attribution limits, gaps, and an available simulation only if one exists. No percentages, scores, personality, culture fit, or seniority. An LLM API integration alone never supports ML engineering.
- Sharing: private by default; preview exactly what a viewer sees; opaque scoped tokens (reuse the `sim_receipt_shares` pattern in a `passport_shares` table, optionally addressed to one employer workspace); revocation checked on every access; access log. Portable JSON export of candidate-visible fields with schema version and provenance.
- Copy states that the passport records evidence and is not a certification or guarantee.
- Acceptance: unauthorized read, revoked link, and field allowlist tests; share preview renders exactly the allowed fields of the public view; export validates against its schema.

### Employer stages (Phases 5–9)

Where the employer requirements stand today:

| # | Requirement | Today | Evidence | Stage |
|---|---|---|---|---|
| 1 | Sign up, verify email, sign in, recover, create workspace | Partial: all present except verification, which is bypassed | `api/auth/signup/route.ts:93`, `/forgot-password`, `/reset-password`, `/onboarding/employer` | 2 |
| 2 | Create a software role (title, description, skills, assessment requirements) | Missing: roles are a fixed platform catalog | `app/employer/roles/page.tsx` reads `getEmployerCatalog()`; `hiring_roles` (010) exists but is unused here | 5 |
| 3 | Preview a validated simulation (instructions, duration, AI-use policy, criteria) | Missing for software; catalog simulations are Data Analyst, SE, support, etc. | `scenarios/catalog.ts` | 5 (preview), 7 (validation) |
| 4 | Secure invitation per role and assessment version, expiry, revocation, email with accurate status | Implemented for Wave 1: hashed token, expiry, revoke, resend, `email_delivery` queued / sent / failed / not_configured, Resend webhook. Email body hardcodes Data Analyst | `sim_invitations` (019), `api/sim/invitations/route.ts` | 6 |
| 5 | Track invited → started → submitted → processing → review required → report ready; separate processing failures | Partial: invitation, session, and analysis-run statuses exist; no review-required state; failures not separated from performance | `sim_sessions.status`, `sim_analysis_runs.status` (019) | 6 |
| 6 | Review the candidate's shared Engineering Passport | Missing | — | 8 |
| 7 | Assessment report: findings, code and changes, test results, explanation and patch review, evidence links, activity | Partial: Data Analyst report only; no code or test views | `EvidenceReportV2.tsx` | 8 |
| 8 | Human decision with reviewer, time, private notes; no automatic messages | Implemented for Wave 1; notes and reviewer fields to verify | `sim_employer_decisions`, `EmployerReviewActions.tsx` | 8 |
| 9 | Checkout, billing status, included usage, receipts / invoices | Missing: `stripe` installed, unused | `package.json`, `subscriptions` (001) | 9 |
| 10 | Workspace settings and access; isolation in APIs, policies, storage, exports | Partial: settings page, org RLS, server-derived org id; first membership wins (no multi-workspace); storage and export isolation unverified | `requireOrgMember`, 023 | 5, 10 |

Data model choice: reuse the Wave 1 hiring objects (`sim_templates`, `sim_template_versions`, `sim_invitations`, `sim_sessions`, `sim_employer_decisions`, `sim_receipt_shares`) rather than build a parallel system, and add new tables only for what they lack: code snapshots, runs, submissions, report review. The coding workspace gets its own route (`/assess/[sessionId]`) and its own event table, so `/sim/[sessionId]`, `WorkbenchRunner`, and `sim_session_events` stay untouched. Confirm against `docs/rebuild/PROTECTED_PRODUCTION_PATHS.md` before Phase 6 writes to `sim_sessions`.

### Phase 5 — Employer workspace, roles, assessment preview
Depends on: Phase 2. Covers requirements 1 (workspace), 2, 3 (preview), 10 (settings).
- Employer shell: **Overview · Roles · Candidates · Simulations**, with Billing and Settings secondary. Existing Evidence, Work Receipts, Outcomes, and Assessments URLs redirect into candidate detail. Remove "Pilot · Live".
- Overview for a new workspace: compact checklist (Create workspace → Create role → Preview simulation → Invite candidate). After the first invitation it becomes work requiring attention, recent reports, and active roles. No empty KPI cards. The demo stays in a separate, labelled entry.
- Custom roles on `hiring_roles`: title, description, skills, assessment requirements, role family from the software catalog. The assessment picker lists only validated simulations; other families show "project evidence only".
- Simulation preview: instructions, provisional duration, AI-use policy, evaluation criteria, version. No hidden tests or reference solutions reach the browser.
- Settings: workspace name, members and roles, invitations of teammates. Multi-workspace membership with an explicit switcher replaces first-membership-wins.
- Acceptance: cross-organization read and write tests on roles and settings; a fresh workspace reaches "preview simulation" without support; screenshots at 1440×900 and 390×844.

### Phase 6 — Invitations and candidate tracking
Depends on: Phase 5. Covers requirements 4, 5.
- Invitation pinned to role + assessment version; reuse the `sim_invitations` token model. Hash `proof_invitations` tokens as well.
- Copyable link always; email when configured, showing queued / accepted by provider / failed, never "delivered" without a delivery event. Templates rewritten from the evaluation's own title (existing Data Analyst invitations stay accurate).
- Candidates table: invited, started, submitted, processing, review required, report ready, plus processing failed as a distinct operational state with retry. Filters, counts, row actions.
- Acceptance: expiry, revocation, resend-invalidates-old-link, and redemption tests; processing failure never appears as a candidate result.

### Phase 7 — Python/FastAPI simulation and isolated runner
Depends on: Phase 6, a managed sandbox provider account (D2). Covers requirement 3 (validation).
- Scenario: a background-job service produces duplicate effects on retry. Candidate bundle (small multi-file repo, incident brief, logs, public tests, an AI-generated proposed patch that may be wrong, explanation field); evaluator-only hidden checks and reference solutions in a separate package never shipped to the browser. In-scope retry and concurrency cases stated explicitly; no distributed exactly-once claims.
- Validate: faulty baseline fails, reference passes, at least two plausible incomplete fixes fail for the right reason, one alternative valid fix passes.
- Runner adapter over a managed sandbox provider (compare E2B, Modal, and Daytona against the isolation checklist before choosing): per-run sandbox, no secrets, no host mounts, CPU / memory / process / wall-time / output limits, network off, pinned prebuilt image. Results come from a trusted harness, not candidate stdout. Each run bound to snapshot hash + assessment version + evaluator version. Assertion failure, syntax error, resource limit, and infrastructure failure are distinct. Without provider credentials the UI says execution is not configured and no run is faked.
- Workspace at `/assess/[sessionId]`: Monaco editor (installed), file tree, instructions, test output, diff, AI-patch review, explanation; revision-aware autosave; atomic, idempotent final submission with a receipt.
- Acceptance: the validation matrix runs in CI against the provider; refresh recovery, repeated submit, long-running code, oversized output, tampered results, and runner-failure tests.

### Phase 8 — Report, passport review, human decision, portable results
Depends on: Phases 4 and 7. Covers requirements 6, 7, 8.
- Candidate detail (inside Candidates): Summary · Code changes · Tests · Explanation · Activity · Project evidence. Summary first: candidate, role, assessment version, review state, observed strengths, concerns, limitations. Findings open their code or test in context; deterministic results and model interpretations are visibly different.
- Project evidence tab shows only what the developer shared with this workspace.
- Review queue: pending → checked → published with reviewer identity. Decision (Advance to interview / Hold / Decline) with reviewer, time, optional private notes; no messages or scheduling.
- Candidate-visible result added to the passport through an explicit allowlist; employer notes, decisions, hidden tests, and task materials never included.
- Acceptance: unpublished-report visibility, cross-organization reads, nested-export leakage, revoked-share, and repeated-decision tests.

### Phase 9 — Plans, billing, entitlements
Depends on: Phase 5; approved plan contents (D1). Covers requirement 9.
- Pricing page shows plan names and inclusions with Contact sales; no published prices until approved.
- Stripe Checkout (hosted) created server-side with server-controlled prices; verified webhooks with event deduplication and idempotent fulfilment; access granted only from a confirmed webhook; billing page with status, included usage, and invoices through Stripe's hosted invoice and portal pages. Test mode only during verification. Developer accounts never trigger billing.
- Acceptance: test-mode success, failure, cancellation, refund, and duplicate / out-of-order webhook tests; no entitlement from the success redirect alone.

### Phase 10 — Release verification
- Full workflow on staging with two employers and one developer, using the release gates from `docs/fydell-pilot-build.md` Prompt 7 (with "pilot" wording removed), plus storage and export isolation checks for requirement 10 and a full trust-page claim review.

---

## 6. Critical path

1. Phase 1 (public story coherent) and Phase 2 (both sides can sign up correctly).
2. Phase 3 needs `GITHUB_TOKEN` and the Vercel plan upgrade.
3. Phase 7 needs a managed sandbox provider account; it gates the first real assessment, the report, and meaningful billing.
4. Phase 9 needs approved plan contents.

## 7. Decisions

| Id | Decision | Outcome (26 Sep) | Follow-up owner |
|---|---|---|---|
| D1 | Public pricing | Plan names and inclusions with Contact sales; no published prices yet | Founder: approve plan contents before Phase 9 |
| D2 | Execution provider | Managed sandbox service | Engineering: compare providers at Phase 7; founder: create account |
| D3 | Where import jobs run | Vercel functions + `durable_jobs`, on a paid Vercel plan | Founder: upgrade plan before Phase 3 |
| D4 | New migrations | Additive migrations from 026 allowed; rule updated | Done |
| D5 | Employer scope | Full requirements supplied; mapped above | Done |

External dependencies (names only): `GITHUB_TOKEN`, sandbox provider API key, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, working `RESEND_API_KEY` sender for verification email.

## 8. Progress ledger

| Date | Phase | Change | Verification |
|---|---|---|---|
| 2026-09-26 | 0 | Copied brief to `docs/fydell-pilot-build.md`; wrote this plan; amended `.cursor/rules/simulation-engine.mdc` for additive migrations. Restarted the local dev server (it had stopped; not an application fault). | Read-only repository inspection; Figma, Stripe (homepage and dashboard docs), Linear, and Meta reviewed in the browser. No product code changed. |
| 2026-09-26 | 1 (partial) | Tokens: neutral light surfaces, brand teal / blue / violet / coral with field tints and AA ink shades, passport cover, dark code surface, light-theme scrollbar and selection (`src/app/globals.css`). Ambient washes removed (`AmbientBackground.tsx`). Nav: For developers · For employers · Product · Pricing · Sign in · Get started (`SiteNav.tsx`); footer rewritten (`SiteFooter.tsx`). New homepage (`ProofOfWorkHome.tsx`, `ProductStage.tsx`, `CodeBlock.tsx`) on a labelled fixture (`src/lib/marketing/demo-fixture.ts`); GSAP scroll scrub no longer mounted (`src/app/page.tsx`). Pricing rewritten: Developer free, Team and Enterprise via plan agreement, billing unit = completed simulation, no invented prices (`src/app/pricing/page.tsx`). Root metadata (`src/app/layout.tsx`). Trust immutability claim corrected (`src/app/trust/page.tsx`). Contract test rewritten (`scripts/test-homepage-positioning.ts`). | `npm run test:homepage`: 13/13 pass. `tsc --noEmit`: pass. `eslint` on changed files: pass. `npm run test:copy`: fails with 47 pre-existing violations, none in new copy (sandbox, unmounted `SolutionsEngineerHome` / `AppliedAiHome` / `NarrativeScenes`, sim-engine fixtures, an existing `globals.css` comment, trust-page timestamps). Browser, 1440×900: product stage top visible above the fold; all three tabs switch content and field colour; report evidence expands on demand. 390×844: no page-wide overflow (scrollWidth 390); tabs single-line (36px); code scrolls inside its panel. `next build` not run this session. |

| 2026-09-26 | Original design pass (Stages A–C, marketing and auth entry) | Supersedes reference-copying directions. Brand: square Fydell tab icon `src/app/icon.svg` (the old wide PNG favicon made the two-ring mark read like another company's logo at 16px; no third-party asset existed in the repo); Open Graph metadata. Hero: exact lines "A new way to hire." / "A better way to get hired.", 44/56 split, interactive passport where selecting a finding swaps the attached source excerpt (`HeroPassport.tsx`). Homepage rebuilt with distinct compositions: workflow band, developer section with owner vs employer sharing preview (`SharingPreview.tsx`), dark simulation workspace, employer queue + evidence report with local-only decision controls (`EmployerReview.tsx`), two-path close. Internal-rule sections removed. `/get-started` developer / employer choice; `/signup?as=developer` creates no workspace (existing `fde` path), `/signup?as=employer` shows company field (existing employer path). Public `/demo`: four steps with back, next, skip to report, reset (`ProductStage.tsx`). Pricing: Team "Quoted per workspace", no mixed annual wording. Tokens: hero panel, warm accent, opaque nav scrim. | `test:homepage` 16/16, `tsc`, `eslint` (changed files), `test:auth` pass. Browser at 1440×900, 1280×800, 390×844: no page overflow or clipped content on `/`, `/get-started`, `/demo`, `/pricing`, `/signup?as=developer`, `/signup?as=employer` (iframe scan). Verified by script: hero finding selection, sharing view toggle (5 vs 3 rows), decision message, demo next / skip / reset, nav anchors land 80px from top, single hash, browser back. `next build` not run. |

| 2026-09-26 | Design system v3 + Phase 3 start | **Frontend:** official lockup extracted from `fydell-logo-full.png` (`scripts/generate-brand-logo.mjs` → `public/brand/fydell-lockup*.png`, `FydellLogo.tsx`) and used in site nav, footer, auth, employer shell; tab icons generated from the official mark (`scripts/generate-brand-icons.mjs` → `src/app/favicon.ico`, `icon.png`, `apple-icon.png`). Warm ivory + sage wash theme; single deep-blue grid "stage" token reserved for the primary demonstration. One shared `EvidenceWorkspace` (passport and employer-review variants) used on the homepage hero, employer section, `/demo` steps 2 and 4, and signup asides. **Backend:** `src/lib/passport/github/` (input parsing, allowlisted GitHub client with rate-limit handling, bounded file selection with skip reasons, deterministic detectors, citation validation, role suggestions) and `POST /api/passport/github` (signed-in only, per-instance throttle; profile → repository list; repository or up to 3 selections → extraction). Results are returned, not yet persisted. | `test:github` 23/23 (fake GitHub: parsing, skips, caps, 404, private, fork, empty, rate limit, fabricated citations, hostile README, LLM vs ML). Live, unauthenticated: `fastapi/full-stack-fastapi-template` @ `cb740b6` → complete, 80 of 252 files, 10 findings, 0 rejected citations, backend supported / frontend + full-stack partial. `POST /api/passport/github` without session → 401. `test:homepage` 17/17, `tsc`, `eslint` pass; no overflow at 390 / 1280 on six public routes. Dev server hung once during testing and was restarted. |

| 2026-09-26 | Phases 3–4 working + employer passport review | Migration `026_engineering_passports.sql` applied to the dev project (passports, projects, evidence, hashed share links, org-scoped employer reviews; RLS owner/member reads, service-role writes). `src/lib/passport/{store,assemble,interpret,rules,view}.ts`; routes `/api/passport/{github,projects,shares,shares/[id]}`, `/api/employer/passport-reviews{,/[id]}`. Pages: `/passport/new` (anonymous builder), `/app/candidate/passport` (saved passport + sharing), `/p/[token]` (shared view), `/app/employer/passports{,/[id]}` (review queue, decision, private note); "Shared passports" in employer nav. Capability highlights use OpenAI with schema and evidence-id validation when `OPENAI_API_KEY` is set, otherwise a labelled rule-based summary. New developers land on their passport. Design: Instrument Serif display face, shadow scale, passport cover texture, scroll-driven reveals, smooth scrolling, loading skeletons, `DESIGN.md` rewritten with exact tokens. Preview-stage copy removed from public surfaces. | `scripts/e2e-passport-flow.ts` 21/21 against the dev server and dev database (sign-in required to save; save with evidence; no duplicate on re-import; share renders; field allowlist enforced; employer add, decide, note; other workspace cannot list, change, or open; notes never in shared view; revoke cuts public and employer access; revoked link cannot be re-added; accounts cleaned up). Browser: `/passport/new` built a passport from three real `tiangolo` repositories. `tsc`, `eslint`, `test:homepage`, `test:github`, `test:auth`, `test:navigation` pass. |

### Open after this session
- **Contact sales lands on stale copy.** `/contact` still describes Solutions Engineer hiring and Verify / Search / Partner. Next task.
- Still stale and linked from the site: `/how-it-works`, `/product`, `/simulations`, `/request-pilot`, `/signup` aside (Data Analyst preview), `EmployerShell` "Pilot · Live", invite and outbox email copy.
- "For developers" and "For employers" are homepage anchors; "Product" opens `/demo`.
- A developer who signs up lands on the existing candidate home (`/app/candidate`), which lists invited assessments only. The Engineering Passport, GitHub import, and developer navigation (Overview, Projects, Passport, Simulations, Sharing, Settings) do not exist yet (Phases 3–4).
- The employer workspace, candidate table, candidate detail, and simulation workspace have not been restyled in this pass; they use the shared tokens but keep their existing layouts (Phases 5–8).
- `public/reference-ui/` holds unused old mockups with invented scores and "Strong hire" labels; they are publicly reachable by URL and should be deleted once confirmed.
- Repository import and the Python simulation are not built; public copy says so ("first to launch", "not yet offered", pricing "Availability").
- Unmounted files to delete once the user confirms: `SolutionsEngineerHome.tsx`, `AppliedAiHome.tsx`, `HomeMotionController.tsx`, `NarrativeScenes.tsx`, `HeroShortlistScene.tsx`, their CSS modules.
- `PRODUCT.md` and `DESIGN.md` still describe the old product and ivory palette.
- A full scan finds stale positioning terms in about 103 files under `src/`; most are historical scenario content that must not be renamed. Active items beyond those above: the email shell footer ("real work, not interviews") and invite wording ("work trial") in `src/lib/email.ts`; the signup aside `WorkspacePreviewScene.tsx` reuses `HeroEvidenceScene`.
- Phase 2 note: the employer signup path creates the organization inside `api/auth/signup` via `completeEmployerOnboarding`, so the "I'm hiring" branch already skips `/onboarding/employer`; the developer branch must not call it.
- Phase 5 note: the employer navigation is locked by `scripts/test-workspace-navigation.ts`; update that contract together with `src/lib/workspace/navigation.ts`.

### Next task
Phase 3 persistence: migration `026_passport_github.sql` (passports, repositories, commit-pinned snapshots, import jobs, evidence items, coverage), write extraction results through the service role, and a developer "Projects" screen that calls `/api/passport/github`, shows real progress, errors with retry, and the saved findings in `EvidenceWorkspace`. Needs `GITHUB_TOKEN` for higher API limits in production. Then Phase 7 (isolated Python runner) and Phase 8 (employer report on real data).

Earlier Phase 1 remainder: rewrite `/contact` as the sales contact, redirect `/request-pilot` to it, rewrite `/how-it-works` and `/simulations`, replace the signup aside, update `PRODUCT.md` / `DESIGN.md`, extend `scan-retired-terms.ts`, then run `next build`.

