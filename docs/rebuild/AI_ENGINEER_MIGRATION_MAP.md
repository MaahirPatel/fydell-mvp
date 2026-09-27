# Applied AI Engineer flagship migration map

Status: role-instrument planning only. No runtime, schema, seed, or production path
has been changed.

## Decision

Fydell remains the **Proof-of-Work Network**. The initial wedge changes from
Solutions Engineering to **Applied AI Engineering**.

- Canonical role family: `Applied AI Engineering`
- Primary display role: `Applied AI Engineer`
- Supported aliases: `LLM Engineer`, `AI Product Engineer`,
  `Generative AI Engineer`, `Software Engineer, AI`,
  `Full-Stack AI Engineer`, `Agent Engineer`, `Founding AI Engineer`
- Explicit exclusions: ML Researcher, Research Scientist, Foundation Model
  Researcher, and other roles centered on training or researching foundation
  models
- Buyer: Series A-C founders, CTOs, Heads of Engineering, and AI leaders hiring
  engineers who ship production AI systems

This is not a text replacement. The flagship proof environment changes from
customer discovery, implementation rollout, and sales pressure to diagnosing,
evaluating, changing, and defending a production LLM system.

## Protected boundary

The following remain frozen and retain their historical Solutions Engineer
meaning:

- `src/app/sim/[sessionId]/page.tsx`
- `src/components/sim/WorkbenchRunner.tsx`
- `src/lib/simulations/v2/**`
- `src/lib/simulations/content/**`
- `src/lib/simulations/db.ts` event/state writers
- `sim_session_events` readers and writers
- `src/app/api/sim/sessions/[id]/report/route.ts`
- `src/components/sim/EvidenceReport.tsx`
- `src/components/sim/EvidenceReportV2.tsx`
- `supabase/migrations/001_*` through `025_*`

Historical Solutions Engineer role rows, simulation versions, events, reports,
receipts, and scores are never renamed or reinterpreted. The existing
`se-northstar-v1` identifiers remain Solutions Engineer identifiers.

## Old concept -> new concept

| Old Solutions Engineer concept | New Applied AI Engineering concept |
|---|---|
| Solutions Engineer | Applied AI Engineer |
| Customer rollout | Production AI workflow hardening |
| Technical discovery | System, trace, and failure diagnosis |
| Customer / Sales / Engineering stakeholders | Product requirements, runtime evidence, and engineering constraints |
| Rollout recommendation | Architecture and production-readiness recommendation |
| Security-review changed fact | Deterministic p95 latency requirement |
| Customer communication | Engineering change rationale and production recommendation |
| CRM / SSO integration resources | Application code, orchestration config, schema, traces, eval cases, latency and cost data |
| Adaptation after customer constraint | Measured architecture and evaluation revision after a production constraint |
| SE defense | Candidate-specific engineering tradeoff defense |
| SE Work Receipt | Applied AI Engineering Work Receipt |

## Repository classification

### PRODUCTION HISTORICAL - preserve

| Area | Files / data | Action |
|---|---|---|
| Wave 1 candidate runtime | `/sim/[sessionId]`, `WorkbenchRunner` | No change |
| Production scoring | `src/lib/simulations/v2/**`, `micro-scoring.ts` | No change |
| Published micro simulations | `src/lib/simulations/content/**`, including SE/SSO/security-review content | No change; sessions pin published versions |
| Production event ledger | `sim_session_events`, `recordEvent()`, `listEvents()` | No change; events are scoring inputs |
| Production reports | report API and `EvidenceReport*` | No change |
| Historical schema and seeds | migrations `001`-`025`, including the SE proof seed in `025_proof_graph.sql` | Never edit |
| Historical proof catalog | `proof_roles` SE row, `se-northstar-v1`, `AUTH_001` and related changed facts | Preserve and keep readable |

### PRODUCTION ACTIVE - compatibility decision required

| Area | Files | Required change later |
|---|---|---|
| Canonical role type | `src/lib/simulations/types.ts` | Add an `applied_ai_engineer` member to the existing `RoleKey`; do not create a parallel role type |
| Engine role display | `src/lib/sim-engine/types/roles.ts` | Add Applied AI display metadata while preserving SE |
| Role catalogs | `src/lib/simulations/roles.ts`, `src/lib/contracts/roles.ts` | Make AI the new public wedge without deleting historical SE |
| Proof employer surfaces | `src/app/app/employer/proof/**`, `/api/proof/**` | Resolve role/version from data; remove hardcoded SE display copy |
| Role calibration | `src/app/api/proof/calibration/route.ts` | Stop using one global SE constant before AI role activation |

These files are not part of the first documentation milestone. Changes require
compatibility tests proving legacy role keys still resolve.

### SANDBOX FLAGSHIP / DEMO FIXTURE - migrate

Primary ownership:

- `src/lib/sim-engine/proof/sandbox/fixture.ts`
- `src/lib/sim-engine/proof/sandbox/{analysis,service,world-state,lifecycle,kill-switch}.ts`
- `src/components/sandbox/**`
- `scripts/test-sandbox-contracts.ts`
- `scripts/test-sandbox-live.ts`
- `e2e/sandbox-isolation.spec.ts`

The current `acme-rollout-v1`, Northstar/Acme rollout, security-review fact, SE
competencies, sample evidence, and sample receipt become a newly versioned
Applied AI fixture. Existing fixture identifiers must not silently change
meaning.

### PROOF SPEC / ANALYSIS - replace for the new version

Primary ownership:

- `src/lib/sim-engine/proof/types.ts`
- `src/lib/sim-engine/proof/agents.ts`
- `src/lib/sim-engine/proof/state-machine.ts`
- `src/lib/sim-engine/proof/fixtures.ts`
- `src/lib/sim-engine/proof/sandbox/analysis.ts`
- `services/evidence-engine/evidence_engine/analyze.py`
- `services/evidence-engine/tests/test_fixtures.py`

Current global constants (`PROOF_ROLE_ID`, `PROOF_VERSION_ID`,
`PROOF_ROLE_SLUG`, `PROOF_VERSION_KEY`) are SE-specific. They may not be
relabelled. The implementation must introduce version-aware catalog resolution
and keep old analysis branches available for old runs.

### SIMULATION SPEC / LAB FLAGSHIP - replace or retire as flagship

Primary ownership:

- `src/lib/sim-engine/scenarios/solutions-engineer/**`
- `src/lib/sim-engine/scenarios/catalog.ts`
- `src/components/simulations/sandboxes/SolutionsEngineerSandbox.tsx`
- `src/lib/sim-engine/analysis/analysisEngine.ts`
- `scripts/test-sim-engine-runtime.ts`
- `scripts/test-sim-engine-analysis.ts`

The Northstar CRM failure scenario remains historical lab content unless
explicitly retired. It must not be renamed into an AI scenario. The new scenario
gets its own directory, scenario ID, version, role key, workbench composition,
fixtures, and tests.

### GOLDEN PATH - keep as contract harness, do not grow as a second product

Files:

- `src/lib/sim-engine/golden-path/**`
- `src/components/simulations/golden-path/GoldenPathPilot.tsx`
- `scripts/test-golden-path-*.ts`

The DB-backed `proof/` path remains the intended product persistence path.
Golden-path code may receive AI fixtures for contract tests, but must not become
a second independently evolving UI/runtime.

### MARKETING - migrate after the role instrument

Primary ownership:

- `src/app/page.tsx`
- `src/components/marketing/home/**`
- `src/app/evidence-report/page.tsx`
- current homepage role, proof-gap, evidence, brief, and receipt scenes

The public sequence becomes:

1. Applied AI Engineer Proof Spec
2. Existing Proof
3. Proof Gap
4. Real engineering work
5. New latency constraint and revision
6. Evaluation behavior
7. Defense
8. Evidence lineage
9. Decision Brief
10. Work Receipt

No two consecutive scenes may demonstrate the same primitive or reuse the same
large-dashboard composition with only a different highlight.

### GENERIC COMPONENT - keep generic

Do not migrate unrelated uses of `Acme`, `SSO`, `security review`, `rollout`, or
`North Star`, including:

- Technical Support and Data Analyst scenario content
- BI `North Star` metric language
- generic pricing/security/trust language
- test organizations such as `Acme Pilot`
- renderer registry, event engine, task manager, validation framework, and
  config-driven workbench composition

### STALE / DEAD - evaluate separately

Root-level static HTML, scratch Python, old audit documents, and references to
removed `dashboard-demo.ts` are not part of the role migration. Removal requires
a separate debris audit; they must not be mixed into the flagship change.

## Data impact

### What the current proof graph can represent

- separate role and version identities (`proof_roles`,
  `proof_simulation_versions`)
- deterministic changed facts (`proof_changed_facts`)
- candidate-role-version invitations and runs
- ordered semantic events with server-assigned sequence
- versioned generic artifact payloads
- messages
- durable analysis jobs
- evidence claims and support/counterevidence event edges
- review history
- defense sessions, questions, and responses
- decision briefs and outcomes

### Schema and seed gaps

The current graph is not a clean drop-in for the AI instrument:

1. Migration `025` seeds only fixed SE role/version IDs. The new AI role needs
   new immutable identities and catalog data.
2. `proof_artifacts` has SE-shaped columns (`customer_message`,
   `internal_note`, `recommendation`) rather than first-class workspace files,
   code/config versions, eval runs, or trace inspections.
3. `proof_runs.stage` is constrained to SE-shaped stages such as
   `AUTH_CONSTRAINT`, `STAKEHOLDER_CONFLICT`, and `CUSTOMER_PRESSURE`.
4. Candidate-role proof coverage and links from prior proof sources to a
   requirement are not first-class relationships.
5. Evidence claims store `competency` as text; no foreign key points to a
   versioned proof requirement.
6. The active proof APIs and calibration route assume one hardcoded SE role.
7. The proof graph has no first-class equivalent of `sim_ai_interactions`; AI
   tool prompts, responses, edits, and verification behavior cannot be collapsed
   into person-oriented `proof_messages`.
8. The calibration API and migration schema have drifted: migration `025`
   defines `competencies`, `interview_focus`, and `notes`, while the API writes
   fields such as `common_tasks`, `stakeholders`, and `expensive_mistakes`.
   Applied AI activation must not build on an unverified write contract.

The first walking slice must not reuse the SE IDs, overwrite SE catalog rows, or
hide these relationships in `world_state` or miscellaneous JSON.

Two superficially convenient no-migration approaches are explicitly rejected
for the public product:

- do not map an AI latency phase to the database value `AUTH_CONSTRAINT`; that
  would persist the wrong domain meaning merely to satisfy a check constraint;
- do not make an anonymous sandbox request service-role-upsert global role and
  simulation catalog rows. Catalog provisioning must be deliberate, reviewable,
  and independent of visitor traffic.

An operator-run seed script could be used only for a disposable local
development database. It is not the production catalog migration strategy.

### Safe no-migration walking slice

Before a later schema/data decision, work may proceed only as:

- versioned TypeScript role/proof/simulation definitions;
- synthetic Applied AI fixtures and deterministic evaluator fixtures;
- isolated, non-production in-memory development runtime;
- UI composition against those fixtures;
- contract and analysis tests that write to no production table.

DB-backed Applied AI sandbox activation is blocked until a separately approved
catalog/schema strategy can create new immutable role/version identities and
represent workspace artifacts honestly.

## Files owned by the new instrument

Planned new files:

- `docs/rebuild/APPLIED_AI_ENGINEER_JOB_RESEARCH.md`
- `docs/rebuild/APPLIED_AI_ENGINEER_PROOF_SPEC.md`
- `docs/rebuild/APPLIED_AI_ENGINEER_SIMULATION_SPEC.md`
- `src/lib/sim-engine/scenarios/applied-ai-engineer/**`
- `src/components/simulations/sandboxes/AppliedAiEngineerSandbox.tsx`
- Applied AI proof fixture, analysis fixture, and test files under the existing
  isolated proof/sandbox and evidence-engine boundaries

Existing SE directories are preserved until their historical consumers are
mapped and tests prove the new catalog entry does not replace them.

## Migration risks

| Risk | Severity | Control |
|---|---|---|
| Reusing hardcoded SE role/version IDs | Critical | New immutable IDs; never relabel old rows |
| Editing migration `025` seed | Critical | Historical migrations immutable |
| Sending AI events to `sim_session_events` | Critical | Use isolated proof/event contracts only |
| Changing v2 scoring or published micro content | Critical | Frozen diff gate + legacy test suite |
| Treating prose/code display as executable engineering work | High | Honest runtime boundary; executed eval/config mutations only |
| Storing files/evals/coverage in arbitrary JSON to avoid schema work | High | Document schema gap; require explicit later decision |
| AI analysis over-rewarding polished explanations | High | Fixture E hard gate; claims require execution support |
| Changed fact released before commitment | High | State-machine and event-order tests |
| Rebranding all Fydell as AI-only | Medium | “Starting with Applied AI Engineering”; retain broader category |
| Accidental removal of legacy SE discoverability | Medium | Old runs resolve by pinned role/version |

## Acceptance tests

### Documentation gate

- The research distinguishes applied product engineering from model research.
- Every proof requirement maps to observed startup work.
- The simulation targets named proof gaps.
- The workbench limitation is explicit if arbitrary code cannot execute.
- Event, artifact, analysis, defense, brief, and receipt language all use the
  same role/scenario/version.

### Implementation gate

- Applied AI role uses a new role/version identity.
- Existing SE role/version rows and historical runs still render.
- Changed fact cannot release before a preliminary architecture commitment.
- Changed fact releases exactly once.
- Code/config/eval mutations persist in the isolated environment.
- Evaluation results change in response to real candidate mutations.
- Analysis references `PR-AI-*` requirements and source event/artifact IDs.
- Fixture C can never yield `STRONG_INTERVIEW`.
- Fixture E cannot reach `STRONG_INTERVIEW` through explanation quality alone.
- Defense questions originate from recorded candidate choices.
- Decision Brief and Work Receipt state role-specific limitations.
- Sandbox reset removes only sandbox data.
- No live/sandbox crossover.

### Frozen-path regression gate

- No diff in the protected files listed above.
- No changed historical migration and no unapproved new migration.
- `npm run test:v2`
- `npm run test:october`
- `npm run test:proof`
- `npm run test:sim-engine`
- `npm run typecheck`
- sandbox isolation E2E

## Decision required before implementation

The instrument can be fully specified and tested fixture-first now. Before a
DB-backed public sandbox is cut over, approve one explicit persistence option:

1. a later additive migration for AI catalog identities, proof requirements,
   proof coverage, and general workspace artifacts; or
2. a deliberately narrower non-durable public demo that is labelled as such.

Silently repurposing SE rows or arbitrary JSON is not an acceptable third
option.
