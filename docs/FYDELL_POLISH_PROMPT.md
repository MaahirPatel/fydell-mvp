# Fydell — complete product and website transformation prompt

You are the senior product designer, design-systems engineer, UX writer, and full-stack product engineer responsible for turning the existing Fydell codebase into a credible customer-ready hiring platform.

Do not give me a redesign plan, a list of suggestions, a mood board, or a superficial reskin. Inspect the existing repository, understand the current routes, components, database, Supabase authentication, and working product logic, and then implement the redesign end to end. Preserve working infrastructure and user data. Replace weak UI, weak information architecture, weak copy, placeholder behavior, dead controls, and broken flows. The finished product must build and run successfully.

## Executive brief

**Goal:** Transform the existing Fydell product into a customer-ready work-based hiring platform where employers create realistic simulations for applied technical roles, candidates complete them in a credible work environment, and hiring teams review traceable evidence.

**Primary users:** Hiring managers, talent leaders, recruiters, and functional leaders evaluating one tightly defined role family: applied technical professionals who translate messy business or customer problems into technical decisions and clear action. The six MVP roles are Data Analyst, Business Intelligence Analyst, Solutions Engineer, Implementation Consultant, Technical Support Engineer, and Business Systems Analyst. Candidates are equally important users during invitation, simulation, evidence review, and work-record flows.

**Existing product context:** This is an existing application, not a greenfield concept. The expected stack is Next.js/React, TypeScript, Tailwind CSS, Supabase authentication/database, and the repository’s existing package manager and deployment conventions. Verify all of this from the repository before changing it. If the repository differs, adapt to what exists; do not initiate an unnecessary framework migration.

**Priority order:**

1. A realistic, stable, evidence-producing simulation product for technical roles with defensible, high-resolution scoring.
2. A complete employer journey from signup to a published simulation and candidate report.
3. A trustworthy candidate journey and portable work record.
4. Public landing pages that explain and visibly prove the product at the same quality bar.
5. Meticulous interaction, accessibility, responsive, performance, copy, and visual polish.

The public site is not allowed to be mediocre, but it must support the product rather than substitute for it. Allocate the greatest engineering and design attention to the simulation engine, simulation builder, candidate workspace, and evidence report.

**In scope:** Public pages, authenticated company dashboard, auth/onboarding, a role-first simulation studio, 30 curated working micro-simulation templates across the six MVP roles, candidate invitation and preflight, the shared simulation runtime, role-specific workbench modules, event capture, report generation, portable work record, data persistence, functional buttons, responsive behavior, accessibility, tests, and production build quality.

**Out of scope unless already implemented:** Billing, a full ATS replacement, job posting/distribution, public marketplace liquidity, biometric or government-ID verification, live video proctoring, arbitrary simulations for every profession, unsupported integrations, and invented enterprise/compliance claims. Do not add decorative placeholders for out-of-scope features. The product may communicate the long-term marketplace path, but this release must earn that future by making the applied-technical evidence loop complete now.

**Wedge concentration rule:** Do not build a generic assessment platform with six role labels pasted onto the same test. The six roles share one applied-technical job family, one evidence architecture, and reusable workbench modules, but each role must have distinct work, resources, decisions, deliverables, rubrics, and reports. Every authenticated surface should make this specialization visible: role filters, role templates, role-specific competencies, realistic technical artifacts, and reports written in the language of the work. Remove active FDE, finance, FP&A, Project Meridian, Project Relay, generic coding-test, personality-test, and unrelated role content from navigation, seed data, copy, templates, and screenshots.

**MVP depth rule:** Provide five curated, working micro-simulations for each of the six roles—30 total templates. Each is designed to take roughly 5–8 focused minutes and to produce a narrow, inspectable unit of evidence. Employers can send one simulation or assemble a short role pack of two or three. Do not claim a five-minute exercise proves an entire candidate. One simulation produces one work receipt; repeated receipts can form a stronger portable record over time.

**Design reference rule:** Use Linear as a reference for information hierarchy, typography discipline, product focus, interaction restraint, and fit-and-finish only. Do not clone Linear’s black surfaces, purple haze, star-field effects, copy structure, icons, or page compositions. Fydell must have its own visual logic based on work becoming inspectable evidence.

## The standard

The present site feels like a generic AI-generated SaaS template: dark background, purple accent, oversized headline, gray paragraph, repeated rounded cards, low contrast, large empty gaps, vague claims, and multiple pages that repeat the same information. That entire visual and structural pattern must be removed.

The new Fydell must feel like a real platform built to acquire and serve employers now. It must not call attention to being an MVP, a pilot, a prototype, an experiment, a small simulation library, or an early-stage startup. It must feel focused rather than unfinished and product-deep rather than feature-broad. A hiring manager must be able to arrive, understand the product, create an account, configure a simulation, invite a candidate, review a completed session, and understand the evidence without encountering a dead end.

The quality bar is the product clarity of Stripe, the restraint and precision of Linear, the workflow credibility of Ashby, the operational density of Ramp, and the trust discipline of Vanta. Do not copy their layouts, copy, colors, or visual effects. Use those companies only as a standard for hierarchy, product proof, interaction quality, consistency, and confidence.

The result should communicate this category in one sentence:

> Fydell is the work-based hiring platform where companies evaluate and hire people through demonstrated work instead of resumes.

Every screen, sentence, visual, and interaction must reinforce one of these ideas:

1. Employers can create realistic job simulations around the work and skills they need.
2. Candidates demonstrate how they investigate, decide, use tools, and communicate.
3. Employers receive evidence they can inspect, not a mysterious score they must trust.
4. Candidates build portable records of demonstrated ability.
5. Over time, those records power a marketplace based on proven work rather than claims.

If an element does not strengthen comprehension, trust, product proof, or task completion, remove it.

## Non-negotiable truthfulness rule

Professional polish must come from a coherent product, not fabricated scale.

- Do not invent customer logos, testimonials, reviews, press quotes, usage statistics, success rates, security certifications, integrations, benchmarks, predictive-validity claims, or compliance badges.
- Do not display GlobalFoundries, Samsung, Fractal, WPP, or any other company name or logo unless explicit permission and a real asset already exist in the repository.
- Do not claim SOC 2, ISO 27001, GDPR compliance, encryption standards, identity verification, biometric checks, proctoring, validated psychometrics, or ATS integrations unless those capabilities are actually implemented and supported by the codebase.
- Do not disguise demo data as production activity. Seeded content must live in a clearly labeled “Demo workspace” and never appear in a real new customer workspace.
- Do not use fake people on the public marketing site. In product demonstrations use neutral labels such as “Sample candidate” or anonymized candidate IDs and mark fictional scenario companies as fictional.
- Do not present an arbitrary or untraceable `90/100`, four unexplained perfect competency scores, or a “top 5%” badge. A 1–100 score is permitted only when it is reproducible from versioned evidence opportunities, explicit weights, anchored graders, coverage rules, and inspectable source evidence as specified below.
- Do not use defensive copy such as “What we do not claim.” State exactly what Fydell records, how it evaluates it, what is permitted, and where human review remains necessary.
- Do not promise features through nonfunctional UI. If a capability cannot be made real in this implementation, omit it from the primary flow and copy.

## First: audit before changing anything

Before implementation, inspect the entire current application and produce a private working inventory of:

- all routes and layouts;
- all navigation links, buttons, icon buttons, menus, tabs, filters, forms, modals, dropdowns, and table actions;
- Supabase authentication, tables, queries, storage, row-level security, and environment variables;
- current simulation-generation logic, simulation state, scoring logic, score distributions, invitations, reports, and credentials;
- duplicated marketing sections and duplicated routes;
- console errors, hydration problems, invalid nesting, broken imports, dead links, placeholder `href="#"` values, fake loading states, and controls with no handlers;
- responsive failures at 390 px, 768 px, 1024 px, and 1440 px;
- accessibility failures involving contrast, semantics, focus, labels, keyboard access, and reduced motion;
- copy that sounds generated, vague, apologetic, repetitive, or unprovable.

Use that inventory to preserve what works, remove what should not exist, and close every gap in the primary journey. Do not stack a new theme on top of old components. Consolidate or replace them so the application has one deliberate system.

## Repository-specific findings that must be fixed

The current repository has already been inspected at commit a95d984 on the main branch. Re-audit the latest branch before implementation in case it has changed, but treat the following as known problems, not optional suggestions.

### The existing simulation is a form, not a work simulation

The current MicroRunner renders the same role-independent sequence for every template: Inspect, Decide, Explain. It shows a resource inside a rounded card, then radio buttons, checkboxes or a number input, then one textarea and a stakeholder drawer. The title and content change, but the work model does not. That is why Data Analyst, Solutions Engineer, Implementation Consultant, Technical Support Engineer and the other roles feel like labels applied to one quiz.

Replace this runtime rather than reskinning it. Do not preserve the fixed three-stage component as the primary candidate experience. The new runtime must render role-specific workbench modules from the versioned simulation definition, support non-linear investigation, and generate meaningful artifacts and semantic evidence events.

The candidate should feel that they are:

- investigating data as an analyst;
- reconciling reporting definitions as a BI analyst;
- mapping customer requirements to product and API constraints as a solutions engineer;
- changing dependencies and launch scope as an implementation consultant;
- reproducing and diagnosing a technical issue as a support engineer; or
- tracing requirements through a workflow as a business systems analyst.

Changing copy while retaining the same question form does not satisfy this requirement.

### The existing score is not sufficiently accurate

The current micro scoring implementation combines:

- binary exact-answer scoring for single-select and numeric questions;
- generic F1 for multi-select answers;
- substring keyword matches for written reasoning;
- four generic phrase detectors for decision, evidence, limitation and next step;
- a verification signal based on editing an answer twice, mentioning a word such as “verify,” or opening two resources;
- a stakeholder signal based primarily on whether a rule ID begins with a relevant prefix; and
- a coverage adjustment that pulls raw performance toward 50.

This is not an acceptable production evaluator. It can reward saying the right word without making the right argument, opening resources without using them, revising an answer without improving it, or triggering a stakeholder rule without asking a high-quality question. It can miss a correct response phrased differently. It also produces coarse clusters because several high-weight inputs are all-or-nothing.

Retire this engine for new scored attempts. Preserve old analysis rows and label their engine version as legacy; never silently rewrite historical results. New attempts must use the advanced scoring architecture specified later in this document.

Explicitly remove these behaviors from production scoring:

- String-includes keyword grading as the final judge of written work.
- Generic phrase lists that award communication credit for words such as “recommend,” “if,” “may,” or “next.”
- Automatic verification credit merely because a field was edited twice.
- Automatic investigation credit merely because a resource was opened.
- Treating time-on-resource, click count, message count, or typing volume as competence.
- Treating external-AI disclosure as a penalty.
- Treating a stakeholder response-rule match as sufficient proof that the candidate asked a strong question.
- Pulling a low-coverage score toward an arbitrary midpoint.
- Returning a numeric score when technical failure removed too much of the intended evidence opportunity.

### The current content contract forces shallow templates

The current micro content model requires exactly five minutes, two or three resources, three to five questions and a visible point total of 100. Those restrictions optimize for quiz construction rather than credible job simulation. Replace that model with a versioned SimulationDefinitionV2 contract built around tasks, modules, artifacts, evidence opportunities, rubric indicators and scorer configuration.

Five to eight minutes remains the product target for a micro-simulation, but duration is validated through testing rather than a schema equality check. A scenario may use the number of resources and evidence opportunities required to represent the work clearly, provided it remains usable within the tested time.

The candidate-safe projection currently includes question point values. Remove all scoring weights, answer keys, rubric anchors, hidden branches, expected actions and evaluator configuration from candidate payloads. Candidate-facing completion requirements may explain what must be submitted, but must not reveal how to game the score.

### The current event stream is too thin

The runner currently records resource openings and chat messages, but many answer changes are saved only as generic deliverable state. Yet the score expects edit events that the runtime does not reliably emit. Replace this split with a semantic module-event system:

- the module owns its validated state transition;
- the server persists the new module state;
- the same transaction or idempotent operation emits a typed event describing the meaningful action;
- the event stores before/after references or a compact validated diff where appropriate;
- scoring reads server-accepted semantic events, not arbitrary client claims.

Do not emit a scoring event for every keystroke. Persist drafts for recovery, but score final artifacts, meaningful checkpoints, decisions, queries, filters, tests, requirement edits, timeline changes, messages and revisions that materially changed the work.

### The repository contains conflicting product instructions

PRODUCT.md still describes finance hiring and Project Meridian. DESIGN.md still directs a dark cinematic, cyan-to-magenta, glass-overlay product. The package scripts and legacy folders still include old Meridian, FDE, Relay, static HTML and visual-rebuild paths even though the active product has moved to applied technical roles.

Update repository documentation so future coding agents cannot regress to the retired finance product or the purple cinematic visual system. Determine which legacy files are imported or required before removing anything. Preserve applied database migrations as history; add forward migrations instead of rewriting migrations that may already have run. Archive historical user data and reports rather than deleting them.

If the old browser simulation bundle, Meridian scripts, Monaco editor, static HTML mockups, Python visual-rebuild scripts or Relay scenario are no longer part of a real runtime path, remove their build hooks and production dependencies after verifying that no active route imports them. Do not keep dead architecture because it looks substantial.

### The current employer product exposes the library rather than the workflow

The employer simulations page currently leads with “Thirty curated five-minute simulations,” role pills and repeated template cards. The preview lists question types and point values. This frames Fydell as a small test catalog and exposes the shallow implementation model.

Replace that presentation with:

- role outcomes and evidence coverage;
- complete role packs and individual simulations;
- realistic candidate workspace preview;
- report preview with traceable evidence;
- simulation status, candidate activity and operational actions;
- configuration and integration paths.

Employers may still browse all 30 templates, but the product should sell a reliable hiring workflow, not the count of cards in a catalog.

### The current result view overstates what the engine knows

The current result view displays a large score, a formula, generic component bars and “what was correct” based on coarse rules. Replace it with the report architecture below. The report must distinguish:

- performance score;
- evidence coverage;
- scoring confidence;
- deterministic checks;
- rubric judgments;
- counterevidence;
- technical limitations;
- model or human review status; and
- the employer’s separate decision.

The raw answer, final artifact, source evidence and scored interpretation must remain inspectably connected. A customer should be able to understand why a result received 73 instead of 84 without reading source code.

## Execute this master specification in controlled phases

This document is the complete source of truth, but do not make every functional change in one uncontrolled edit. Work sequentially so each layer remains testable and failures can be isolated.

### Phase 0 — Baseline

- Audit routes, data, controls, and errors.
- Run the current typecheck, lint, tests, and production build before editing.
- Capture baseline screenshots of primary routes.
- Record existing failures separately so they are not confused with regressions.

### Phase 1 — Foundations

- Consolidate semantic design tokens, typography, spacing, radii, buttons, fields, feedback, tables, overlays, and application/public shells.
- Fix global accessibility and responsive foundations.
- Preserve existing behavior while replacing inconsistent primitives.
- Validate typecheck/build and visually inspect the shells before moving on.

### Phase 2 — Product domain and data

- Establish typed simulation definitions, tasks, rubric anchors, event capture, session states, and persistence.
- Add safe migrations and row-level security changes.
- Build adapters for scenario generation, stakeholder responses, and report evaluation.
- Add unit tests for state transitions, scoring/rubric logic, score sensitivity and monotonicity, idempotent submission, and permission boundaries.

### Phase 3 — Employer journey

- Complete auth, company onboarding, the operational company dashboard, needs-review queue, simulation library, role-pack library, simulation detail workspace, builder, preview, publish, candidate invitation, and candidate pipeline.
- Populate the template catalog with five complete simulations for each of the six MVP roles and verify that filters, previews, duplication, customization, and publishing use real definitions.
- Validate the complete employer path and every dashboard action before beginning report polish.

### Phase 4 — Candidate simulations

- Build the shared simulation runtime, preflight, candidate workspace, workbench module registry, stakeholder interaction, evidence capture, and role-specific deliverable surfaces.
- Implement all 30 curated templates as configuration over the shared engine; do not create 30 unrelated hard-coded pages.
- Complete autosave, server-authoritative timing, branching/curveballs, submission, refresh recovery, accessibility, and responsive states.
- Test every template end to end, and subject the flagship Solutions Engineer simulation to the deepest visual and functional QA.

### Phase 5 — Evidence and records

- Build report generation/status, role-specific evidence citations, timeline, reviewer workflow, decision state, sharing/printing, portable work receipts, multi-receipt role records, and privacy controls.
- Verify every report statement against captured evidence.

### Phase 6 — Public experience

- Rebuild the homepage and public pages using real product components/states from the completed workflow.
- Make the landing experience exceptional without inventing product depth or social proof.

### Phase 7 — Final polish and QA

- Complete interaction inventory, responsive screenshots, keyboard pass, accessibility scan, performance pass, copy pass, and full regression journey.
- Remove temporary code, debugging output, unused components, dead styles, and obsolete routes.

After each phase, run the relevant checks and fix regressions before continuing. If a coding-agent context limit forces a pause, stop only at a working, build-clean phase boundary and report the exact next phase. Never leave the repository in a half-migrated state.

## Engineering craftsmanship standard

The code must reinforce the impression created by the interface: a strong engineer built this deliberately.

- Respect the repository’s established architecture, package manager, routing model, linting, formatting, and naming conventions.
- Prefer a small number of composable domain components over page-sized monoliths or hundreds of one-off wrappers.
- Separate domain state and evaluation logic from rendering. Do not hide scoring, branching, persistence, or permissions inside visual components.
- Use TypeScript discriminated unions and schema validation for simulation tasks and event payloads. Avoid stringly typed state.
- Create one versioned `SimulationDefinition` contract that the builder, candidate runner, preview, report, and templates all share.
- Model session progression as explicit states and valid transitions rather than a loose collection of booleans.
- Put external AI generation, stakeholder conversation, email, and report-evaluation behavior behind typed server-side adapters so a deterministic local/demo implementation and a configured provider follow the same contract.
- Validate all model/provider output against a schema and provide bounded retries/fallbacks. Never render untrusted model output as arbitrary HTML.
- Use database constraints and idempotency where they protect invitations, attempts, submissions, and report generation.
- Reuse accessible primitives, but do not ship default component-library styling. Every shared primitive must be adapted to Fydell’s tokens, density, states, and interaction rules.
- Do not add a large dependency to solve a small styling problem. Reuse installed packages where sound and document any necessary new dependency.
- Never hard-code theme hex values, ad hoc spacing, or radii inside feature components. Use semantic tokens and variants.
- Avoid premature abstractions that obscure a three-line behavior. Abstract when the domain concept or repeated behavior is real.
- Use server components/server rendering where appropriate, and add client boundaries only where interaction requires them.
- Keep secrets and privileged Supabase/service operations server-side.
- Add comments for non-obvious domain decisions and invariants, not for obvious JSX.
- Delete superseded components and styles after their callers are migrated. Do not keep two competing design systems.
- No generated file may contain `TODO`, `FIXME`, placeholder handlers, unreachable mock branches, or commented-out alternative implementations in the finished path.

### Shared simulation contract

Represent tasks with an extensible, typed contract equivalent to a discriminated union such as:

- `briefing`
- `resource_review`
- `stakeholder_conversation`
- `data_analysis`
- `structured_decision`
- `written_deliverable`
- `curveball`

Each task definition must state its instructions, resources, allowed interactions, completion rule, evidence events, rubric mapping, and accessibility label. Templates are data/configuration over the shared engine; do not fork a separate page and scoring system for every role.

Use a versioned event envelope with at minimum event ID, schema version, organization/simulation/session references, event type, server timestamp, safe payload, and actor. Reports must cite immutable event IDs or submission artifacts so evidence links do not break when labels change.

## Product architecture

Create a clear separation between the public marketing experience, the authenticated employer application, the candidate simulation environment, and the candidate-owned record.

Use the existing framework and route conventions where practical, but ensure the final information architecture provides these destinations or their clear equivalents:

### Public experience

- `/` — category-defining homepage
- `/product` — the complete employer-to-evidence workflow
- `/employers` — outcomes and workflow for hiring teams
- `/candidates` — candidate experience and portable work record
- `/trust` — evidence, session integrity, AI-use transparency, privacy, and evaluation methodology
- `/contact` — concise sales/contact path
- `/login` and `/signup` — real authentication

### Employer application

- `/app` — workspace overview
- `/app/simulations` — searchable simulation table
- `/app/templates` — six-role curated template and role-pack library
- `/app/simulations/new` — guided simulation builder
- `/app/simulations/[id]` — simulation overview, candidates, configuration, and sharing
- `/app/candidates` — candidate pipeline, invitation state, review state, and report status
- `/app/candidates/[id]` — candidate activity, attempts, work receipts, reviewer notes, and sharing state
- `/app/invitations` — invitation management only if it is implemented as a substantive destination; otherwise keep it inside simulation and candidate views
- `/app/reports` — needs-review and completed-report index
- `/app/reports/[id]` — evidence-backed candidate report
- `/app/settings` — company, workspace, members, and account settings that are actually supported

### Candidate experience

- `/invite/[token]` — invitation acceptance and preflight
- `/simulation/[sessionId]` — focused simulation workspace
- `/record/[slug]` — privacy-controlled portable work record

Remove “Roles,” “Simulations,” and vague “Pricing” pages from the primary public navigation if they are currently thin, repetitive catalog pages. Role templates belong inside the authenticated creation flow or within a focused product section. If pricing is not finalized and connected to a real purchase or sales flow, remove the vague pricing page rather than showing “scoped directly” or a pretend plan grid. Keep “Contact sales” available as a secondary route, not the only way to experience the product.

## Navigation and conversion path

Use this public navigation:

`fydell` · Product · Employers · Candidates · Trust

Right side:

`Sign in` · primary button `Create a simulation`

Behavior:

- The header is calm, compact, sticky after the user begins scrolling, and never oversized.
- The logo returns to the homepage.
- Every nav item routes to a complete page or a real section.
- `Create a simulation` sends signed-out users to signup with a safe return path to the builder and signed-in users directly to the builder.
- `Sign in` opens the real authentication flow.
- Mobile navigation is a functional, keyboard-accessible menu with focus management, Escape-to-close, route closing, and scroll locking.
- The footer contains Product, Employers, Candidates, Trust, Contact, Privacy, and Terms only when those pages exist. Do not add empty resource columns to make the company look larger.

The public site must have one consistent primary action: `Create a simulation`. Use `Try the candidate experience` as the secondary action where relevant. Use `Contact sales` only for buyers who prefer a conversation. Do not alternate among “Get started,” “Book a pilot,” “Join waitlist,” “Request access,” “Learn more,” and “Contact us” without a clear reason.

## Brand and visual system

Replace the current black-and-purple AI-SaaS aesthetic with a restrained, ownable system that feels like infrastructure for hiring evidence.

### Brand idea

The visual metaphor is “work becoming evidence.” Use quiet traces, connected evidence markers, structured annotations, timelines, and state transitions. Do not use literal chains, brains, magic sparkles, robots, glowing orbs, abstract 3D blobs, or generic AI illustrations.

Give Fydell one recognizable device: an “evidence rail,” a thin cobalt line with precise nodes/ticks that connects a requirement to a candidate action and then to a report citation. Use it selectively in the hero sequence, report citations, simulation activity, and portable record. It should behave like information design, not decoration. This creates a brand signature without resorting to gradients or mascot illustrations.

### Color

Use a light, editorial public canvas and a precise application canvas.

- Public canvas: mineral paper, approximately `#F4F3EF`.
- Primary surface: soft white, approximately `#FCFCFA`.
- Primary ink: near-black navy, approximately `#0B1020`.
- Secondary text: a fully readable slate, approximately `#586273`; never low-opacity gray.
- Borders: cool neutral, approximately `#D9DEE7`.
- Brand: mineral cobalt, approximately `#3157D5`, with a darker interactive state near `#2342A2`.
- Optional annotation accent: restrained periwinkle, approximately `#8177E8`, used only to distinguish evidence types—not as a gradient or glow.
- Dark evidence/simulation canvas: deep ink, approximately `#0B1020`, with opaque, clearly separated panels.
- Success, caution, and error colors appear only for semantic feedback. Red must never be decorative. Do not communicate status by color alone.

Define semantic design tokens rather than scattering literal values across components. Test all text and interactive-state combinations for WCAG 2.2 AA contrast.

### Typography

- Use Geist Sans if already available; otherwise use Inter or the strongest existing neutral sans-serif. Use one family consistently.
- Use Geist Mono or a restrained monospace only for evidence IDs, timestamps, logs, and technical artifacts.
- Hero headline: 56–68 px desktop, fluid down to 40 px tablet and 36 px mobile; compact line height; no enormous 90–120 px type.
- Page headline: 44–56 px desktop.
- Section headline: 32–44 px.
- Body: 16–18 px with 1.5–1.65 line height.
- Product UI: 14–16 px, never 10–11 px for essential information.
- Use sentence case. Do not use tiny all-caps eyebrows throughout the site.
- Use no more than four meaningful font weights.
- Keep readable public copy between roughly 55 and 72 characters per line.

### Layout

- Use a 12-column responsive grid and a maximum public content width near 1200–1280 px.
- Use a disciplined 8 px spacing system.
- Public section spacing should normally be 88–128 px desktop and 56–80 px mobile, adjusted for content. Remove both cramped sections and theatrical empty voids.
- Let important content sit directly on the page. Do not put every paragraph, feature, role, statistic, and CTA inside a bordered card.
- Use whitespace, typography, scale, and alignment before adding a container.
- Use cards only when the content is a distinct object or action. Cards should not be the default layout primitive.
- Use one controlled radius system: 10–12 px for most surfaces, 8–10 px for controls, pill shapes only for compact statuses or segmented controls.
- Use subtle 1 px borders and restrained shadows only to establish elevation. No glowing borders, glass panels, backdrop blur, neon gradients, or heavy drop shadows.
- Use tables and split views for operational data. Do not turn every table row into a floating card.

### Iconography and imagery

- Use one icon library, preferably Lucide if already installed, at consistent 16, 18, and 20 px sizes.
- Icon-only controls require a visible tooltip and an accessible name.
- Do not mix filled icons, outline icons, emojis, and custom line art.
- Public product visuals must be real interface compositions built from the actual product components or accurate captured product states. Do not use decorative dashboard mockups that show functionality the app does not have.
- Avoid stock photography. The product and evidence should be the visual story.

### Motion

- Motion exists to explain state changes, causality, and navigation.
- Use 140–240 ms transitions with subtle opacity and 2–6 px movement.
- Use one controlled homepage sequence that shows role requirements becoming a simulation, candidate actions becoming evidence, and evidence becoming a hiring report.
- Do not use scroll-jacking, parallax, floating cards, pulsing gradients, infinite marquee text, bouncing arrows, cursor followers, or decorative particles.
- Respect `prefers-reduced-motion` and provide an equally clear static experience.

## Absolute anti-vibecoded rules

Remove these patterns everywhere:

- gradient text;
- black pages with purple glow behind every section;
- glassmorphism and excessive blur;
- bento grids assembled from interchangeable feature cards;
- a tiny uppercase label above every headline;
- three equally sized cards immediately below every section heading;
- repeated “headline + gray paragraph + rounded cards” compositions;
- excessive pills and badges;
- fake terminal windows, fake code snippets, and generic charts;
- unnecessary `01 / 02 / 03` labels used as decoration;
- feature icons inside colored rounded squares;
- huge rounded rectangles surrounding content that does not need a container;
- gray text so faint that it looks disabled;
- enormous empty vertical gaps;
- generic AI copy such as “revolutionize,” “supercharge,” “unlock,” “next-gen,” “seamless,” “effortless,” “game-changing,” “power of AI,” or “hiring reimagined”;
- multiple slogans competing on one page;
- copy that announces “AI-powered” without explaining the concrete job being done;
- fake social proof, fake metrics, fake activity, or fake candidate perfection;
- “Coming soon,” “Beta,” “MVP,” “Pilot,” or “Request access” inside the primary product journey;
- buttons that are only colored text with no clear affordance;
- links that lead to the same generic page regardless of label;
- disabled controls used to decorate a supposedly larger product;
- hover effects that move layout, alter text readability, or make surfaces jump;
- default shadcn component styling left unmodified across the whole site;
- inconsistent capitalization, border radii, icon sizes, field heights, or button language.

The design must pass the squint test: at a blurred glance, every page needs one obvious focal point, one primary action, clear grouping, and a hierarchy that differs appropriately from other pages.

## Homepage: exact product story

The homepage must show the real product above the fold and tell a complete story without pretending the company is larger than it is.

### 1. Hero

Use this core copy, making only small edits if necessary for grammar or actual capability:

**Headline:**

> See how candidates work before you hire them.

**Subheadline:**

> Create realistic job simulations, invite candidates, and review evidence of how they investigate, decide, use tools, and communicate.

**Primary CTA:** `Create a simulation`

**Secondary CTA:** `Try the candidate experience`

**Supporting line:**

> Built for applied technical roles where a resume cannot show the work.

The hero should be left-aligned or use an editorial asymmetrical composition. Do not center every line in a narrow column. Do not add a decorative badge above the headline.

Next to or immediately below the copy, show one dominant real product composition—not three conceptual cards. It should show a coherent employer workflow with a simulation brief on the left, candidate evidence in the center, and an evidence-linked report state on the right. On smaller screens it becomes a controlled single-panel sequence rather than an unreadably scaled desktop screenshot.

### 2. The change in hiring

Use a clean two-column editorial comparison rather than a grid of cards.

**Heading:** `Replace claims with demonstrated work.`

Traditional process:

- Resume claims
- Scripted screening
- Generic tests
- A final answer without context
- Evidence trapped inside one application

Fydell process:

- Role-relevant work
- Decisions under realistic constraints
- Technical and communication evidence together
- An inspectable record of the process
- A portable record the candidate can carry forward

Use a restrained visual transition from claims to evidence. Do not attack all existing hiring tools or make an unprovable prediction.

### 3. One workflow, shown with the product

**Heading:** `From role requirements to hiring evidence.`

Show three connected product states using actual UI, not three generic feature cards:

1. `Define the work` — enter the role, outcomes, constraints, and skills that matter.
2. `Run the simulation` — candidates investigate a realistic scenario using documents, data, stakeholder messages, and permitted AI tools.
3. `Review the evidence` — inspect competency evidence, the action timeline, AI use, risks, and suggested interview follow-ups.

The interaction should let the visitor switch among these states without navigating away. Each state must be an accurate preview of a real route in the application.

### 4. Candidate simulation environment

**Heading:** `A work sample, not another questionnaire.`

Show the flagship simulation workspace at a readable scale. Describe concrete task types:

- investigate a customer or business problem;
- inspect supplied data, logs, and documentation;
- ask a stakeholder clarifying questions;
- respond to a new constraint;
- make a recommendation and explain the tradeoffs.

Do not advertise a small library count such as “five simulations.” The product is a system for creating and running role-relevant work, not a content catalog.

### 5. Evidence report

**Heading:** `Every judgment points back to evidence.`

Show a report where a user can click a competency observation and see the exact candidate action, response excerpt, resource use, revision, or decision that supports it. Include an evidence-confidence indicator and explicit limitations. Never show unsupported precision.

### 6. Two-sided asset

**Heading:** `One session. Evidence for the employer. A record for the candidate.`

Use a split composition:

- Employer side: structured evidence for the current hiring decision.
- Candidate side: a privacy-controlled portable record showing verified simulations and demonstrated skills.

This section must make the marketplace direction visible without claiming the marketplace already has liquidity or thousands of candidates.

### 7. Initial focus

**Heading:** `Built first for work that mixes technical judgment and communication.`

Present the six roles as one coherent applied-technical family, not six unrelated markets:

- Data Analyst — investigates metrics, experiments, and data anomalies;
- Business Intelligence Analyst — defines reliable reporting and resolves dashboard/data-model issues;
- Solutions Engineer — discovers requirements and evaluates technical integrations;
- Implementation Consultant — manages scope, dependencies, migration, and launch decisions;
- Technical Support Engineer — triages logs, incidents, bugs, and escalation;
- Business Systems Analyst — maps workflows, requirements, access, and system changes.

Use a compact role matrix or artifact-led sequence rather than six identical rounded cards. Make the shared pattern visually obvious: ambiguous request → technical evidence → judgment → communication. Do not expose template quantity in the homepage section.

### 8. Trust

**Heading:** `Trust the evidence because you can inspect it.`

Explain only implemented capabilities across four compact areas:

- session and invitation provenance;
- permitted and recorded AI use;
- consistent job-related rubrics;
- human-readable evidence and review.

Link to the Trust page.

### 9. Final CTA

**Heading:** `Create the first simulation for your role.`

**Body:**

> Define the work, invite candidates, and review a complete evidence report in one workspace.

Buttons: `Create a simulation` and `Contact sales`.

Do not end with “Join our pilot.”

## Product page

The Product page must explain the system as an end-to-end workflow, not four abstract capability cards.

Structure it around a single continuous example:

1. A hiring manager creates a Solutions Engineer role.
2. Fydell turns the role requirements into a structured scenario and evidence rubric.
3. The hiring manager reviews, edits, previews, and publishes it.
4. A candidate receives an invitation and completes the work.
5. The employer inspects evidence and generates interview follow-ups.
6. The candidate chooses whether to add the verified result to a portable record.

Use large real product views, annotated with concise callouts. Do not repeat the homepage word for word. End with `Create a simulation`.

## Employers page

Speak in hiring-team language rather than founder or AI language.

**Headline:** `Evaluate the work your role actually requires.`

Cover:

- how role outcomes become a simulation;
- how hiring teams set skills and rubric anchors;
- how invitations and candidate status work;
- how reviewers compare evidence consistently;
- how reports support, rather than replace, the hiring decision;
- how interview questions are generated from evidence gaps.

Show the employer workspace, simulation builder, candidate table, and report. Include `Create a simulation` as the primary CTA and `Contact sales` as secondary.

## Candidates page

Treat candidates as users, not test subjects.

**Headline:** `Show your work, not just your work history.`

Explain:

- what the simulation contains;
- what is recorded;
- whether AI is permitted and how its use is represented;
- how time limits and accommodations work if implemented;
- what the employer receives;
- what the candidate can add to a portable work record;
- how sharing and privacy controls work.

Use plain, calm language. Do not use surveillance language such as “catch cheaters.” Do not imply personality or emotion inference. Provide `Try the candidate experience` as the primary CTA.

## Trust page

Make Trust a substantive product page, not a vague shield-icon section.

Organize it into:

1. **What is captured** — invitation/session identity, timestamps, responses, resources opened, built-in AI interactions, revisions, and relevant window-state events only if actually implemented.
2. **How evaluation works** — job-related competencies, anchored rubrics, evidence collection, confidence, and human review.
3. **AI use** — what is allowed, what is recorded, and how employers interpret augmentation versus reliance.
4. **Candidate control** — consent, access, portable-record visibility, and deletion/contact path supported by the system.
5. **Security and privacy** — implemented data handling only, with links to real policies.
6. **Limitations** — concise operational boundaries presented alongside the methodology, not as a defensive marketing disclaimer.

Never claim a simulation is “cheat-proof.” Describe integrity signals accurately and let employers review them.

## Authentication and company onboarding

Make signup feel like entering a serious product, not completing a lead form.

### Signup

- Work email
- Password or implemented SSO provider
- Full name
- Clear Terms and Privacy links
- Real validation, loading, success, and error states

### Company onboarding

Use a short guided flow with one clear decision per step:

1. Company name and optional logo upload.
2. Company website/domain and team size.
3. The first role to evaluate.
4. Land directly in the simulation builder with those values prefilled.

Persist progress so refresh and Back do not erase work. Keep the user’s entered values when validation fails. New users must see a polished empty workspace with a clear next action, not fake analytics.

## Employer application shell

Use a compact professional application shell distinct from the public site.

### Desktop shell

Left navigation:

- Overview
- Simulations
- Candidates
- Reports, only if it is a distinct real destination

Bottom:

- Workspace settings
- Account menu

Top area:

- workspace/company switcher only if multi-workspace support exists;
- current page title;
- contextual primary action;
- notifications only if real.

The sidebar may use deep ink, but it must be opaque and highly legible. Do not use glowing active states. Use a simple filled or bordered selection state.

### Mobile shell

Use a compact top bar and functional drawer. Data-heavy screens must reflow deliberately; do not merely squeeze desktop tables.

## Company dashboard: make the authenticated product the center of Fydell

The company dashboard must feel like the operating system for running work-based hiring—not a marketing mockup behind a login. It should be denser and more task-oriented than the public site while retaining the same typography, evidence rail, cobalt accent, and restrained visual language.

Do not build a dashboard made of six giant statistic cards. Do not fill it with fake charts, decorative trend arrows, fake candidate activity, placeholder avatars, an empty calendar, a generic AI assistant, or a “Good morning” hero that consumes the first viewport. The first screen must answer:

1. What needs the hiring team’s attention now?
2. Which simulations are currently running?
3. Where are candidates in the workflow?
4. What should the employer do next?

### Application frame

At 1440 px, use an approximately 224–240 px fixed or sticky left navigation, a compact 56–64 px top header, and a fluid main canvas with a sensible maximum readable width for reports but no artificial narrow container for tables. At laptop widths, collapse the sidebar to icons or a drawer before the data becomes cramped.

Left navigation:

- `Overview`
- `Simulations`
- `Templates`
- `Candidates`
- `Reports`

Bottom:

- `Workspace settings`
- current user/account menu

Top header:

- page title and one-line context when needed;
- a global role/status filter only on screens where it changes the underlying data;
- search only if it searches real entities;
- one contextual primary action, usually `New simulation` or `Invite candidates`;
- no notification bell unless there is a real notification model and inbox.

Use real breadcrumbs only on nested detail screens. Avoid putting breadcrumb, page title, description, tabs, action row, and KPI strip into five stacked bands. Collapse hierarchy so the useful work begins within the first viewport.

### Dashboard visual rules

- Application background: quiet cool neutral, not pure black and not a purple gradient.
- Tables and primary work areas: opaque white or deep-ink surfaces with 1 px borders and restrained 8–12 px radii.
- Avoid cards inside cards. A table can sit directly inside one surface; its rows should not each be cards.
- Use 13–14 px table text with strong header contrast, 36–44 px row height where density permits, tabular numerals for counts and time, and generous but not wasteful column spacing.
- Use status chips only for real state. Chips must be small, semantic, and never become the main decoration.
- Use the Fydell evidence rail beside items requiring review or showing evidence progression; do not add it to every row.
- Never use gradients, glows, glass panels, giant rounded corners, random colored icons, or a different accent color for every metric.
- Use one primary cobalt action per region. Secondary actions are neutral buttons or quiet text actions.
- On mobile, turn dense tables into labeled record rows or cards only where necessary. Preserve sorting/filtering in a sheet and never make users horizontally scroll an entire desktop dashboard.

## Overview dashboard

### Populated state

The default populated overview should use this hierarchy:

**Header**

- Title: `Overview`
- Small current hiring-period or workspace context only if supported
- Primary action: `New simulation`
- Secondary action: `Invite candidates`

**Compact operational strip**

Use one restrained inline strip, not four floating cards:

- Active simulations
- Awaiting candidate
- In progress
- Reports ready
- Needs review

Each value must be calculated from real persisted records and link to the filtered destination. If there is no historical comparison, do not show arrows or percentage changes.

**Needs review**

This is the dominant dashboard region. Show up to 6 real candidates whose reports are ready and whose employer review state is `Unreviewed` or `Follow-up needed`.

Columns:

- Candidate
- Role
- Simulation or role pack
- Evidence coverage
- Report ready
- Review owner
- Decision state
- primary row action `Review evidence`

Evidence coverage is not a mysterious quality score. Display `Strong coverage`, `Partial coverage`, or `Limited coverage` based on how much of the configured rubric has observable evidence, with a tooltip that explains the label. Clicking the row opens the report; the action opens the same report at its summary.

**Active simulations**

Show a compact table of up to 5 simulations:

- Simulation
- Role
- Status
- Invited
- Started
- Completed
- Needs review
- Updated

Provide `View all simulations`. Clicking a count applies the corresponding candidate-state filter on the simulation detail page.

**Recent activity**

Use a narrow chronological list of real, meaningful events: simulation published, candidate invited, session started, report completed, reviewer note added, decision updated. Group repeated low-value events where practical. Do not log every autosave or resource open on the company overview.

**Product next step**

If a company has active simulations but no invitations, show one contextual suggestion: `Invite candidates to [simulation]`. If reports are waiting, prioritize review instead. If the workspace is healthy, do not invent a task merely to occupy space.

### First-run empty state

A new employer account must begin with zero candidates, zero attempts, zero reports, zero activity, and no fabricated analytics.

Do not show a wall of zeros. Show:

- heading: `Create your first work simulation`;
- one sentence explaining that Fydell starts from the work the candidate will actually perform;
- six restrained role choices using text and a small role-specific artifact icon;
- primary action `Choose a role`;
- secondary action `Explore the candidate experience`;
- optional link `Use demonstration workspace`, only if a fully labeled demo workspace exists.

Selecting a role creates or opens a persisted builder draft with the role prefilled. Refreshing must retain it.

### Demonstration workspace

If demonstration data is necessary for sales or YC review:

- keep it in a separate organization/workspace;
- show a persistent top banner: `Demonstration data — not real candidate activity`;
- use fictional company and candidate names or anonymized labels;
- ensure all product interactions that are available in demo mode work;
- block mutations that would imply a real email or customer action, and explain the limitation inline;
- provide `Create your workspace` or `Return to your workspace`;
- never mix demo rows into a customer’s real workspace.

## Templates and role packs

The Templates destination should prove Fydell’s wedge depth. It is not a generic marketplace of quizzes and should not resemble an app store.

At the top show the six MVP roles as a compact filter rail:

- Data Analyst
- Business Intelligence Analyst
- Solutions Engineer
- Implementation Consultant
- Technical Support Engineer
- Business Systems Analyst

Below, show the five curated simulations for the selected role in a structured list. Each template row contains:

- concrete scenario title;
- 1–2 sentence work situation;
- duration;
- workbench modules used;
- competencies observed;
- final deliverable;
- actions: `Preview` and `Use template`.

Do not use glossy thumbnails or repetitive feature cards. Use a small, precise artifact preview—such as a table fragment, log excerpt, timeline, support ticket, requirements map, or API request—to make each role visibly different.

Also provide three clearly defined role-pack presets:

- `Quick screen` — one 5–8 minute simulation measuring a narrow evidence slice;
- `Core role pack` — two complementary simulations, approximately 12–16 minutes total;
- `Deep work sample` — three simulations, approximately 20–25 minutes total.

The time estimate must derive from selected template durations. Employers can reorder or remove pack items. Do not force candidates to complete all 30 templates, and do not market quantity as quality.

`Use template` creates a new persisted simulation draft owned by the organization. Never edit the global source template in place. Record the source template ID and version for traceability.

## Simulation library

Use a professional table with:

- simulation name;
- role;
- source template or `Custom`;
- status: Draft, Active, Paused, Archived;
- duration or total role-pack duration;
- invited / started / completed counts derived from real data;
- reports ready;
- last updated;
- owner;
- row action menu.

Support:

- search by simulation name;
- role filter restricted to the six MVP roles;
- status filter;
- owner filter only if multiple members are supported;
- meaningful sort by updated, created, invited, completed, or name;
- URL-persisted filters where practical;
- bounded loading/pagination;
- keyboard-accessible rows and menus;
- intentional empty, loading, error, and permission states.

Clicking a row opens the simulation detail workspace. Row actions may include only implemented behavior:

- `Preview`
- `Edit`
- `Duplicate`
- `Pause` / `Activate`
- `Archive`

Archiving must explain that active invitation links and sessions are not silently destroyed. If the data model cannot preserve that distinction, use Pause rather than destructive Archive.

## Simulation detail workspace

This screen is where a hiring team operates one simulation. It must not be a read-only card collection.

### Header

Show:

- simulation name;
- role;
- status;
- source template/version;
- total duration;
- owner;
- last updated;
- primary action based on state: `Publish simulation`, `Invite candidates`, or `Review reports`;
- overflow actions for Edit, Preview, Duplicate, Pause/Activate, and Archive.

### Tabs

Use:

- `Overview`
- `Candidates`
- `Configuration`
- `Evidence rubric`

Keep the active tab in the URL. Preserve filters when navigating back.

### Overview tab

Show a compact invitation funnel with exact counts: Invited → Opened → Started → Submitted → Report ready → Reviewed. This can be a single horizontal sequence on desktop and a vertical list on mobile. It is operational data, not a decorative conversion chart.

Below show:

- candidate rows requiring action;
- recent simulation activity;
- the task sequence and curveball trigger;
- a concise AI-use and integrity policy summary;
- a copyable invitation link if one exists.

### Candidates tab

Columns:

- Candidate
- Invitation
- Session
- Progress
- Submitted
- Report
- Review owner
- Decision
- action

Supported states must be explicit:

- Invitation: Draft, Ready to send, Sent, Opened, Expired, Revoked
- Session: Not started, In progress, Submitted, Timed out, Withdrawn
- Report: Not available, Processing, Ready, Failed, Superseded
- Review: Unreviewed, In review, Follow-up needed, Reviewed
- Decision: No decision, Advance, Hold, Decline

Changing the employer decision is a human action, requires the appropriate permission, persists actor/time, and is never performed automatically by Fydell.

Provide bulk invite or resend only when email delivery is actually configured and the selection behavior is fully implemented. Otherwise support individual invitations and secure-link copy. Never show a bulk checkbox whose only behavior is visual selection.

### Configuration tab

Show the published definition read-only with an `Edit draft` action. Editing an active simulation creates a new version; it must not retroactively alter completed attempts or reports. Explain which invitation cohorts receive the new version.

### Evidence rubric tab

Show competencies, anchored levels, weights, task coverage, auto-generated versus human-review portions, and insufficient-evidence behavior. Allow editing through a new draft version. Include a coverage warning when a competency has no task capable of producing evidence.

## Company candidate pipeline

The Candidates destination is a cross-simulation work queue, not a fake ATS.

Use a table with:

- Candidate
- Role
- Simulation / role pack
- Invitation state
- Session state
- Report state
- Evidence coverage
- Review owner
- Decision
- Last activity

Filters:

- role;
- simulation;
- invitation/session/report/review/decision state;
- assigned reviewer;
- completion date range only if implemented.

Primary saved views:

- `Needs review`
- `In progress`
- `Awaiting candidate`
- `Completed`

Do not add resume uploads, interview scheduling, offer management, onboarding, payroll, or unrelated ATS stages to make the table appear enterprise. Fydell owns the simulation-to-evidence workflow in this release.

The candidate detail page should include:

- identity/contact details supplied for this process;
- invitations and attempts;
- each completed work receipt;
- report links;
- reviewer notes;
- human decision history;
- portable-record share state where the candidate has granted access.

Do not merge two people solely because their names or email labels appear similar. Use stable profile/invitation/session identifiers and explicit organization access.

## Reports index and review queue

The Reports destination should default to `Needs review`.

Show:

- candidate;
- role and simulation;
- report generated time;
- evidence coverage;
- rubric areas with limited evidence;
- integrity state if measured;
- assigned reviewer;
- review status;
- decision;
- `Review evidence`.

Support reviewer assignment only if workspace membership exists. Report generation failures must display a specific state and authorized `Retry generation` action. Do not hide failed reports or leave them as permanent spinners.

## Invitation flow

From a published simulation, `Invite candidates` opens a focused flow:

1. Add candidate name and email, or upload a small CSV only if parsing, validation, preview, and error reporting are complete.
2. Review the exact simulation/role pack, estimated time, expiration, AI policy, and sender.
3. Preview the invitation message.
4. Send through the configured provider or create secure links.
5. Show per-candidate success/failure results.

Requirements:

- normalize and validate email addresses;
- prevent accidental duplicate active invitations;
- allow resend, revoke, and copy link with clear consequences;
- use cryptographically secure, expiring, non-guessable invitation tokens;
- never expose raw internal IDs;
- never claim an email was sent if only a link was created;
- preserve partially entered candidate rows when one row fails validation;
- record inviter, creation time, delivery status, expiration, and version assigned.

## Workspace settings

Only include settings that are real:

- Company profile: company name, logo, website/domain
- Members and roles: Owner, Admin, Reviewer, only if membership and permissions are implemented
- Default candidate instructions
- Default AI-use policy
- Data/privacy contact
- Account and sign-out

Do not add decorative SSO, SCIM, API keys, integrations, billing plans, compliance controls, or audit exports unless they function and are supported.

## Simulation builder: make this a flagship product

The builder must feel like a real authoring system. It cannot be a large text box followed by a fake `Generate` button.

Use a guided, autosaving six-step flow. Keep steps visible in a calm left rail or top progress navigation. A user can move backward without losing work. Validate before moving forward and show exactly how to fix errors.

The MVP builder is role-first and template-led. Its job is to help a company adapt proven applied-technical simulation structures to a real job—not to promise that one prompt can generate a scientifically valid assessment for any profession.

Entry paths:

1. `Use a role template` — recommended; starts from one of the 30 curated definitions.
2. `Build a role pack` — combines two or three curated simulations for the same role.
3. `Create from role requirements` — uses structured inputs and, only if configured, a schema-validated AI assist to recommend the closest templates and draft scenario details.

Do not offer a blank “Describe any job” canvas as the primary experience. Do not make employers become assessment designers. Defaults should be excellent and editable.

Use a persistent preview affordance that opens an accurate candidate view with sample/demo mode clearly indicated. The preview must use the same runtime components and definition version as the real candidate session; do not build a separate decorative mockup.

### Step 1 — Role

Collect:

- simulation name;
- one of the six supported role families;
- job title, prefilled from the role but editable within the family;
- department or function;
- seniority;
- optional location/work arrangement;
- job description paste or upload if file parsing is genuinely supported.

When a role is selected, show its short evidence promise and its five templates. For example, Solutions Engineer should emphasize discovery, technical integration reasoning, tradeoff communication, and customer judgment; Technical Support Engineer should emphasize triage, reproduction, escalation, and incident communication.

If the pasted job description is outside the six-role wedge, do not silently generate a generic test. State that this release is optimized for the six applied-technical roles and ask the employer to choose the nearest role or return to the role library.

Use clear labels above fields. Do not rely on placeholders as labels.

### Step 2 — Work outcomes

Ask what this person must actually accomplish in the first 90–180 days. Let the user add, edit, reorder, and remove 3–6 outcomes.

Suggest relevant competencies based on the role, but require review. Starting competencies for applied technical customer-facing work may include:

- problem framing;
- technical reasoning;
- data interpretation;
- prioritization and risk judgment;
- stakeholder communication;
- adaptability;
- tool and AI use.

Avoid personality claims such as culture fit, confidence, enthusiasm, or facial/emotional analysis.

Then ask the employer to choose the assessment shape:

- one focused micro-simulation;
- two-simulation core role pack;
- three-simulation deep work sample.

Recommend templates whose observable work covers the selected outcomes. Show a coverage map so the employer can see which outcome and competency each template contributes. Never suggest that selecting more templates automatically improves validity; communicate candidate time and evidence coverage as a tradeoff.

### Step 3 — Scenario

Assemble a realistic scenario from the approved role, selected template, and outcomes. Begin with the curated template’s complete scenario, resources, task sequence, curveball, and rubric mappings. Let the employer customize fictional company context, product context, seniority, constraints, terminology, and selected resources without breaking internal consistency.

If an LLM integration exists, use it only as a bounded authoring assistant through a server-side, schema-validated action with explicit loading, retry, timeout, and failure states. It may adapt names, context, resource prose, stakeholder constraints, and rubric wording within the selected template contract. It may not invent unsupported workbench types, remove required evidence opportunities, change the role family silently, or publish without employer review. If no provider is configured, the complete curated flow must still work through deterministic template configuration; do not pretend a model generated bespoke content.

The generated scenario must contain:

- a specific business context;
- a clear candidate objective;
- the minimum useful set of supplied resources, normally 2–6 for a micro-simulation, validated against the tested duration;
- a stakeholder with a defined perspective and knowledge boundary;
- one ambiguity that rewards clarification;
- one meaningful technical or analytical issue;
- one mid-session curveball;
- a final recommendation or communication deliverable;
- an estimated duration;
- a mapping from each task to observable competencies.

Let the employer regenerate individual sections, edit every field, and preview the candidate experience. Regeneration must never silently overwrite manual edits; warn and allow undo.

Add a scenario-consistency validator before review:

- every resource referenced by a task exists;
- dates and deadlines agree;
- names and fictional-company labels are consistent;
- numeric facts do not contradict unless the contradiction is deliberate and mapped to the rubric;
- the curveball changes a real decision;
- each competency has at least one observable evidence event;
- the final deliverable can be completed with supplied information;
- stakeholder answers stay within a defined knowledge boundary;
- expected duration is realistic for the selected task count.

Block publishing on critical consistency errors and link each error to the exact editor field.

### Step 4 — Evidence rubric

Show each competency with:

- what evidence should be observed;
- 0–4 anchored performance levels written in behavioral language;
- task(s) that produce the evidence;
- weight, with totals validated to 100%;
- automatic-evaluation versus human-review notes.

Example anchored scale for discovery:

- 0 — does not investigate the missing requirement or makes a harmful unsupported commitment;
- 1 — proceeds without identifying a major missing requirement;
- 2 — notices the gap but asks a broad or late question;
- 3 — asks a targeted question before committing to a recommendation;
- 4 — identifies the gap, explains why it matters, and adjusts the plan using the answer.

Do not use vague labels such as Poor / Average / Excellent without observable anchors.

For every automated or AI-assisted interpretation, mark:

- the specific events and artifacts it can use;
- the rubric anchor it is comparing against;
- what conditions produce `Insufficient evidence`;
- what requires human review;
- whether counterevidence can reduce confidence;
- how uncertainty is communicated.

The employer must see a task-to-evidence coverage view before publishing. A weight cannot substitute for missing evidence.

### Step 5 — Candidate experience and integrity

Configure only supported options:

- per-module duration, normally 5–8 minutes and never above 10 minutes for these MVP templates; role-pack duration is derived from its modules;
- built-in AI allowed, limited, or unavailable;
- resources candidates may use;
- attempt and invitation rules;
- candidate instructions;
- consent text;
- accommodation/contact path if supported.

Explain the effect of each setting. Do not add scary proctoring switches that do nothing.

Always show a candidate-facing preview of:

- estimated total time;
- number of simulations in the pack;
- permitted tools and AI;
- data captured;
- final deliverables;
- timer behavior;
- what happens after submission.

The system must support a calm accommodation/extension path at the invitation or session level if hard timing is enabled. Never infer disability or require sensitive medical disclosure inside the simulation flow.

### Step 6 — Review and publish

Provide a complete read-only review with edit links back to each step. Include:

- role and outcomes;
- scenario timeline;
- resources;
- rubric;
- duration and AI policy;
- candidate preview.

Actions:

- `Save draft`
- `Preview simulation`
- primary `Publish simulation`

Publishing changes persisted status and opens the invitation flow. Never use a fake success toast without saving data.

If publishing a role pack, freeze the ordered list of simulation definition versions. Candidates should see pack progress between simulations and be able to resume between modules when allowed. Completed module submissions must remain immutable even if a later module is not completed.

## Applied-technical simulation product: the MVP wedge

Fydell’s product is not a landing-page mockup surrounding a generic multiple-choice test. Build a shared simulation engine and 30 polished, working micro-simulation templates across exactly six related roles:

1. Data Analyst
2. Business Intelligence Analyst
3. Solutions Engineer
4. Implementation Consultant
5. Technical Support Engineer
6. Business Systems Analyst

This is one coherent wedge: people who must understand an ambiguous operational or customer problem, inspect technical evidence, make a judgment, and communicate an actionable next step. The common evidence model makes the platform scalable; the role-specific artifacts and work make it credible.

Do not include active templates for finance analysts, FDEs, software engineers, marketers, sales representatives, designers, or generic cognitive/personality testing in this release. Do not rename an old FDE or finance scenario and leave its content underneath. Remove obsolete role content from seed scripts, screenshots, routes, copy, filters, demos, and database defaults.

### One simulation versus one role record

Each micro-simulation should take approximately 5–8 focused minutes. It measures a narrow slice of job-relevant behavior and produces one `Work Receipt`. It must never claim to establish a candidate’s total ability by itself.

Employers can use:

- one simulation for a focused screen;
- two simulations for a balanced core role pack;
- three simulations for deeper evidence.

Candidate portable records can accumulate multiple receipts. A role record should show coverage across different competencies and contexts instead of averaging everything into a universal score.

### Shared workbench module registry

Build role templates as data/configuration over a shared registry of real workbench modules:

- `brief_viewer` — objective, constraints, business context
- `resource_viewer` — documents, definitions, diagrams, messages, policies
- `data_grid` — filterable/sortable bounded dataset with accessible table behavior
- `metric_dictionary` — definitions, owner, grain, inclusion/exclusion rules
- `query_runner` — allowlisted SQL-like queries against a seeded local/server dataset, only if genuinely executable
- `chart_inspector` — accessible chart plus underlying table and metric metadata
- `log_viewer` — search/filter logs with timestamps, severity, service, and request IDs
- `api_explorer` — readable documentation, request builder, deterministic response fixtures
- `requirements_matrix` — customer need, priority, source, status, ambiguity
- `timeline_board` — tasks, dependencies, owners, dates, and editable priority
- `risk_register` — risk, likelihood, impact, owner, mitigation
- `ticket_console` — customer report, reproduction details, history, SLA, linked logs
- `process_mapper` — bounded workflow steps and handoffs; not a freeform design tool
- `decision_matrix` — options, constraints, tradeoffs, recommendation
- `stakeholder_chat` — bounded authored or provider-backed conversation
- `ai_assistant` — separately labeled, policy-controlled built-in AI
- `notes_editor` — autosaving private working notes
- `deliverable_editor` — structured or written final response with explicit requirements

Every rendered control must work. If `query_runner`, `api_explorer`, or `process_mapper` cannot be implemented reliably, use a smaller functional module that preserves the intended decision. Never ship a decorative IDE, fake terminal, fake spreadsheet, fake chart builder, or fake integration test.

Each module implements a typed interface for:

- definition schema;
- initial state;
- permitted candidate actions;
- validation;
- emitted evidence events;
- autosave/restore;
- read-only preview;
- report rendering;
- keyboard and screen-reader behavior.

The candidate runtime loads modules by type from the versioned simulation definition. Adding a new template must not require a new route or a copied session engine.

### High-fidelity workbench requirements

The shared engine does not mean every role receives the same layout. Build one stable shell and compose role-specific workspaces inside it.

#### Visual and interaction character

The simulation should resemble a serious internal operations tool:

- flat, aligned work regions rather than floating rounded cards;
- one 1 px divider system;
- restrained 8–12 px radii only where a contained control needs them;
- compact 13–15 px product typography with strong contrast;
- tabular numbers for data, logs, timestamps and scores;
- semantic status colors used sparingly;
- one primary cobalt action treatment;
- no purple glow, gradient border, glass panel, giant empty space, oversized marketing headline or tiny uppercase label repeated on every panel;
- no decorative fake browser chrome;
- no gamification, badges, point counters or progress celebration;
- no default component-library demo appearance; and
- no dense feature added merely to look enterprise.

At desktop size, use a deliberate grid with shared edges. The top command bar and task rail remain stable while the central workspace changes by task. Opening a resource should not create another nested card in the middle of a card. Use tabs, split panes, drawers and inspector panels with clear hierarchy.

The candidate must always know:

- the objective;
- what changed;
- where source evidence lives;
- which artifact they are editing;
- what must exist before submission;
- whether work is saved; and
- how to ask for help or an accommodation.

Do not show hidden competency names, points, quality hints or “good question” feedback.

#### Data and table workbench

For Data Analyst and BI work:

- render real accessible HTML tables from structured rows, not Markdown text pretending to be a table;
- support sort, filter, column visibility and bounded search where relevant;
- keep column headers sticky inside the table viewport;
- show row counts before and after filters;
- retain filters after task switches and refresh;
- allow a candidate to pin or cite rows into notes or a finding;
- provide data type and metric definition metadata;
- show source freshness, grain and owner when relevant;
- include a keyboard-reachable clear-filter action;
- expose the same data to screen readers without virtualized-row loss; and
- emit semantic events such as filter_applied, rows_cited, metric_definition_selected and reconciliation_submitted.

Never grade that a filter was clicked. Grade whether the candidate reached and supported a correct or defensible finding.

If a query surface is used, it must execute a deliberately bounded query language against a seeded dataset. Provide helpful syntax errors, a reset action, result table and query history. Do not render Monaco or a fake SQL editor solely to look technical. If the task does not require query construction, a tested filter/pivot interface is better.

#### Chart and metric workbench

Charts must be investigable rather than decorative:

- tooltips with exact values;
- underlying data table;
- metric formula and denominator;
- date range and data freshness;
- compare or segment controls only when they affect real data;
- annotations for known instrumentation changes;
- accessible summary and table; and
- a way to cite the current chart state into the final artifact.

Do not score chart hover behavior. Score the interpretation, selected comparison, recognized definition or verification.

#### API and log workbench

For Solutions Engineer and Technical Support work:

- show concise API documentation with authentication, limits, request fields, error cases and examples;
- provide an actual deterministic request builder when a request action is promised;
- validate inputs and return fixture-backed status, body, headers, latency and request ID;
- preserve request history;
- let candidates copy a request ID or cite a response;
- use a log table with time, service, level, request ID and message fields;
- support search by request ID plus relevant filters;
- preserve correlations across ticket, API response and logs;
- show no fake streaming lines or random noise; and
- emit semantic request_executed, log_filter_applied, request_correlated, hypothesis_recorded and validation_completed events.

The scenario truth must determine results. Repeating the same request produces the same result unless the definition explicitly models state. Candidate input must not be executed as arbitrary server code.

#### Requirements and decision workbench

For Solutions Engineer, Implementation Consultant and Business Systems Analyst work:

- render requirements as structured rows with source, priority, status, confidence and unresolved question;
- allow authorized candidate actions such as classify, map, mark unknown, assign owner, cite evidence and add a decision note;
- make conflicts visible without naming the correct resolution;
- support a bounded option matrix with criteria and tradeoffs;
- retain an audit-friendly before/after diff;
- show the curveball as a new or changed requirement, not a detached alert; and
- emit requirement_changed, conflict_identified, option_compared, owner_assigned and recommendation_committed events.

Do not award points for filling every cell. Grade correctness, coverage of critical requirements, treatment of unknowns and decision quality.

#### Timeline, dependency and risk workbench

For Implementation Consultant work:

- use a compact table/Gantt hybrid or dependency list that remains usable without drag-and-drop;
- allow date, owner, dependency, priority and launch-scope changes;
- validate impossible dependency cycles and explain the input problem without revealing the desired plan;
- recalculate the critical path or launch readiness when state changes;
- show a structured risk register linked to tasks;
- allow defer, mitigate, accept and escalate decisions with rationale;
- support keyboard alternatives to every drag interaction; and
- emit dependency_changed, launch_scope_changed, risk_updated and plan_checkpoint_saved events.

Do not confuse visually moving a task with good planning. Grade the resulting dependency logic, prioritization and risk handling.

#### Ticket and incident workbench

For Technical Support Engineer work:

- show the customer report, environment, reproduction history, SLA and affected scope;
- connect ticket IDs to request/log evidence;
- provide controlled reproduction steps or request fixtures with deterministic outcomes;
- allow severity, impact, hypothesis, next test and escalation-package fields;
- validate required handoff fields without judging correctness in the candidate UI;
- distinguish customer-facing reply from internal engineering notes; and
- emit hypothesis_created, reproduction_run, severity_selected, escalation_prepared and customer_update_drafted events.

The evaluator should recognize systematic investigation. It should not reward maximum action count or punish a candidate who reaches the answer with fewer safe checks.

#### Process and access workbench

For Business Systems Analyst work:

- use a structured node-and-handoff model with accessible list/table editing;
- allow candidate changes to steps, owners, systems, rules, exceptions and controls;
- preserve traceability from stakeholder need to requirement to system action to validation case;
- support current-state and proposed-state comparison;
- validate disconnected steps and impossible ownership states;
- render access roles, permissions and approvals as a readable matrix; and
- emit handoff_changed, exception_defined, requirement_traced, access_scope_changed and validation_case_added events.

Do not build a fragile freeform canvas if a structured workflow editor provides more reliable evidence.

#### Stakeholder workspace

The stakeholder panel must feel like a real bounded work conversation:

- visible name, role and relationship to the scenario;
- persistent thread;
- message delivery and retry states;
- no fake typing delay longer than the actual response operation;
- no suggested “best questions” in a scored attempt;
- a clear distinction between facts the stakeholder knows, does not know and must escalate;
- relevant follow-up behavior when the candidate asks a compound or ambiguous question;
- no leakage of hidden rules; and
- a candidate-controlled close/collapse state that never discards the draft.

Score question quality from specificity, decision relevance and information gained, not from keyword matches or message count.

#### Notes and final artifact

Working notes and the final artifact are different:

- notes are private to the candidate unless the preflight explicitly states otherwise;
- the final artifact is what the employer receives;
- candidates can cite resources, rows, requests, requirements or messages into the final artifact;
- citations remain linked after submission;
- the final artifact uses a role-appropriate schema rather than one universal textarea;
- autosave never moves the cursor or replaces manual text;
- AI insertion is explicit and reversible;
- review shows every required field and source citation; and
- submission freezes the exact artifact plus module states used by the evaluator.

Examples of role-specific final artifacts:

- finding, calculation, caveat and next analysis;
- canonical metric definition and dashboard correction;
- requirements summary, integration recommendation and customer update;
- launch plan, risk decisions and executive status;
- diagnosis, reproduction, escalation package and customer reply;
- target workflow, requirement trace and UAT plan.

#### Workspace layout by role

Use these defaults, adapting responsively:

| Role | Primary center | Supporting pane | Final artifact |
| --- | --- | --- | --- |
| Data Analyst | data/chart investigation | metric definitions and stakeholder | finding memo with cited rows/metrics |
| BI Analyst | dashboard/model inspector | requirements and ownership | definition/correction proposal |
| Solutions Engineer | requirements plus API/log tools | customer stakeholder and architecture facts | technical recommendation plus customer update |
| Implementation Consultant | timeline/dependencies and risks | scope, owners and stakeholder | launch/recovery plan |
| Technical Support Engineer | ticket, reproduction and logs | runbook and customer thread | diagnosis/escalation and customer response |
| Business Systems Analyst | workflow and requirements trace | system/access constraints and stakeholders | future-state requirement package |

Do not force all six into the same three columns when a different composition better serves the work. Keep navigation, save behavior, task state and accessibility consistent while allowing the workbench itself to differ.

#### Simulation quality gate

A template cannot be described as customer-ready until a reviewer can answer yes to all of these:

- Does the workspace require the candidate to do recognizable work from the target role?
- Do the controls change real structured state?
- Can the scenario be completed without guessing what the UI wants?
- Is there more than one defensible path where real work permits it?
- Are source facts internally consistent?
- Does the stakeholder reveal only authored facts in response to relevant questions?
- Does the curveball materially change a requirement, risk or decision?
- Can the evaluator cite the final artifact and meaningful process evidence?
- Can an accurate concise candidate outperform a polished inaccurate candidate?
- Does refresh restore the exact work state?
- Can every action be completed with keyboard and assistive technology?
- Does the interface remain professional at 390, 768, 1024 and 1440 px?
- Is there any control that exists only to make the screen look technical?
- Does the candidate payload contain any hidden answer, weight or rubric detail?
- Would a hiring manager recognize the report evidence as useful for an interview or decision?

If any answer is no, fix the task, module, evidence design or UI before adding visual polish.

### Role 1 — Data Analyst

Role evidence focus:

- frames ambiguous business questions;
- interprets metric definitions and data grain;
- investigates anomalies without overclaiming;
- notices data-quality and cohort issues;
- communicates findings, caveats, and next analysis clearly.

The five curated Data Analyst templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| Retention anomaly investigation | Inspect weekly retention by cohort, detect a denominator inconsistency, ask which cohort rule is authoritative, and react to a late tracking change | data grid, metric dictionary, stakeholder chat, notes | finding + caveat + next analysis | metric reasoning, clarification, uncertainty, communication |
| Funnel drop diagnosis | Compare acquisition-to-activation steps, identify that one apparent drop is caused by an instrumentation change, and prioritize the real business risk | chart inspector with underlying table, event definitions, stakeholder note | ranked diagnosis with one verification step | causal restraint, prioritization, data-quality judgment |
| Experiment readout | Review a small A/B result with uneven exposure and a secondary-metric regression; decide whether to ship, extend, or stop | experiment table, metric definitions, decision matrix | decision and tradeoff memo | statistical judgment at product level, risk awareness, clarity |
| Revenue dashboard mismatch | Reconcile two dashboards using different booking/refund dates and grains | two accessible tables, metric dictionary, requirements note | reconciled explanation and owner action | grain awareness, definition alignment, stakeholder communication |
| Executive metric request | Turn a vague “show engagement” request into a measurable definition, choose a small metric set, and state limitations | stakeholder chat, metric catalog, decision matrix | proposed metric definition and validation plan | discovery, scope control, business translation |

Implementation details:

- Seed small, internally consistent datasets that can be inspected within minutes.
- Make filters and sorting deterministic and record meaningful actions without treating every click as intelligence.
- Provide the underlying values for every chart.
- Do not require obscure statistics, LeetCode, or memorized syntax.
- Where a correct numeric conclusion exists, calculate it from source data on the server or a tested deterministic evaluator.
- Distinguish analytical correctness from communication quality and evidence coverage.

### Role 2 — Business Intelligence Analyst

Role evidence focus:

- translates stakeholder questions into reliable reporting definitions;
- understands dimensions, measures, grain, and source ownership;
- diagnoses dashboard and data-model issues;
- prioritizes requirements and governance;
- communicates reporting tradeoffs to nontechnical partners.

The five curated Business Intelligence Analyst templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| KPI definition dispute | Reconcile Sales and Finance definitions for “active customer” and expose the reporting consequences | stakeholder messages, metric dictionary, sample rows, decision matrix | canonical definition proposal + unresolved question | requirements discovery, governance, impact reasoning |
| Broken executive dashboard | Trace why a regional revenue tile double-counts customers after a join change | chart inspector, model-grain notes, sample joined table | root cause and safe correction | data-model reasoning, validation, clarity |
| Reporting requirements triage | Prioritize eight dashboard requests against decision value, source readiness, and delivery capacity | requirements matrix, stakeholder chat, prioritization workspace | ordered backlog with rationale | stakeholder judgment, scope, prioritization |
| Self-service access design | Decide which metrics and dimensions can be safely exposed to managers with different access needs | data catalog, access policy, requirements matrix | access/report design with risks | governance, usability, risk judgment |
| Data freshness incident | Investigate a stale dashboard, identify upstream ownership and affected decisions, and communicate recovery status | pipeline status, timestamps, owner map, incident note | internal recovery plan + stakeholder update | operational reasoning, ownership, incident communication |

Implementation details:

- BI scenarios must be distinct from Data Analyst scenarios: emphasize reporting contracts, semantic definitions, governance, dashboard reliability, and stakeholder requirements.
- Use accessible model/grain explanations; do not require proprietary BI-tool familiarity.
- Allow the candidate to inspect exact source, refresh, and ownership metadata.
- Reports should cite definition choices, validation steps, and stakeholder tradeoffs—not merely the final dashboard answer.

### Role 3 — Solutions Engineer

Role evidence focus:

- conducts targeted technical discovery;
- maps customer requirements to product/API capability;
- reads documentation and logs;
- identifies integration, security, and operational risk;
- communicates technical tradeoffs without overpromising.

The five curated Solutions Engineer templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| Integration readiness review | Reconcile customer requirements, API constraints, authentication, logs, data residency, and deadline pressure | API explorer, log viewer, requirements matrix, stakeholder chat | customer recommendation + next steps | discovery, integration reasoning, risk, communication |
| Discovery call follow-up | Identify missing requirements in a vague enterprise use case and decide what must be validated before a demo | stakeholder chat, product capability sheet, requirements matrix | discovery summary and demo plan | question quality, scope, customer judgment |
| Security architecture objection | Respond to an SSO/data-retention concern using supplied architecture and policy facts without inventing commitments | architecture resource, policy excerpts, decision matrix | accurate response + escalation items | technical accuracy, trust, escalation judgment |
| API performance tradeoff | Diagnose rate-limit and batching constraints for a high-volume workflow | API docs, request fixtures, log viewer, option matrix | recommended integration pattern | systems reasoning, tradeoff analysis, clarity |
| Demo recovery | Recover after a seeded demo workflow fails, isolate likely cause, decide what to show next, and communicate calmly | demo state, logs, runbook, stakeholder message | recovery action + customer-facing explanation | troubleshooting, prioritization, credibility |

The `Integration readiness review` is the flagship simulation specified in depth below.

### Role 4 — Implementation Consultant

Role evidence focus:

- converts contracted scope into a workable launch plan;
- identifies dependencies, owners, and scope risks;
- manages migration/configuration decisions;
- adapts plans when constraints change;
- communicates status and tradeoffs to technical and executive stakeholders.

The five curated Implementation Consultant templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| Launch recovery plan | Review a slipping plan, ownership gaps, and a deadline change; reprioritize launch-critical work | timeline board, owner matrix, risk register, stakeholder chat | recovery plan + executive update | dependency reasoning, prioritization, communication |
| Data migration readiness | Assess source quality, mapping gaps, cutover constraints, and validation ownership | mapping table, issue log, timeline, requirements matrix | go/no-go conditions and migration plan | completeness, risk, validation planning |
| Scope-change negotiation | Evaluate a late customer request against signed scope, technical feasibility, and launch impact | scope document, requirements matrix, stakeholder chat | option set and recommendation | boundary setting, tradeoffs, customer management |
| Configuration workshop | Turn conflicting stakeholder preferences into a documented target workflow | process mapper, stakeholder messages, decision matrix | configured workflow decision log | facilitation judgment, process reasoning, clarity |
| Adoption risk response | Diagnose low readiness across training, ownership, and process change shortly before launch | readiness data, stakeholder notes, risk register | adoption actions with owners and sequencing | change judgment, prioritization, executive communication |

Implementation details:

- Make timeline and dependency changes functional and reflected in the final submission.
- Ensure the candidate can distinguish launch-critical from deferrable work.
- Do not score charisma or “executive presence.” Score the observable plan, questions, tradeoffs, and written communication.

### Role 5 — Technical Support Engineer

Role evidence focus:

- gathers reproducible facts before guessing;
- interprets logs and system behavior;
- triages severity and customer impact;
- selects safe troubleshooting and escalation steps;
- communicates incidents accurately and empathetically without unsupported promises.

The five curated Technical Support Engineer templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| Authentication failure triage | Use ticket details and logs to isolate a token-expiry/configuration issue and request one missing fact | ticket console, log viewer, runbook, stakeholder chat | diagnosis, next step, customer response | reproduction, log reasoning, question quality |
| Intermittent API error | Correlate request IDs and timestamps, separate customer and platform causes, and decide whether to escalate | ticket console, log filters, status history | escalation decision + evidence package | technical triage, evidence completeness, judgment |
| Severity and SLA decision | Evaluate business impact and affected scope against a supplied severity policy | incident facts, SLA policy, stakeholder message | severity classification and immediate actions | impact reasoning, policy application, prioritization |
| Bug reproduction handoff | Turn a vague report into minimal reproduction steps and an engineering-ready handoff | ticket history, environment details, test controls | reproducible bug report | systematic investigation, technical writing |
| Incident communication update | Respond when an outage estimate changes and a stakeholder asks for certainty the data cannot support | incident timeline, current facts, communication guide | customer update + internal next step | honesty, uncertainty, clarity, escalation |

Implementation details:

- Troubleshooting actions must have deterministic consequences or explicit authored results.
- Provide search/filter in logs and preserve request IDs across resources.
- Never score friendliness from tone or emotion. Evaluate whether the response is accurate, appropriately scoped, actionable, and respectful.
- Avoid rewarding random trial-and-error; capture whether actions follow a reasonable hypothesis and whether the candidate verifies the outcome.

### Role 6 — Business Systems Analyst

Role evidence focus:

- maps workflows and handoffs;
- elicits and resolves functional requirements;
- identifies system, access, and integration constraints;
- translates between business operations and technical implementation;
- plans validation and communicates change impact.

The five curated Business Systems Analyst templates:

| Template | Candidate work | Functional surfaces | Final deliverable | Primary evidence |
| --- | --- | --- | --- | --- |
| Order workflow redesign | Find bottlenecks and ambiguous ownership in an order-to-fulfillment flow | process mapper, stakeholder notes, system constraints | future-state workflow + open questions | process reasoning, discovery, clarity |
| Automation requirement review | Decide which manual steps can be automated safely and define exception handling | process map, requirements matrix, rule catalog | automation requirements and exceptions | systems judgment, edge-case awareness |
| Access-control change | Reconcile least-privilege policy with business approval needs | role matrix, access policy, stakeholder chat | access model recommendation | risk, requirements, governance |
| Integration prioritization | Rank proposed system integrations by operational value, readiness, dependency, and effort | integration inventory, dependency view, decision matrix | sequenced roadmap with rationale | prioritization, system dependencies, tradeoffs |
| UAT defect decision | Review conflicting user-acceptance defects and decide what blocks launch versus what can follow | defect table, acceptance criteria, timeline, stakeholder note | launch recommendation and defect plan | requirements traceability, risk, communication |

Implementation details:

- Process and requirements modules must be bounded enough to work reliably.
- Record which requirements the candidate clarified, changed, or left unresolved.
- Reports should show traceability from stakeholder need to requirement to recommended system action.
- Do not turn the role into generic project management; retain systems, workflow, access, integration, and validation content.

### Template quality and release rules

Every one of the 30 templates must satisfy all of these:

- Uses internally consistent fictional names, dates, numbers, requirements, systems, resources, and answers.
- Can be completed from invitation through submission and produces a real evidence report.
- Fits its intended 5–8 minute duration in timed internal testing; if not, simplify or change the estimate.
- Contains one clear job-relevant objective, 2–5 usable resources, one ambiguity that rewards clarification, one technical/analytical issue, one meaningful stakeholder interaction or decision, one material update/curveball, and one concise final deliverable.
- Uses only working modules from the shared registry.
- Has authored deterministic content and evaluation fixtures so it works without an external model.
- Maps every candidate action used for evaluation to a typed event and anchored rubric.
- Includes expected evidence, counterevidence, insufficient-evidence conditions, and confidence rules.
- Separates objective checks from interpretive evidence and human review.
- Tells candidates what tools and AI are permitted before starting.
- Avoids trivia, trick questions, hidden cultural knowledge, personality inference, facial/voice/emotion analysis, and punitive surveillance.
- Supports preview, autosave, refresh recovery, keyboard use, screen-reader labels, final review, idempotent submission, report generation, and employer reopening.
- Has tests for the normal path, one incomplete path, one resume-after-refresh path, one submission-retry path, and one evaluator edge case.
- Can be duplicated and customized through the builder without mutating the global template.

Before release, create a template QA matrix with 30 rows and these columns:

- template ID and version;
- role;
- runtime duration tested;
- resources validated;
- modules exercised;
- curveball trigger tested;
- rubric coverage;
- deterministic fallback tested;
- report citations verified;
- responsive QA;
- accessibility QA;
- pass/fail and blocker.

No template may be labeled Active until its row passes.

### Public presentation of the wedge

The public site should state that Fydell is starting with applied technical roles and name all six roles on the homepage’s focused role matrix and on the Employers or Product page. Keep the presentation compact and unified so this reads as one specialized market, not six disconnected landing-page wedges.

Do not lead public copy with “30 simulations” or “five per role.” Lead with realistic work and inspectable evidence. Quantity belongs in the authenticated template library; externally, specialization is proof only when the product screens show the actual artifacts and workflow.

## How every simulation works

The simulation experience is the core product and must receive the highest visual, interaction, and engineering quality. It should feel like a compact real-work environment, not an online quiz, survey, chatbot, form wizard, or fake desktop.

### Session state machine

Model the lifecycle explicitly:

`invited → accepted → preflight → ready → in_progress → review → submitting → submitted → report_processing → report_ready`

Supported alternate states:

- expired invitation;
- revoked invitation;
- preflight blocked;
- paused between role-pack modules;
- session recoverable;
- timed out;
- withdrawn;
- submission received but report failed;
- superseded report after an authorized regeneration.

Define valid transitions on the server. A client refresh, duplicate click, stale tab, or retry must not create a second attempt or double submission.

### Invitation acceptance

The invitation page shows:

- employer/company identity from real workspace data;
- role and simulation/pack name;
- why the candidate was invited;
- estimated time for each module and total;
- expiration;
- permitted AI/tools;
- what activity is recorded;
- what the employer receives;
- what the candidate may add to a portable record;
- privacy, consent, and contact/accommodation paths;
- primary action `Continue to preflight`.

Do not reveal rubric answers or score weights. Do not require a resume. If authentication is required, make the transition clear and preserve the invitation token safely.

### Preflight

Preflight is short, useful, and functional:

1. Confirm candidate display name and invitation identity.
2. Check supported browser capabilities actually required by the simulation.
3. Explain autosave, timer behavior, resource panels, final submission, and AI policy.
4. Request consent for the specific events captured.
5. Provide a 30–60 second untimed interaction sample using the actual controls.
6. Show `Start simulation` only when required checks and consent are complete.

Do not ask for camera/microphone/device fingerprinting unless implemented and essential. Do not create fake “security scans.” If clipboard/window visibility is recorded, disclose it before start and distinguish observed events from conclusions.

### Candidate simulation shell

The candidate workspace should use a precise dark work canvas to distinguish focused work from the light public and employer interfaces. It must remain opaque, readable, and utilitarian—deep ink, neutral panels, cobalt focus/action, semantic warning colors. No neon gradient, purple glow, glassmorphism, star field, or gaming effects.

At 1440 px:

**Top command bar, 52–60 px**

- Fydell wordmark;
- role and simulation name, truncated safely;
- module progress, such as `1 of 2`;
- calm remaining-time display;
- autosave state: `Saving…`, `Saved`, `Save failed — Retry`;
- `Help` with instructions and support path;
- `Exit`, which explains whether the session can resume.

**Left task rail, approximately 220–260 px**

- `Brief`;
- ordered tasks with neutral completion states;
- `Resources` count;
- `Activity` or `Changes` only when it helps the candidate review their own work;
- no score, points, competency labels, or hidden-evaluation hints.

**Central workbench, flexible**

- current objective and constraints;
- the active role-specific module;
- working notes or structured response;
- inline validation tied to completion requirements;
- enough space to inspect real artifacts without tiny text.

**Right context panel, approximately 300–360 px when open**

- stakeholder conversation;
- built-in AI assistant in a separate labeled tab if allowed;
- relevant resource detail or task guidance;
- resizable/collapsible with persisted preference.

Use one border grid and aligned panel edges. Avoid floating cards and excessive shadows. A candidate should visually understand which region contains instructions, evidence/resources, work, and communication.

At 1024 px, allow the right panel to overlay or collapse. At 768 px and below, use persistent tabs for Task, Resources, Work, and Stakeholder; preserve all unsent text and scroll positions when switching. Recommend desktop before start for complex modules, but implement a coherent non-destructive mobile view.

### Simulation opening sequence

When the candidate starts:

1. Server records the authoritative start time and definition version.
2. The candidate sees the brief and objective—not a cinematic animation.
3. The first task is active and resources are available according to the definition.
4. The timer starts once and derives from server time.
5. The client begins batched autosave and event delivery with retry/offline indicators.

Do not hide essential context behind a tour after the timer has begun. Do not spend the candidate’s time on decorative transitions.

### Task design

Each task has:

- a short action-oriented title;
- one clear objective;
- visible completion requirement;
- relevant resources;
- the role-specific working surface;
- optional stakeholder action;
- a deliverable or explicit decision;
- a mapping to evidence events that is invisible during the session.

Tasks should be non-linear where the work benefits from it. Candidates may inspect resources and revise notes before submitting. Do not force a Next button after every small click merely to resemble a form wizard.

Use task states:

- Not started
- In progress
- Complete
- Needs attention

`Complete` means the required artifact exists; it does not reveal quality. `Needs attention` should identify a missing deliverable, not hint at the right answer.

### Resource behavior

Resources open in a stable panel or workbench tab and support:

- readable headings and normal-size text;
- search for long text/logs when useful;
- table sorting/filtering where promised;
- copy only when allowed;
- accessible nonvisual equivalents for charts/diagrams;
- persistent open state and scroll position;
- clear source/title/date metadata.

Record resource-open events and meaningful interactions, but do not infer comprehension from dwell time alone.

### Stakeholder conversation

Stakeholder chat exists to reveal discovery and communication judgment.

- Define the stakeholder’s role, goals, known facts, unknown facts, tone boundaries, and disclosure rules in the simulation definition.
- Candidate questions can be free text.
- The response engine first classifies intent against a bounded set of authored facts and branches.
- If a model provider is configured, provide only the scenario knowledge base and conversation context; validate the response for role, scope, leakage, and safety.
- If confidence is low or the provider fails, use a deterministic clarification or authored fallback—not an unrelated generic answer.
- Never reveal rubric anchors or tell the candidate whether a question was “good.”
- Persist candidate question, response, branch/intent, source facts used, timestamp, and provider/fallback state.
- Allow retry only for technical delivery failure, not to reroll a stakeholder answer.

Suggested questions may be offered in the untimed demo but should be disabled or clearly optional in evaluated sessions, because clicking a suggested “perfect” question weakens the evidence.

### Built-in AI use

AI use is part of modern work and must be handled transparently.

Policies:

- `Allowed and recorded`
- `Allowed for selected tasks`
- `Not available in this session`

When available:

- label the AI assistant separately from the scenario stakeholder;
- state what context the AI can see;
- store prompts, responses, timestamps, and insertion/copy actions;
- let candidates edit rather than auto-submit AI output;
- record incorporation only when the product can observe a copy/insert or clear textual relation; do not pretend to know private reasoning;
- evaluate verification, adaptation, and judgment—not whether AI was used at all.

Do not block browser access or claim to detect every external AI tool unless this is genuinely implemented. Report the configured policy and observed in-product use; label everything else `Not measured`.

### Curveball behavior

A curveball must change the work, not merely add surprise.

Trigger it by one of:

- elapsed server time after the candidate has had a fair opportunity to inspect the initial context;
- completion of a specified evidence-producing action;
- entry into a specified task.

The trigger rule is defined and tested per template. When delivered:

- show a calm persistent update banner;
- add the update to the task/resource context;
- announce it accessibly;
- record the exact delivery time and trigger;
- let the candidate revise prior work;
- never erase existing notes or responses;
- show the update in the final review.

Evaluation should examine what changed between pre- and post-curveball work. Do not reward change for its own sake; retaining a recommendation can be correct if the candidate explains why.

### Notes, drafts, and deliverables

- Notes autosave separately from final deliverables.
- Final deliverables may be structured fields, a decision matrix, a prioritized plan, a query result, or a concise memo depending on the role.
- Character limits, if used, show remaining count and serve a real communication constraint.
- Rich text should be limited to necessary formatting; do not add an unreliable full document editor.
- Preserve undo for local text editing and never overwrite a candidate’s manual work with AI output.
- All persisted revisions need not be shown to employers, but meaningful final-answer revisions may be represented as evidence with privacy-conscious excerpts.

### Timing and autosave

- Server time is authoritative.
- Client shows a calm countdown, not a rapidly changing red stress element.
- At 20% remaining, show a neutral notice; at 5% remaining, show a clear warning.
- On timeout, preserve all saved work and follow the configured rule: submit saved work or allow an explicitly granted extension.
- Use optimistic local editing with debounced persistence and a durable retry queue.
- Show offline/reconnecting state when detectable.
- On refresh or browser restart, restore the correct task, resources, drafts, panel state, curveball state, and remaining server-derived time.
- Never reset the timer or duplicate events on refresh.

### Candidate review and submission

The `Review and submit` screen lists:

- each task and whether its required deliverable exists;
- unresolved `Needs attention` items;
- the curveball/update;
- final response previews;
- the employer’s AI policy;
- confirmation that submission is final.

Allow candidates to return to any task while time remains. Submission:

1. requires explicit confirmation;
2. uses an idempotency key;
3. freezes the attempt exactly once;
4. records server receipt time and final artifacts;
5. closes further writes;
6. queues report generation;
7. returns a durable confirmation even if report generation is delayed.

After submission show:

- `Submission received`;
- employer/company and role;
- timestamp;
- what happens next;
- whether a work receipt will be available and under what privacy state;
- support/contact path.

Do not reveal employer-only evaluation, arbitrary scores, or celebratory claims.

### Role-pack flow

For two- or three-simulation packs:

- show total pack progress before starting;
- keep each module’s timer, events, and submission isolated;
- allow a configurable short untimed transition screen;
- allow resume between modules if the employer policy permits;
- do not reopen an already submitted module;
- show which modules are complete;
- generate an individual work receipt per module and a role-pack report that summarizes coverage without erasing module-level evidence.

### Runtime error and recovery states

Design and implement:

- resource failed to load;
- autosave failed;
- network disconnected;
- stakeholder response failed;
- AI provider unavailable;
- session opened in a second tab;
- invitation expired/revoked;
- attempt already submitted;
- report still processing;
- server/client clock disagreement;
- permission denied.

Each state explains what is safe, what was preserved, and the next action. Never strand the candidate on an indefinite spinner or tell them to restart and lose work.

### Simulation UI acceptance criteria

- The interface remains legible and stable for the full session.
- Every panel, tab, resize control, filter, message action, and submit action works.
- Candidate text survives refresh and recoverable network failure.
- The candidate can complete every template using keyboard only.
- No employer score/rubric answer is exposed in the client payload.
- The client receives only resources and rules needed for the active definition/session.
- Time cannot be reset by refresh or a second tab.
- Stakeholder and AI are visually and semantically distinct.
- The curveball changes real context and is cited in the report.
- No action is interpreted beyond what the captured evidence supports.
- At 390, 768, 1024, and 1440 px, no work is lost or hidden behind inaccessible panels.
- The finished workspace looks like a purpose-built applied-technical work environment, not a reskinned form or generic AI chat.

## Flagship working simulation

Implement one exceptionally polished, end-to-end simulation that proves the product. Additional role templates may exist, but this one must be complete and fully interactive.

### Scenario

**Role:** Solutions Engineer  
**Scenario:** Integration readiness review  
**Fictional customer:** Northstar Logistics — explicitly marked as a fictional scenario company inside demo data  
**Configurable duration:** default 8 minutes; supported template range 5–10 minutes

The candidate is preparing a recommendation for a customer that wants to connect an operations platform to an API before a fixed launch date. The materials contain conflicting volume estimates, an authentication requirement, sample error logs, an incomplete data-residency constraint, and a stakeholder message pushing for an immediate commitment.

### Candidate objectives

1. Identify the information that is missing or contradictory.
2. Ask the customer stakeholder targeted clarifying questions.
3. Inspect the provided API excerpt and logs to identify the main integration risk.
4. Choose a recommended path and explain its tradeoffs.
5. Respond to a new constraint introduced during the session.
6. Draft a concise customer-facing update with next steps.

### Resources

Create realistic, internally consistent resources:

- customer brief;
- short API authentication and rate-limit documentation;
- sample request/error log;
- implementation timeline;
- internal note containing a risk that should not be stated carelessly to the customer.

Resources must be readable, searchable where appropriate, and usable at normal browser sizes. Do not embed walls of tiny text in images.

### Exact flagship flow

The runtime should make the work achievable but demanding within eight minutes:

1. **Orient — approximately 45 seconds.** Read the objective, customer brief, deliverable, and permitted-AI policy.
2. **Discover — approximately 90 seconds.** Review the requirements matrix and ask up to several free-text stakeholder questions. The key ambiguity is whether production traffic originates in the EU and whether data residency applies to payloads, logs, or both.
3. **Investigate — approximately 2 minutes.** Inspect the API authentication excerpt, rate limits, and request/error logs. The main evidence should indicate an expired token refresh/configuration problem plus a likely burst-rate issue. The candidate should not need to write production code.
4. **Decide — approximately 90 seconds.** Use the decision matrix to choose among immediate full launch, phased integration, or delay pending validation, and state tradeoffs.
5. **Adapt — approximately 60 seconds.** Receive the EU-residency and accelerated-deadline update. Revise or defend the path with a concrete change.
6. **Communicate — remaining time.** Write a concise customer-facing update with recommendation, facts, unknowns, validation steps, owners, and next checkpoint.

The UI must not hard-lock those minute allocations; they are scenario design targets. Candidates can move among tasks while time remains.

### Flagship evidence map

| Competency | Observable evidence | Strong anchored behavior | Counterevidence / limited evidence |
| --- | --- | --- | --- |
| Technical discovery | stakeholder questions, requirement edits | asks targeted questions before committing and explains why the answers affect architecture | proceeds on assumptions; asks only broad questions; no opportunity because chat failed |
| Integration reasoning | API/log interactions, decision artifact | connects authentication/rate-limit facts to the proposed pattern and verification step | names a risk without source evidence; relies on unsupported product claims |
| Risk judgment | selected option, tradeoffs, curveball revision | separates knowns from unknowns, protects customer deadline without overpromising, and names escalation/validation | promises feasibility; treats every risk as blocking; ignores residency change |
| Customer communication | final update | concise, accurate, actionable, states owners and next checkpoint | exposes careless internal language, overstates certainty, or omits action |
| Adaptability | pre/post update artifacts | changes the plan where the new constraint matters or explicitly justifies retaining it | merely repeats the original answer; change cannot be evaluated because no pre-update artifact exists |
| AI/tool judgment | AI prompts, inserted text, verification actions when allowed | uses tools to accelerate work, verifies facts against supplied sources, and edits output to fit the customer | copies unsupported output; no evidence if AI is unavailable or unused |

Use `Insufficient evidence` when the required opportunity was absent or failed technically. Do not convert missing data into a low score.

### Adaptive behavior

The stakeholder chat must respond within a bounded scenario knowledge base. The candidate can ask free-text questions or use optional suggested prompts. Responses should be relevant to the question and should not reveal every answer immediately.

At the midpoint or after a meaningful candidate action, introduce this kind of curveball:

> The customer now confirms that EU data must remain in-region and the launch date has moved forward by one week.

The event must alter the remaining task context. Record when it appeared and how the candidate revised or retained the recommendation.

If no reliable live model is configured, implement deterministic intent matching and authored response branches so the demo still works consistently. Never show a fake typing animation followed by a generic response unrelated to the candidate’s question.

### Candidate workspace

Use a focused professional interface:

- top bar: Fydell, role, remaining time, saved state, and a clear exit action;
- left rail: Brief, Resources, Activity;
- central workspace: current task, notes, analysis, and final response editor;
- right panel: stakeholder conversation and optional tracked AI assistant, separated clearly;
- progress: task completion without revealing scoring;
- autosave: visible `Saving…`, `Saved`, and recoverable error states.

Do not show scoring while the candidate is working. Do not use game-like points, celebratory confetti, surveillance icons, or pressure-inducing red timers until a calm final warning threshold.

Support keyboard navigation and resizable/collapsible panels without trapping focus. On smaller screens use tabs or stacked panels with preserved state. Recommend desktop for the best experience, but never render a broken mobile screen.

### Submission

Before final submission, show a concise review of completed and incomplete deliverables. Require explicit confirmation. After submission:

- freeze the attempt;
- persist final responses and event history;
- show a calm confirmation page;
- explain what happens next;
- generate or queue the evidence report with a real status state;
- never strand the candidate on a spinner.

## Evidence and event capture

Record meaningful product events with timestamps and session IDs, using a typed schema:

- simulation started, resumed, and submitted;
- module entered, completed, and resumed for role packs;
- task viewed and completed;
- resource opened and time spent, within reasonable technical accuracy;
- data/log filters, queries, API fixture requests, timeline changes, risk/requirement edits, ticket actions, and decision selections emitted by working modules;
- stakeholder question and response;
- candidate note or answer revision;
- built-in AI prompt, response, and whether output was incorporated where detectable;
- curveball delivered;
- relevant window visibility changes only if consented and implemented;
- autosave and submission status.

Do not capture excessive or hidden behavioral data. Explain captured events in candidate-facing language. Avoid pseudo-precision such as interpreting mouse movement as confidence or grit.

Every event must contain:

- immutable event ID;
- schema version;
- organization, definition version, invitation, attempt, session, module, and actor references as applicable;
- server-received timestamp and client-occurrence timestamp when useful;
- typed event name;
- validated payload with no unexpected fields;
- correlation/idempotency key for retried writes;
- source module;
- consent/policy version where relevant.

Preserve raw submitted artifacts separately from derived report interpretations. Never rewrite the source event stream when a report is regenerated. If an evaluator interpretation changes, create a new report version with its evaluator/prompt/rubric versions and keep the original evidence references stable.

Do not send the entire event stream to the browser on employer dashboards. Query only the aggregates and excerpts required for the current screen. Protect candidate notes or draft content according to the disclosed evidence policy; do not surface private scratch work if the candidate was told only final artifacts and meaningful revisions would be reviewed.

## Evaluation and report-generation pipeline

Build evaluation as an inspectable pipeline, not one opaque model call.

### Stage 1 — Submission integrity

- verify the attempt is submitted and immutable;
- verify the simulation definition/rubric version;
- verify required artifacts and event ordering;
- detect missing or failed module evidence;
- record technical limitations such as an unavailable stakeholder response;
- produce an evidence-coverage map before making qualitative judgments.

### Stage 2 — Objective checks

Run deterministic, tested checks where possible:

- numeric conclusions against seeded data;
- selected requirement/risk/owner fields;
- query or request results;
- referenced log facts;
- timeline dependency consistency;
- required deliverable fields;
- contradictions against scenario ground truth.

Store the check, inputs, expected condition, result, and evidence IDs. Do not treat one wrong number as proof of an unrelated competency.

### Stage 3 — Behavioral evidence extraction

Build candidate-level evidence units from:

- targeted questions;
- decisions and stated rationale;
- artifact changes before and after the curveball;
- verification actions;
- final response excerpts;
- observed in-product AI use;
- counterevidence and unresolved gaps.

Each unit has a concise observation, source IDs, task context, relevance to one or more rubric anchors, and whether it is direct evidence, supporting context, counterevidence, or a technical limitation.

### Stage 4 — Anchored rubric interpretation

For each competency:

1. Load only the relevant rubric anchors and evidence units.
2. Compare observed behavior with anchored levels.
3. State supporting evidence and counterevidence.
4. Return one of anchored levels 0–4, an explicitly justified half-step, or `Insufficient evidence`.
5. Return confidence `High`, `Moderate`, or `Limited` with a specific reason.
6. Generate a concise human-readable interpretation.

When an LLM is used, require schema-validated structured output, use bounded retries, and store model/provider/prompt/schema versions server-side. The model must not make protected-class, personality, emotion, honesty, employability, or final hire decisions. It must not use evidence outside the disclosed session record.

Provide deterministic report fixtures so the application and tests work when no provider key exists. In a real submitted attempt without a configured evaluator, show `Report processing unavailable` with an authorized recovery path; do not present fixture analysis as if it evaluated the candidate.

### Stage 5 — Coverage and summary

Compute evidence coverage from configured opportunities and captured usable evidence, not from candidate quality. For example:

- `Strong coverage` — most configured competencies have direct evidence and no critical technical gaps;
- `Partial coverage` — some competencies lack direct evidence or a module failed;
- `Limited coverage` — the report cannot support a broad interpretation.

Generate strengths, risks/gaps, and follow-up questions only from competency interpretations and citations. The summary must preserve uncertainty and contradictory evidence.

### Stage 6 — Human review

The report begins `Unreviewed`. A reviewer can:

- assign themselves or another real workspace member;
- add a note;
- mark a competency interpretation as agreed, questioned, or needs follow-up;
- record an interview question/result if that workflow exists;
- set a human decision: Advance, Hold, Decline, or No decision.

Fydell never automatically advances or rejects a candidate. Store reviewer, timestamp, and change history.

## Advanced simulation measurement and 1–100 scoring system

This section is mandatory and supersedes any simpler scoring behavior elsewhere in the repository. The objective is not to manufacture more score values. The objective is to create enough valid job-related evidence, grade it consistently, and preserve enough uncertainty information that an integer score with one-point resolution across 0–100 can be useful and defensible.

### What the score means

Call the primary number the **Fydell Evidence Score**.

It means:

> How strongly this submitted work met the explicit, job-related performance criteria configured for this exact simulation or role pack, given the usable evidence captured.

It does not mean:

- the probability that the person should be hired;
- the percentile of the candidate against a population unless a real norm sample exists;
- the candidate’s intelligence, personality, honesty, grit or total professional ability;
- guaranteed future job performance;
- a score that can be compared across unrelated roles or unequated simulation versions; or
- an automatic employment decision.

The employer may use the score as one structured input alongside the cited work, interview and other job-related information. Fydell must retain the employer’s human decision as a separate field and must never rewrite the evidence score to match that decision.

### Required score outputs

Every completed analysis returns these separate outputs:

1. **Overall Evidence Score:** an integer from 0 to 100 when minimum scorable coverage is met, with meaningful results able to land at 1, 2, 3 and every other one-point increment rather than only a few coarse totals. A technically unscorable attempt receives no numeric score rather than a fake zero.
2. **Competency scores:** integer 0–100 scores for each configured competency with its own coverage and confidence.
3. **Evidence coverage:** 0–100%, measuring how much of the planned evidence opportunity produced usable evidence. Coverage is not performance.
4. **Scoring confidence:** High, Moderate, Limited or Unscorable, derived from evidence availability, scorer reliability, evaluator agreement and technical integrity. Confidence is not performance.
5. **Plausible score range:** shown only after the template has enough calibration data to estimate measurement error. Before that, show “Range not yet calibrated,” not a fabricated interval.
6. **Critical-risk flags:** explicit job-related failures that require attention even when the weighted overall score is strong.
7. **Evidence citations:** every indicator result links to the exact artifact, action, question, message, query, decision or deterministic check that supports it.
8. **Scoring provenance:** simulation version, rubric version, scoring-engine version, evaluator version, analysis-run ID and review state.

The interface must be capable of displaying every integer score, not just a few point totals. Do not force each simulation definition to contain questions whose visible points add to 100. The 100-point scale is an output transformation over a higher-resolution internal model.

### SimulationDefinitionV2 measurement contract

Create one versioned contract shared by the builder, runtime, scoring engine and report. At minimum it contains:

- definition ID and semantic schema version;
- organization/global ownership and immutable published version;
- role key and job-analysis reference;
- tested duration range;
- candidate-safe brief, tasks, resources and workbench layout;
- module definitions and allowed state transitions;
- deliverable schema;
- stakeholder knowledge and disclosure rules;
- curveball rules;
- AI/tool policy;
- competency specifications;
- evidence opportunities;
- scoring indicators;
- deterministic grader configurations;
- anchored rubric definitions;
- critical-risk rules;
- minimum scorable coverage;
- calibration status;
- accessibility and accommodation metadata;
- candidate-safe projection rules; and
- report-renderer configuration.

An **evidence opportunity** defines a real chance for the candidate to demonstrate something. It includes:

- stable ID;
- task and module context;
- competency;
- observable job behavior;
- evidence types that can satisfy it;
- whether the opportunity is required, optional or conditional;
- when it becomes available;
- how technical failure is detected;
- candidate-omission policy;
- weight within the competency;
- grader type;
- anchored quality levels;
- counterevidence rules;
- criticality;
- source citations expected in the result; and
- test fixtures representing strong, mixed, weak, omitted and technically unavailable cases.

Do not begin with “what can we track?” Begin with “what job behavior must this task elicit?” Then implement the smallest interaction that produces direct evidence of that behavior.

### Evidence-quality hierarchy

Prefer evidence in this order:

1. **Validated artifact outcome:** a calculation, query result, mapping, prioritization, configuration, test result, plan or decision that can be checked against scenario truth.
2. **Validated work process:** a meaningful action sequence, hypothesis test, requirement edit, comparison, verification or adaptation captured by a functioning workbench.
3. **Candidate explanation:** a final rationale or stakeholder message evaluated against explicit anchors and checked against supplied facts.
4. **Supporting interaction context:** resources consulted, questions asked and tool use that clarify how the artifact was produced.
5. **Weak telemetry:** clicks, dwell time, focus changes and raw edit counts. These must not affect performance score.

A weaker signal cannot override stronger contradictory evidence. For example, mentioning “verify” does not earn verification credit if the candidate never performs or proposes a relevant check. Opening a log does not earn troubleshooting credit if the final diagnosis contradicts the log. Asking many questions does not earn discovery credit if none targets a decision-relevant unknown.

### Indicator grading methods

Each scoring indicator declares one of the following methods. Do not use one universal grader.

#### Deterministic exact or rule-based grader

Use for facts with a genuinely correct result:

- numeric calculation;
- data reconciliation;
- query output;
- selected log/request IDs;
- access rule;
- dependency relation;
- severity classification against a supplied policy;
- API request behavior against a deterministic fixture;
- required artifact completeness; or
- contradiction with scenario ground truth.

Store the evaluated input, expected rule, tolerance, outcome, quality value and evidence IDs. Rules must be authored and unit-tested per template.

Binary checks are allowed only when the work is truly binary. Do not make an entire 30-point competency depend on one binary answer.

For numeric work, use a template-authored scoring function based on the business meaning of error. It may include:

- full credit inside a defensible tolerance;
- partial credit for the correct method with a bounded arithmetic error;
- lower credit for directionally correct but decision-changing error;
- zero for an answer that would produce the wrong business action; and
- a separate reasoning indicator when the method is observable.

Do not apply one generic percentage-error curve to every number. A one-unit error can be immaterial in one scenario and critical in another.

For selection tasks, use authored positive, negative and critical option weights when false positives have different consequences. Generic F1 may be reported as a diagnostic statistic, but it is not the universal production score.

#### State or artifact-diff grader

Use when the work is a structured artifact:

- requirements matrix;
- decision matrix;
- timeline or dependency board;
- risk register;
- ticket handoff;
- process map;
- API request configuration;
- dashboard definition;
- data transformation; or
- pre/post-curveball plan.

Grade the semantic final state and meaningful diffs, not DOM events. Examples:

- correct dependencies and owner assignments;
- coverage of must-have requirements;
- unsafe versus safe access scope;
- launch-critical versus deferrable work;
- whether a revised plan actually addresses the new constraint;
- whether a reproduction isolates the variable that caused the failure.

The grader must be able to reconstruct its result from stored module state and versioned rules.

#### Anchored rubric grader

Use when multiple responses can be valid and quality depends on judgment:

- discovery question quality;
- tradeoff reasoning;
- customer or executive communication;
- uncertainty handling;
- prioritization rationale;
- escalation judgment;
- adaptation; and
- AI/tool verification.

Each indicator has behaviorally specific anchors at 0, 1, 2, 3 and 4:

- **0 — Absent or harmful:** no relevant evidence, materially incorrect, unsafe, deceptive or nonresponsive.
- **1 — Limited:** notices part of the issue but misses critical facts, gives an unsupported conclusion or produces an unusable action.
- **2 — Developing:** substantially relevant but incomplete, weakly supported or insufficiently prioritized.
- **3 — Effective:** correct, supported, job-appropriate and actionable with only minor omissions.
- **4 — Exceptional for this bounded task:** integrates the important evidence, handles tradeoffs and uncertainty, and produces an unusually clear and safe action.

Template authors must replace those generic descriptions with indicator-specific observable anchors and examples. Half-step values may be used only when the evidence genuinely falls between adjacent anchors and the evaluator explains why. Never ask an evaluator for an unconstrained “score from 1 to 100” on prose.

#### Human-review grader

Use for indicators that cannot yet meet automated reliability thresholds. Provide a fast structured review interface:

- evidence on the left;
- indicator and anchors on the right;
- required anchor selection;
- optional note;
- counterevidence;
- reviewer identity and timestamp;
- blind second-review mode for calibration; and
- adjudication when reviewers disagree materially.

A real human-review requirement is better than a fake instant automated score. Reports can show “Awaiting review” while deterministic components are ready.

### Performance computation

Keep calculation pure, deterministic after indicator ratings are fixed, and covered by property tests.

For each active indicator j:

- wj is its published positive weight;
- qj is performance quality from 0.00 to 1.00;
- aj describes evidence availability;
- cj identifies a candidate omission;
- tj identifies a technical or platform-caused absence.

Apply these rules:

1. If the opportunity was presented and the candidate omitted the required response, keep the indicator in the performance denominator with qj = 0. This is a performance result.
2. If the opportunity never appeared or failed because of a Fydell technical problem, exclude it from the performance denominator and reduce coverage/confidence. Do not punish the candidate.
3. If an opportunity was conditional and its condition never occurred for a legitimate path, mark it not applicable and exclude it from both score and planned coverage.
4. If usable evidence exists, assign qj from the configured deterministic grader, artifact grader or anchored rubric.
5. Do not multiply performance by source reliability. Scorer reliability affects confidence and review requirements, not the candidate’s ability.

Compute:

**Performance ratio = sum of wj × qj over scorable indicators divided by sum of wj over scorable indicators.**

**Display score = round 100 × performance ratio to the nearest integer, clamped to 0–100.**

Internally retain at least four decimal places and round only for display. Use one documented rounding rule everywhere. The same submitted evidence, simulation version, rubric version and scoring-engine version must always yield the same display score.

Do not add a baseline of 50. Do not add points merely for completing the session. Do not deduct points twice for the same underlying mistake. Do not normalize a weak attempt upward because it has low coverage.

### Achieving genuine one-point resolution

One-point resolution must emerge from many bounded indicators, not from fake decimal output.

Each micro-simulation should generally contain:

- 12–24 scoring indicators;
- no single noncritical indicator worth more than roughly 10% of the overall score;
- at least two independent evidence sources for every major competency where the task duration permits;
- a mixture of deterministic, artifact and anchored evidence;
- enough weight variation that nearby but meaningfully different performance paths can produce nearby integer results; and
- no indicator based solely on a generic click, word or elapsed time.

Before publication, enumerate representative response paths that should land across the range: exceptional, strong, solid, borderline, weak, harmful, incomplete and technically limited. Confirm that the engine can distinguish them and that a one-level improvement in an indicator never lowers the score.

Do not artificially guarantee that all 101 values appear in a tiny fixture set. Require that the model has one-point output resolution and that observed score clustering is explained by candidate performance, not by a handful of binary checks.

### Coverage and scorable thresholds

Coverage measures usable planned evidence, not effort and not quality.

For each evidence opportunity, count:

- 1.0 when the opportunity appeared and usable evidence or a candidate omission was recorded;
- between 0 and 1 only when the definition explicitly supports partial opportunity coverage;
- 0 when the opportunity was lost to technical failure; and
- excluded when legitimately not applicable.

Compute weighted coverage across planned opportunities. Store competency-level and overall coverage.

Default reporting rules:

- **80–100% coverage:** a numeric overall score may be displayed if critical competencies also meet minimum coverage.
- **60–79% coverage:** a numeric score may be displayed only with Limited confidence and a prominent evidence-gap note; the employer cannot enable automatic thresholds from it.
- **Below 60% coverage:** no overall numeric score. Show “Insufficient scorable evidence,” the available competency observations and a retry/review path.
- **Critical competency below 50% coverage:** flag that competency as insufficient even if overall coverage is higher.

Templates may set stricter thresholds, never weaker ones without documented justification. A candidate leaving a required task blank counts as a scored omission, not a platform coverage failure. An API outage, missing resource or broken chat branch counts as a platform failure.

### Competency and overall weights

Competencies derive only from their mapped indicators. They do not inherit the overall score when no evidence exists.

For each competency:

- indicator weights sum to 1.00 inside the competency;
- compute the competency performance ratio using the same missing-evidence rules;
- compute coverage and confidence separately;
- display an integer competency score only when its minimum coverage is met; and
- show cited support, counterevidence and gaps.

Overall competency weights sum to 1.00 for a simulation or role pack. Validate the sum at publish time and in the scoring engine.

Do not average module scores equally unless the published role-pack definition explicitly gives them equal weight. A role pack should weight evidence opportunities and competencies, not merely take the mean of three top-line numbers.

### Critical-risk logic

Some errors matter more than a weighted average suggests: inventing a security commitment, recommending destructive data deletion, exposing data outside a stated residency rule, assigning unsafe access or declaring the wrong incident severity against an explicit policy.

Critical rules must be:

- job-related;
- defined before the candidate attempt;
- tied to exact evidence and scenario facts;
- narrow enough to avoid subjective surprise;
- disclosed to the employer in the rubric configuration;
- invisible as an answer key to the candidate; and
- tested for false positives.

A critical result does not secretly alter individual indicator ratings. It creates a visible flag and may cap the report’s readiness state at “Human review required.” If the product applies a numeric cap, the cap and triggering rule must be explicit in the score breakdown and versioned; prefer the visible flag plus human review so the arithmetic remains interpretable.

### Flagship Solutions Engineer score map

For the Integration readiness review, use this initial 100-weight evidence blueprint. Refine weights only through documented SME review and calibration; do not alter them to make demo candidates look better.

| Competency | Indicator | Weight | Primary grader | Evidence |
| --- | --- | ---: | --- | --- |
| Technical discovery | Identifies contradictory traffic-volume facts | 5 | deterministic/artifact | requirements matrix edits and cited sources |
| Technical discovery | Asks for decision-relevant residency scope | 6 | anchored rubric | candidate question and stakeholder fact returned |
| Technical discovery | Clarifies production traffic origin and deadline | 5 | anchored rubric | questions, requirement state and final known/unknown list |
| Integration reasoning | Diagnoses token refresh/configuration issue | 8 | deterministic plus rationale anchor | log evidence, API facts and diagnosis |
| Integration reasoning | Identifies burst-rate constraint | 7 | deterministic/artifact | request fixture, rate calculation and pattern selection |
| Integration reasoning | Proposes a testable integration pattern | 8 | artifact plus anchored rubric | request configuration and validation plan |
| Risk judgment | Separates supported facts from unresolved claims | 7 | contradiction checks plus rubric | decision memo and customer update |
| Risk judgment | Chooses a path proportionate to the evidence | 8 | anchored rubric | decision matrix, tradeoffs and requirements |
| Risk judgment | Avoids unsupported security/residency commitment | 6 | deterministic critical rule | customer-facing response |
| Adaptability | Notices what the curveball changes | 6 | state-diff grader | pre/post requirement and plan diff |
| Adaptability | Revises or defends the plan coherently | 6 | anchored rubric | revised decision and cited rationale |
| Verification | Performs or specifies relevant validation | 7 | artifact/deterministic | test request, reconciliation or validation checklist |
| Customer communication | States a clear recommendation | 5 | anchored rubric | final update |
| Customer communication | Uses accurate evidence and calibrated certainty | 6 | contradiction checks plus rubric | final update citations and wording |
| Customer communication | Names owners, next action and checkpoint | 5 | structured artifact checks | final update |
| Tool judgment | Uses supplied tools or AI without importing unsupported claims | 5 | event/artifact comparison | prompts, inserted text, edits and final evidence |

These weights total 100. The candidate does not see them. Each row must be decomposed into indicator-specific anchors and tests. If AI is unavailable or unused, Tool judgment is evaluated from the candidate’s use of supplied product tools and verification behavior; AI use itself is never required.

The report must make the arithmetic reconstructable. For example, it may show that a candidate earned 4.0 of 5 weighted points on one indicator because the response was rated 3.2/4 after adjudication, but the customer-facing UI should lead with the anchor description and evidence rather than a wall of decimals.

### Language-model evaluation protocol

Use deterministic and structured methods first. A language model may interpret open-ended evidence only under this protocol:

1. **Evidence assembly:** load only the submitted artifacts, semantic events, scenario facts, relevant rubric indicators and candidate-safe conversation record. Exclude protected attributes and unrelated profile data.
2. **Fact extraction:** extract candidate claims, recommendations, cited facts, unknowns, actions and contradictions with evidence IDs. Do not score yet.
3. **Indicator grading:** grade one bounded indicator set at a time against its behavior anchors. Require rating, supporting IDs, counterevidence, missing evidence and explanation.
4. **Consistency check:** compare the proposed rating with deterministic checks and scenario ground truth. A model cannot overrule an exact contradiction without flagging adjudication.
5. **Independent second pass:** for material open-ended indicators, run a second grading pass with randomized evidence order or a separate configured evaluator. Do not expose the first rating.
6. **Adjudication:** if ratings differ by more than one anchor level, a critical rule conflicts, citations are invalid or confidence is low, route the indicator to another evaluator or human review.
7. **Schema validation:** reject output with unknown competencies, out-of-range ratings, missing citations, fabricated event IDs, unsupported claims or invalid JSON.
8. **Versioning:** store provider, model, prompt template, schema, rubric and evaluator versions with the run.

Do not ask the model to infer personality, emotion, deception, confidence, cultural fit, intelligence, age, disability, race, national origin, religion, sex or any other protected or non-job-related characteristic. Do not send names or demographic fields when scoring does not require them.

The model must not produce the overall score directly. It produces bounded evidence observations and anchor ratings. Pure application code computes the score.

If the evaluator provider is unavailable:

- deterministic indicators still run;
- open-ended indicators become Awaiting review;
- the overall result waits or shows insufficient scorable coverage;
- authorized reviewers can complete the structured rubric; and
- demo fixtures are permitted only inside clearly labeled automated tests or demo workspaces, never for a real candidate.

### Scoring confidence

Confidence is derived from measurable scoring conditions:

- evidence coverage;
- proportion of weight graded deterministically;
- inter-evaluator agreement for open-ended indicators;
- citation validity;
- technical integrity of required modules;
- calibration sample size and recency;
- human adjudication status; and
- whether the attempt used a materially changed but not yet recalibrated version.

Do not derive confidence from how decisive the candidate sounded.

Suggested initial logic:

- **High:** coverage at least 90%; all critical opportunities usable; deterministic or calibrated graders cover most weight; no unresolved material disagreement.
- **Moderate:** coverage at least 80%; no critical evidence gap; limited adjudication; graders meet release reliability thresholds.
- **Limited:** coverage 60–79%, an uncalibrated scorer, unresolved noncritical disagreement or a material technical limitation.
- **Unscorable:** coverage below 60%, a critical opportunity failed, corrupted submission or missing evaluator result that prevents interpretation.

Store the reasons, not just the label.

### Calibration and validation program

“Accurate” is a release process, not a code comment. Build a calibration workspace and data model even if initial sample sizes are small.

For every template version:

1. **Job analysis:** document the role task, work outcome, competency and why the evidence opportunity represents the job.
2. **Content review:** at least two qualified role reviewers independently inspect scenario realism, resources, answer conditions, anchors and unnecessary barriers.
3. **Benchmark performances:** create multiple genuinely different strong, acceptable, borderline, weak and harmful submissions. Do not create only perfect and empty fixtures.
4. **Blind double scoring:** have reviewers score the same benchmark set without seeing each other’s ratings.
5. **Automated-versus-human comparison:** compare each automated indicator result with adjudicated human ratings.
6. **Reliability analysis:** compute agreement appropriate to the scale, exact/adjacent agreement, weighted kappa or intraclass correlation where suitable, plus mean absolute score error.
7. **Sensitivity analysis:** perturb one behavior at a time and confirm score direction and magnitude make sense.
8. **Fairness review:** inspect accessibility barriers, language demands unrelated to the job, subgroup outcome differences when lawful data is available, and less discriminatory alternatives.
9. **Outcome validation:** once customers supply consented post-hire outcomes, test whether intended score interpretations relate to relevant job performance. Keep the outcome definition job-related and document limitations.
10. **Version decision:** publish, publish with Limited confidence, require human review or reject the template.

Do not claim predictive validity, norming, percentile standing or validated fairness until the relevant study exists. The product can still have paying customers as a transparent work-sample and structured evidence system while validation data accumulates. Sell the inspectable work and consistency now; earn stronger predictive claims with evidence.

### Minimum automated-scoring release gates

An open-ended indicator may affect a production numeric score only when:

- every returned rating has valid source citations;
- all anchors are behaviorally specific;
- the grader passes strong, mixed, weak, paraphrase, concise, verbose, adversarial and empty-response fixtures;
- keyword stuffing does not improve the score without correct meaning;
- polished but factually wrong writing cannot outscore accurate plain writing;
- names and protected attributes are not inputs;
- evaluator order sensitivity is within the documented tolerance;
- mean absolute error against adjudicated benchmark ratings is within the release threshold set by the assessment owner;
- material disagreements route to review; and
- the scoring owner signs off on the rubric and evaluator version.

Do not invent a universal numerical threshold in code without benchmark data. The calibration dashboard should let the assessment owner set and record the approved threshold per scorer class.

### Score fairness and accessibility

The simulation and score must measure the job behavior rather than avoidable interface barriers.

- Provide an accommodation request path before timing starts.
- Support configurable time extensions that are stored separately from performance and never shown as a negative signal.
- Do not score reading speed, typing speed, mouse movement, camera behavior, facial expression, voice, accent, grammar polish or window focus unless a very specific job-related use has been professionally justified; for this release, exclude them.
- Keep language complexity appropriate to the role and separate technical accuracy from writing polish.
- Ensure screen-reader and keyboard users can produce the same semantic artifacts.
- Provide accessible table, chart, log and diagram alternatives.
- Never adjust individual scores or thresholds based on protected-class membership.
- Build audit exports that let authorized customers evaluate selection rates and adverse impact using lawfully collected data kept separate from ordinary reviewer screens.
- Record assessment and scoring versions so audits are reproducible.

Compliance copy must not claim that Fydell itself makes an employer compliant. Provide configuration, notice, audit and data-export support, then instruct customers to obtain appropriate legal and assessment review for their use.

### Score testing requirements

Replace the current perfect-versus-empty test emphasis with a complete score suite.

#### Pure computation tests

- Same inputs and versions always produce the same score.
- Indicator and competency weights validate exactly.
- Display rounding is consistent at every half-point boundary.
- A higher rating on one indicator with everything else fixed never lowers any affected competency or overall score.
- Changing an unrelated indicator never changes another competency.
- Candidate omission lowers performance; platform failure reduces coverage without lowering performance.
- Not-applicable conditions alter neither performance nor coverage incorrectly.
- No duplicated event or retried request can add score twice.
- One underlying action cannot be counted repeatedly through multiple equivalent indicators unless the rubric explicitly maps distinct aspects.
- Score remains within 0–100 for arbitrary valid inputs.
- All integer outputs are reachable under synthetic valid indicator combinations where the weight design permits.

#### Template fixture tests

For every one of the 30 templates:

- at least three distinct strong paths;
- at least three realistic mid-range paths;
- at least three weak or risky paths;
- concise correct language;
- verbose incorrect language;
- paraphrased correct language with none of the author’s preferred keywords;
- keyword-stuffed incorrect language;
- correct final result with poor method;
- wrong final result with sound partial method;
- candidate omission;
- stakeholder technical failure;
- resource technical failure;
- curveball received and handled;
- curveball received and reasonably rejected;
- allowed AI used and verified;
- allowed AI used and copied with unsupported claims;
- no AI used;
- refresh/retry with duplicate events; and
- human/adjudicator disagreement.

Assert expected score ranges and indicator-level reasons, not one brittle magic total for every fixture.

#### Metamorphic and adversarial tests

- Adding unsupported confident language cannot improve factual accuracy.
- Adding a valid citation to a correct claim can improve the appropriate evidence indicator but not unrelated skills.
- Reordering equivalent sentences does not materially change ratings.
- Candidate name substitution does not change the result.
- Harmless punctuation, spelling and formatting variations do not materially change the result.
- Prompt-injection text inside candidate work cannot change evaluator instructions or reveal hidden rubric content.
- Candidate attempts to claim a fake event ID are ignored.
- A stakeholder question that happens to contain a rule keyword but asks the opposite meaning does not receive strong discovery credit.
- Random resource opening and answer toggling do not increase performance.

#### Distribution tests

Run the full benchmark corpus and inspect:

- score histogram;
- mean, median and standard deviation;
- floor and ceiling rates;
- percentage of exact 0, 50 and 100 results;
- competency correlations;
- confidence distribution;
- unscorable rate;
- evaluator disagreement;
- score change between scorer versions; and
- subgroup selection-rate analysis where lawful and statistically meaningful.

Fail release when the distribution collapses into a few values because of implementation granularity, when nearly every benchmark receives 100, or when template revisions cause unexplained score shifts.

### Score versioning and migration

Implement forward migrations and preserve history.

Add or extend storage for:

- scoring-model versions;
- rubric versions;
- evidence-opportunity definitions;
- indicator results;
- deterministic check results;
- evaluator passes;
- adjudications;
- score calculation snapshots;
- coverage/confidence reasons;
- calibration benchmark sets;
- template validation status;
- report versions; and
- audit exports.

Every analysis run is append-only. Reanalysis creates a new run and report version; it never mutates the prior result. The employer can see why a report was regenerated and which score changed.

Mark current keyword/form analyses with their actual legacy engine identifier. Do not compare legacy and v2 scores as if they are on the same scale. Do not automatically publish a portable credential from an unreviewed or unscorable result.

Create a migration tool that:

- inventories all current micro templates;
- maps reusable scenario content and resources into draft v2 definitions;
- refuses automatic publication;
- reports missing modules, evidence opportunities, anchors, fixtures and candidate-safe projection checks;
- preserves existing sessions on the old renderer; and
- routes only new invitations for a published v2 template into the new runtime.

### Scoring-builder experience

The employer-facing builder must not expose a simplistic “AI decides the score” box.

In the Evidence rubric step, show:

- competencies and total weights;
- evidence opportunities grouped under each competency;
- the real candidate action or artifact that produces each opportunity;
- grader type;
- anchors;
- critical rules;
- missing-evidence behavior;
- sample report output;
- coverage map;
- validation status; and
- warnings for unsupported claims or unmeasurable competencies.

Builder validation blocks publication when:

- weights do not sum correctly;
- an indicator has no producible evidence;
- the candidate payload leaks scoring data;
- a critical competency has inadequate opportunity coverage;
- an open-ended grader lacks anchors or fixtures;
- a workbench action is decorative;
- a template depends on an unavailable provider without a real review fallback;
- expected duration has not been tested; or
- the score distribution fails quality gates.

For the initial curated 30 templates, keep rubric editing restricted to authorized Fydell/admin or expert mode. A customer may change job context, priorities and selected competencies, but cannot casually publish an unvalidated arbitrary scorer. Material rubric changes create a new uncalibrated version and require review.

## Evidence-backed employer report

The report is the centerpiece of Fydell’s credibility. Redesign it as an inspectable decision document rather than a decorative scorecard.

Use a readable report layout:

- compact report header and actions;
- left or top section navigation for Summary, Competencies, Work timeline, Artifacts, AI/tool use, Integrity, and Interview;
- main evidence document;
- optional right citation drawer that opens the exact source without losing reading position.

Do not place every section in an independent rounded card. Use one report sheet with typographic sections, thin dividers, evidence rails, and expandable detail. Keep the report main column readable at approximately 760–900 px while letting the evidence drawer use the remaining desktop width.

### Header

Show:

- candidate or anonymized candidate ID;
- role and simulation;
- completion date and duration;
- report status;
- evidence confidence: High / Moderate / Limited, with an explanation;
- share and export actions that actually work.

Show the Overall Evidence Score prominently enough to answer the employer’s question, but do not let the number dominate or replace the evidence. Place coverage, confidence, critical flags and review status beside it, and make the scale and weighting inspectable.

### Decision summary

Use:

- observed strengths;
- material risks or gaps;
- evidence coverage;
- suggested next hiring step;
- a clear note that the hiring team owns the decision.

### Competency evidence

For each competency show:

- integer competency score when scorable, anchored 0–4 level, or `Insufficient evidence`;
- evidence confidence;
- concise interpretation;
- 2–4 supporting observations;
- clickable citations to the event timeline or candidate response;
- counterevidence or missing evidence where relevant.

Clicking an observation opens a side panel or scrolls to the exact supporting event with task context, timestamp, candidate response excerpt, and rubric anchor.

### Work timeline

Show a chronological evidence timeline of questions, resource use, decisions, revisions, curveball response, and final submission. Support filtering by competency and event type. Use a real timeline or table, not a decorative activity feed.

### Role-specific artifact replay

Show the submitted work in the language of the role:

- Data Analyst: filtered data state, metric definitions used, conclusion, caveat, next analysis;
- Business Intelligence Analyst: metric/reporting definition, model/grain evidence, requirements decision, governance notes;
- Solutions Engineer: requirements, API/log evidence, option matrix, pre/post-curveball recommendation, customer update;
- Implementation Consultant: timeline/dependency edits, risk register, owner changes, recovery plan, status update;
- Technical Support Engineer: reproduction steps, log/request evidence, severity/escalation choice, customer response;
- Business Systems Analyst: current/future workflow, requirement changes, access/integration decisions, validation plan.

Render each with the same read-only module components used in the runtime where practical. Provide a before/after diff for material curveball-driven changes. Do not reduce artifacts to tiny screenshots or long JSON dumps.

### AI and tool use

Show:

- the configured AI policy;
- built-in prompts and outputs if captured;
- how the candidate modified or applied AI output when observable;
- no moralizing “cheating score.”

### Integrity signals

Show only collected signals with plain explanations. Separate `No issue observed`, `Review suggested`, and `Not measured`. Absence of data is not proof of integrity.

### Interview calibration

Generate 3–5 follow-up questions from evidence gaps and tradeoffs. Each question should state what the interviewer should probe and what stronger evidence would sound like.

### Actions

- `Add reviewer note`
- `Assign reviewer` if membership exists
- `Mark follow-up needed`
- human decision: `Advance`, `Hold`, or `Decline`
- `Copy report link`
- `Print / Save as PDF`
- candidate-stage update if the pipeline exists

Every action must persist or produce the promised result. Use browser print styling for PDF if a reliable server PDF export is not available.

Report links must be permissioned, expiring or revocable when externally shared, and free of guessable IDs. Print styles must include evidence citations and methodology context without printing navigation or hidden controls.

## Candidate-owned work record

Create a polished portable record that is visibly different from a resume profile.

Include:

- candidate-controlled display name and visibility;
- verified simulation title, role family, completion date, and issuer;
- demonstrated competencies with linked evidence summaries;
- AI-use policy for the session;
- evidence-confidence labels;
- privacy and share controls;
- revocation or unshare action if supported.

Do not include follower counts, endorsements, generic skill bars, personality traits, or a public leaderboard. A candidate must understand exactly what an employer can see before sharing.

Use the term `Work Receipt` for one verified completed simulation. A receipt includes:

- issuer/company or Fydell template context, based on permission;
- simulation title and definition version;
- role family;
- completion date and approximate duration;
- work context and deliverable;
- the context-specific Fydell Evidence Score, coverage, confidence and scoring version when the result is scorable and the candidate chooses to include it;
- demonstrated evidence summaries with confidence;
- permitted/observed in-product AI use;
- a verification reference that does not expose private raw events;
- privacy state: Private, Link shared, or Visible to approved employers.

A role record groups multiple receipts for one of the six roles and shows evidence coverage by competency and work context. It must not average receipts into a universal 0–100 identity score. Newer or contradictory evidence can coexist; show dates, context, and confidence.

The record page needs:

- candidate-controlled headline limited to factual role focus;
- receipt timeline;
- role coverage view;
- selected evidence excerpts;
- visibility/share controls;
- `Preview as employer`;
- revoke link/share;
- report an error or request review;
- access log only if actually implemented.

The marketplace direction should be visible through a permissioned `Open to opportunities` state only if matching/discovery exists. Do not fabricate employers, job matches, recruiter interest, or network activity.

## Data and backend integrity

Keep Supabase authentication intact. Reuse the current schema when sound; add migrations when required. Do not replace persistent product behavior with `localStorage` unless the existing application is intentionally local-only.

Ensure the data model supports the equivalent of:

- organizations / companies;
- profiles and organization memberships;
- supported role families and role-specific competency sets;
- global curated templates and immutable template versions;
- organization simulations and immutable published versions;
- role packs and ordered pack-version items;
- outcomes and competencies;
- scenario tasks, workbench module definitions, and resources;
- rubrics and anchors;
- invitations and secure tokens;
- invitation recipients and delivery attempts;
- candidate sessions, module attempts, and explicit state transitions;
- typed session events;
- autosave snapshots and final submissions;
- deterministic check results;
- evidence units and evidence references;
- report jobs, report versions, evaluator versions, and report status;
- portable work receipts, grouped role records, and candidate visibility;
- reviewer assignments, reviewer notes, human decisions, and change history;
- report/record share permissions and revocations.

Use immutable published definitions. A completed attempt always points to the exact version the candidate saw. Editing an active simulation creates a draft/new version; it never mutates historical resources, rubrics, curveball rules, or reports.

Recommended domain invariants:

- one active attempt per invitation/module unless an authorized retake is explicitly created;
- one final submission per attempt, protected by an idempotency key;
- events append to a session and cannot be reassigned across attempts;
- report evidence references point only to the same attempt’s immutable events/artifacts;
- one current report version may be designated, while prior versions remain auditable;
- organization decisions and reviewer notes are never written by the candidate;
- candidates control portable-record visibility, not the employer;
- global templates are readable but not mutable by customer organizations;
- demo data is organization-isolated and permanently labeled.

Requirements:

- organization-scoped row-level security;
- candidates can access only their own valid invitation/session and explicitly shared record;
- employers can access only their organization’s simulations, candidates, and reports;
- secure server-side generation and evaluation calls;
- no secret keys in client bundles;
- safe input validation and escaped rendering;
- idempotent save and submit behavior;
- explicit loading, error, retry, and empty states;
- timestamps and status transitions stored consistently;
- indexed queries for dashboard counts, needs-review queues, filters, and evidence timelines;
- storage policies for logos, uploaded job descriptions, and generated exports if those features exist;
- retention/deletion behavior consistent with the real privacy policy;
- migration rollback/backfill planning for existing FDE/finance records without deleting user data;
- no loss of existing production data.

When removing obsolete FDE, finance, Project Relay, or Project Meridian content, distinguish product deactivation from destructive deletion. Archive or migrate historical definitions and keep attempts/reports accessible to authorized owners if real data exists. Remove obsolete seed/demo content only when it is safely identifiable.

If email delivery is configured, send a real invitation email with a secure link. If it is not configured, create the invitation, persist it, and show a copyable secure link with honest copy. Do not display “Email sent” when no message was sent.

## Customer-ready integrations and operational delivery

Fydell must be usable as a standalone hiring workflow and composable with an employer’s existing system. Do not claim named integrations with Workday, Greenhouse, Lever, Ashby or another ATS until the connector is implemented and tested. Build a clean integration foundation that a paying customer can use immediately.

### Minimum integration surfaces

Ship these three real paths:

1. **Hosted workflow:** the employer creates a simulation or role pack, invites candidates in Fydell, and reviews reports in Fydell.
2. **Bulk workflow:** the employer uploads a validated CSV of candidates, receives row-level errors before import, sends or creates invitations, and exports candidate/report status as CSV.
3. **API and webhook workflow:** the employer’s system creates invitations with its own external IDs, receives status/report events, and opens the Fydell report through an authorized link.

Do not require an ATS integration for the first customer to receive value. Do not force every customer to manage candidates twice.

### Public organization API

Create a versioned server API for authenticated organization use. The initial surface should support:

- list published organization simulations and role packs;
- create one or many candidate invitations;
- retrieve invitation and session status;
- revoke or resend an invitation when valid;
- retrieve report status and the final permissioned report;
- attach and search customer-owned external candidate, requisition and application IDs; and
- list recent changes with cursor pagination.

Requirements:

- organization-scoped API credentials stored only as hashes;
- named credentials with scopes, creator, last-used time and revocation;
- no API secret displayed after creation;
- idempotency keys for create operations;
- versioned URL and response schemas;
- stable machine-readable error codes plus human-readable messages;
- cursor pagination and bounded page sizes;
- rate limits with headers and retry guidance;
- request IDs for support;
- audit log entries for credential and write operations;
- explicit UTC timestamps;
- no service-role credential exposed to customers; and
- RLS and server authorization even when a request supplies a valid external ID.

Use external references rather than copying an employer’s entire ATS record. Candidate email and name should not become the universal identity key.

### Webhooks

Support organization-configured HTTPS endpoints for:

- invitation.created;
- invitation.delivered;
- invitation.opened;
- session.started;
- session.submitted;
- report.ready;
- report.requires_review;
- report.reviewed;
- invitation.expired or revoked; and
- candidate work-record sharing only if the candidate explicitly authorizes an employer-relevant event.

Each delivery includes:

- stable event ID;
- event type and schema version;
- organization ID;
- occurred-at timestamp;
- relevant Fydell IDs and customer external references;
- minimal event payload;
- attempt number;
- HMAC signature and timestamp header; and
- link or API reference to retrieve fuller authorized data.

Implement:

- secret rotation with overlap;
- replay protection;
- at-least-once delivery semantics;
- exponential retry with a finite schedule;
- idempotent event IDs;
- delivery history;
- response code and truncated error visibility;
- manual retry;
- pause/disable after repeated permanent failures; and
- a “Send test event” action clearly labeled as a test.

Never mark a webhook delivered before a successful receiver response. Never include hidden rubrics, answer keys, private candidate notes or unnecessary personal data.

### Integration settings UI

Under Settings → Integrations, provide:

- API credential list and create/revoke flow;
- webhook endpoint list and create/edit/disable flow;
- signing-secret reveal only at creation/rotation;
- event subscription selection;
- delivery log with filtering;
- test event action;
- CSV field templates;
- data-mapping documentation;
- environment label such as Production or Test if both genuinely exist; and
- link to concise API documentation generated from the real contract.

Do not show a wall of disabled vendor logos. A generic working API/webhook is more credible than twelve “Coming soon” cards.

### Embedding and candidate handoff

The first release should use a secure hosted Fydell candidate experience. An employer can link to it from an ATS, career site or email. Preserve:

- employer branding within restrained limits;
- requisition/application external reference;
- return URL only from an allowlisted domain;
- invitation identity and expiration;
- candidate authentication or secure handoff;
- accessibility and accommodation paths;
- completion callback through webhook; and
- exact simulation version.

Do not iframe the simulation by default if it weakens authentication, accessibility, focus handling or third-party cookie reliability. If an embed is implemented, treat it as a separate tested integration mode with frame-ancestor policy, postMessage origin validation and full keyboard QA.

### Paying-customer operating requirements

The product is customer-ready only when a company administrator can:

- create the company workspace and invite teammates;
- choose a supported role and configure the evidence needed;
- use a curated simulation or role pack without Fydell manually editing the database;
- preview the exact candidate experience;
- publish an immutable version;
- invite one candidate or import a real cohort;
- understand delivery status;
- support a candidate without seeing or changing their work;
- receive a submitted/report-ready notification;
- review the score, coverage, confidence and cited work;
- add a human decision and export/share the report securely;
- connect status back to its own application ID;
- revoke links and credentials;
- access an audit log; and
- receive clear help when an operational action fails.

Add an organization-level readiness checklist based on real configuration:

- company profile complete;
- at least one active administrator;
- invitation sender/link mode configured;
- published simulation version;
- report reviewers assigned;
- candidate support contact;
- retention policy acknowledged;
- API/webhook optional, not required; and
- no unresolved production configuration error.

Do not make the customer read engineering documentation to complete the normal hosted workflow.

### Supportability

Provide authorized internal tools to find an organization, invitation, session, analysis run and webhook delivery by safe identifier. Support staff must be able to see operational state and errors without seeing hidden candidate data beyond their role.

Include:

- structured server logs with request and correlation IDs;
- error monitoring hooks if a configured provider exists;
- health checks that test dependencies without exposing secrets;
- report-job retry and dead-letter handling;
- webhook redelivery;
- email delivery status;
- safe invitation regeneration;
- audit trail for support actions; and
- production setup documentation that matches the actual environment variables and deployment.

No primary customer workflow may depend on a developer running a seed script, manually editing Supabase, copying a token from server logs or calling an undocumented endpoint.

## Complete interaction contract

Audit every control and enforce this behavior:

| Control | Required behavior |
| --- | --- |
| Logo | Navigate home or to app overview, depending on context |
| Public nav links | Open the named complete page |
| Create a simulation | Preserve return path through auth and open the builder |
| Try the candidate experience | Open the working flagship demo/preflight |
| Sign in / Sign up | Use real auth, validation, recovery, and redirect |
| Dashboard operational count | Open the corresponding real filtered queue |
| Needs-review row | Open the correct report and retain return/filter context |
| Role filter | Filter to one of the six supported roles using real data |
| Template Preview | Load the actual version in non-evaluated preview mode |
| Use template | Create an organization-owned persisted draft from that exact template version |
| Build role pack | Persist ordered selected templates, update total time, and validate one role family |
| New simulation | Create a persisted draft and enter Step 1 |
| Save and continue | Validate, persist, show state, and move exactly one step |
| Back | Move back without clearing entered data |
| Generate scenario | Run a real server action or honest deterministic generator with loading and retry |
| Regenerate section | Confirm overwrite risk, regenerate only that section, and allow undo |
| Preview | Open an accurate candidate preview without corrupting draft state |
| Publish | Persist Active status, confirm success, and open invitation options |
| Simulation count/funnel segment | Open the Candidates tab with the matching state filter |
| Edit active simulation | Create/edit a new version without changing existing assigned attempts |
| Invite candidate | Validate recipient, create invitation, send email if configured, and show result |
| Resend/revoke invitation | Persist delivery or revocation state and explain candidate impact |
| Copy invitation/report link | Use clipboard API with success and failure feedback |
| Search / filter / sort | Modify visible real data and preserve sensible URL or state |
| Row click | Open the correct record without conflicting with row actions |
| Pause / archive / delete | Explain impact, require confirmation where destructive, persist, and allow recovery where practical |
| Start simulation | Create/resume the correct session and begin timing |
| Resource | Open readable content and record the event |
| Workbench interaction | Change real module state, autosave it, emit typed evidence, and restore after refresh |
| Stakeholder send | Persist question, show bounded relevant response, recover from failure |
| AI send / insert | Follow configured policy, persist prompt/response/action, and never auto-submit |
| Curveball | Update remaining task context once, persist trigger/time, and preserve prior work |
| Candidate editor | Autosave, expose saved state, restore content after refresh |
| Submit simulation | Review, confirm, persist once, and show completion state |
| Evidence citation | Open the exact supporting event and context |
| Reviewer note | Persist author, time, and content with edit/delete rules |
| Assign reviewer | Select a real workspace member and persist assignment/history |
| Human decision | Persist authorized actor/time/value; never change automatically |
| Share record | Show visibility before copying or publishing the link |
| Export | Produce a real print/PDF result or remove the control |
| Create API credential | Create one scoped secret, show it once, persist only its hash, and add an audit entry |
| Revoke API credential | Confirm impact, revoke immediately, and preserve the audit history |
| Add webhook | Validate HTTPS URL and event subscriptions, persist it, and offer a signed test event |
| Retry webhook | Re-deliver the same stable event ID and record the new attempt without duplicating the domain event |
| Import candidate CSV | Parse safely, preview valid/error rows, require confirmation, and create only approved invitations |
| Menus/modals | Keyboard accessible, focus trapped/restored, Escape closes, click-outside behavior consistent |

No interactive element may use `href="#"`, `javascript:void(0)`, an empty handler, a console log in place of behavior, or a generic alert as the finished interaction.

Every asynchronous action needs:

1. immediate feedback;
2. a stable loading state that prevents duplicate submission;
3. success confirmation tied to real persistence;
4. a specific, human-readable error with a recovery action;
5. retained user input on failure.

Do not leave controls disabled without explaining what requirement enables them. Prefer showing validation and a clear next step. Disabled elements are not focusable, so any explanation must remain accessible outside the disabled control.

## UX writing system

Rewrite all product copy so it sounds like a confident operator explaining a concrete workflow.

Rules:

- Lead with the user’s action or outcome.
- Use concrete nouns and verbs.
- Keep headings under roughly 10 words when possible.
- Keep body paragraphs to 1–3 sentences.
- Use one term consistently: simulation, candidate, evidence, report, work record.
- Do not alternate among assessment/test/challenge/exercise unless the distinction is real.
- Button labels must name the result: `Publish simulation`, not `Continue`; `Copy invitation link`, not `Done`; `Review report`, not `View`.
- Empty states explain what belongs here and give one primary next action.
- Error messages explain what happened and how to fix it.
- Confirmation copy states what changed.
- Tooltips explain unfamiliar icons or methodology, not obvious labels.
- Avoid exclamation marks unless the moment genuinely benefits from one.
- Avoid founder language, investor language, and future-tense vision copy inside operational flows.

Remove phrases such as:

- “Hire with conviction” when used without concrete explanation;
- “The future of hiring is here”;
- “AI-powered insights”;
- “Unlock top talent”;
- “Revolutionize your hiring process”;
- “Discover the perfect candidate”;
- “Built different”;
- “Welcome to the future of work”;
- “Contact us for a pilot” as the primary CTA;
- “Five simulations available”;
- “What we do not claim.”

## Forms, states, and feedback

- Use visible persistent labels and concise optional hint text.
- Split long transactions into logical steps with one main decision per screen.
- Use appropriate input types, autocomplete attributes, and semantic fieldsets.
- Validate on submit and, where useful, after a field loses focus; do not scold while the user is still typing.
- Show field-level errors and a top summary for multi-field failures.
- Move focus to the error summary after a failed submission and link each error to its field.
- Preserve all valid entries after errors.
- Use skeletons only when page structure is known; use a progress state for generation and report processing.
- Empty states must look intentional, not blank.
- Confirmation modals are reserved for destructive or consequential actions, not every click.
- Toasts are supplemental; important success or failure state must remain discoverable in the page.

## Accessibility

Meet WCAG 2.2 AA across public and product flows.

- Minimum 4.5:1 contrast for normal text and 3:1 for large text and essential non-text UI.
- Visible, high-contrast `:focus-visible` treatment on every interactive element.
- Semantic landmarks, headings in order, real buttons and links, labels, fieldsets, table headers, and status announcements.
- Complete keyboard operation without positive `tabindex` values.
- Logical focus behavior in drawers, menus, dialogs, errors, and route changes.
- Accessible names for icon buttons.
- Do not use color alone to indicate score, status, selection, or error.
- Aim for 44 × 44 CSS px touch targets; never go below WCAG’s minimum target guidance.
- Respect reduced motion.
- Provide accessible timer announcements without repeatedly interrupting screen readers.
- Do not force time limits without an implemented accommodation or extension path where appropriate for a hiring assessment.
- Test at 200% zoom and with text enlargement.

## Responsiveness

Design intentionally for:

- 390 px mobile;
- 768 px tablet;
- 1024 px laptop;
- 1440 px desktop;
- wide screens without stretched, low-density layouts.

Requirements:

- no horizontal page overflow;
- no clipped menus or popovers;
- no unreadably scaled dashboard screenshots;
- no table columns disappearing without an alternate mobile representation;
- simulation panels become tabs/drawers while preserving work and context;
- CTAs remain reachable without covering content;
- sticky elements never overlap headings or form errors;
- public typography scales fluidly without awkward one-word lines.

## Performance and implementation quality

The site cannot feel professional if it is slow or unstable.

- Target p75 Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Target Lighthouse scores of at least 90 for Performance, Accessibility, Best Practices, and SEO on representative public pages, unless a documented third-party constraint prevents it.
- Use server rendering and progressive loading appropriately within the existing framework.
- Optimize and size images; reserve dimensions to prevent layout shifts.
- Subset and preload only required fonts.
- Avoid autoplay video and heavy decorative canvas/WebGL.
- Lazy-load below-fold visuals without delaying the primary product proof.
- Eliminate unnecessary client components, large animation libraries, and duplicated dependencies.
- No console errors, hydration warnings, unhandled promise rejections, or failed network calls in the primary journey.
- Add route-level error and not-found states that match the system.
- Keep TypeScript strict; do not silence real errors with broad `any`, `@ts-ignore`, or disabled lint rules.

## Testing and verification

Do not declare completion after visual changes alone.

### Functional test journey

Automate or manually verify this entire path:

1. Visit the homepage.
2. Use every header and footer link.
3. Create an employer account.
4. Complete company onboarding.
5. Verify the real new-workspace empty state contains no fake data or zero-chart wall.
6. Choose Solutions Engineer from the first-run role selector.
7. Browse all six role filters and all 30 active templates.
8. Preview the Integration readiness template using the real runtime.
9. Create a Solutions Engineer simulation from the template.
10. Edit the scenario, resources, curveball, AI policy, and rubric.
11. Verify the scenario-consistency and rubric-coverage validators.
12. Preview and publish it.
13. Return to the overview and verify active counts from persisted data.
14. Create an invitation.
15. Verify sent-versus-link-created copy matches actual delivery capability.
16. Open the invitation in a candidate context.
17. Complete consent, browser checks, and the untimed preflight sample.
18. Start once and verify server-authoritative time.
19. Ask the stakeholder a targeted and an irrelevant question; verify bounded relevant behavior.
20. Open every resource and use every active workbench control.
21. Use the built-in AI if enabled and verify it is visually separate from the stakeholder.
22. Trigger and respond to the curveball.
23. Draft, autosave, refresh, recover, revise, and review the final response.
24. Submit exactly once, including a duplicate-click/retry test.
25. Open the employer dashboard and verify Reports ready / Needs review updates.
26. Open the generated report.
27. Click every evidence citation and verify exact source context.
28. Inspect the role-specific artifact replay and pre/post-curveball diff.
29. Add a reviewer note, assign a reviewer if supported, and record a human decision.
30. Copy a permissioned report link and use Print / Save as PDF.
31. Open the candidate Work Receipt, preview share visibility, share, and revoke it.
32. Build a two-module role pack, invite a candidate, complete module one, exit, resume module two, and verify isolated submissions plus combined coverage.
33. Run strong, mid-range, weak, omitted and technical-failure scoring fixtures; verify point-level differentiation, evidence coverage, confidence and citations.
34. Improve one scored indicator while holding all other evidence fixed; verify the relevant competency and overall score never decrease.
35. Create a scoped API credential, create an invitation with external references, receive signed webhook events, retrieve report status, and revoke the credential.
36. Import a mixed valid/invalid candidate CSV, correct the invalid rows, and verify no duplicate invitations are created on retry.

Every step must work after refresh where persistence is expected.

### Six-role template verification

In addition to the flagship journey:

- complete all five Data Analyst templates and verify data/metric actions plus numeric checks;
- complete all five Business Intelligence Analyst templates and verify grain, definition, dashboard, and governance artifacts;
- complete all five Solutions Engineer templates and verify requirements, API/log, architecture, and customer artifacts;
- complete all five Implementation Consultant templates and verify timeline, dependency, risk, migration, and status artifacts;
- complete all five Technical Support Engineer templates and verify ticket, log, severity, reproduction, escalation, and communication artifacts;
- complete all five Business Systems Analyst templates and verify workflow, requirements, access, integration, UAT, and validation artifacts.

For each template:

1. complete the intended strong-evidence path;
2. complete or fixture an incomplete/limited-evidence path;
3. refresh during active work and recover;
4. trigger the curveball exactly once;
5. submit with idempotent retry;
6. verify report evidence IDs open the correct source;
7. verify no competency is scored from an event the template cannot produce;
8. verify the candidate-facing UI never exposes rubric answers;
9. verify deterministic scenario behavior without an external provider;
10. verify provider failure falls back or reports a real recoverable error.

### Interaction audit

- Click every button, link, tab, menu item, filter, row action, and icon button on every shipped route.
- Verify loading, success, failure, empty, and permission-denied states.
- Verify Back, refresh, direct URL entry, expired invitation, duplicate submission, and signed-out access.
- Verify first-run, populated, no-results, processing, failed-report, permission-denied, and demo-workspace states.
- Verify dashboard count links and filters agree with direct database-backed lists.
- Verify active simulation edits produce a new version and do not alter prior attempts.
- Verify resend, revoke, expiration, and duplicate-invitation behavior.
- Verify second-tab session handling, offline/reconnect autosave, timeout, and role-pack resume.
- Verify keyboard-only operation.
- Verify focus never disappears behind overlays.
- Verify no control exists solely to imply functionality.

### Visual QA

Capture full-page screenshots at 390, 768, 1024, and 1440 px for all primary routes. Inspect for:

- inconsistent spacing;
- low contrast;
- accidental card repetition;
- border-radius drift;
- incorrect icon alignment;
- awkward line breaks;
- empty vertical gaps;
- text clipping;
- overlays outside the viewport;
- sticky-header collisions;
- broken tables;
- mockup text too small to read;
- repeated generic section composition.

Do not accept a page merely because it is clean. Each page must have a deliberate focal point and a composition suited to its task.

### Code verification

Run the repository’s actual equivalents of:

- install/dependency validation;
- typecheck;
- lint;
- unit/integration tests;
- production build;
- end-to-end tests;
- accessibility scan;
- Lighthouse or performance audit.

Fix failures caused by this work. Do not remove tests, weaken types, or disable rules to obtain a green result.

## Definition of done

The transformation is complete only when all of the following are true:

- A first-time visitor can explain what Fydell does after the hero.
- The homepage proves the product with real UI above the fold.
- The site communicates a serious work-based hiring platform, not a small test library or assessment-software landing page.
- The employer can self-serve from signup to a published simulation.
- The authenticated company dashboard is a complete operational workspace with real counts, needs-review queue, simulations, candidates, reports, invitations, versions, and settings—not a collection of decorative cards.
- The product is visibly and consistently concentrated on exactly six applied-technical roles.
- All 30 curated role templates exist as tested definitions over one shared engine; every template can be previewed, customized, published, completed, and reported.
- Employers can create focused one-simulation screens or two-/three-module role packs without leaving the supported wedge.
- The flagship simulation is realistic, interactive, adaptive, and stable.
- The candidate simulation UI provides working role-specific artifacts, stakeholder interaction, optional recorded AI, autosave, refresh recovery, server timing, curveball, final review, and idempotent submission.
- The report traces every important judgment to inspectable evidence.
- The Fydell Evidence Score has real 1-point output resolution, reproducible weighted arithmetic, separate coverage/confidence, versioned provenance, and no keyword/open-click/revision shortcuts.
- Strong, mixed, weak, omitted and platform-failure attempts produce appropriately different outcomes without punishing candidates for Fydell failures.
- Open-ended scoring uses behaviorally anchored, citation-required evaluation with disagreement review; the model never generates the overall number directly.
- Reports replay role-specific work, preserve missing/contradictory evidence, and leave hiring decisions to authorized people.
- The candidate understands what is captured and can control the portable record.
- One micro-simulation creates one Work Receipt; grouped receipts create contextual role evidence without a universal identity score.
- Every primary button and navigation item performs its promised action.
- There are no placeholder links, dead buttons, fake email confirmations, generic alerts, fake trust claims, or misleading demo data.
- The design has one coherent system but varied page compositions.
- The current repeated black/purple rounded-card aesthetic is gone.
- Text is confident, concrete, readable, and free of generic AI-SaaS language.
- Auth, Supabase persistence, permissions, refresh behavior, and existing working data remain intact.
- A paying customer can use the complete hosted workflow, bulk candidate import/export, and a scoped API/webhook integration without manual database work.
- The application is responsive, keyboard accessible, visually verified, and production-build clean.
- A hiring manager could use the product without being told it is an MVP.
- A YC partner could click through the public site, enter the product, inspect the six-role depth, run the flagship session, review real citations, and see a focused wedge with a believable path from Work Receipts to a hiring marketplace.

## Final delivery behavior

Implement the work. Do not stop at an audit or ask me to choose among several superficial themes. Use the direction above and make high-quality product decisions consistent with the existing stack.

When finished, return only:

1. a concise summary of what materially changed;
2. the routes and flows implemented;
3. the database migrations or environment requirements, if any;
4. the exact verification commands run and their results;
5. any remaining limitation that is genuinely blocked by an external credential or provider.

Do not call the result “MVP polish.” Treat it as Fydell’s first customer-ready product release.
