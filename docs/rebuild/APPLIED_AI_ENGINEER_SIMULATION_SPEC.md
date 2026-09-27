# Applied AI Engineer flagship simulation specification

Instrument version: `aai-workflow-hardening-v1`

Role/spec version: `aai-proof-v1`

Working title: **Harden an enterprise AI workflow**

Target duration: 35-45 minutes for the public demo; 60-90 minutes for a
candidate instrument after validation.

## Purpose

This episode exists to reduce specific proof gaps. It is not an independent
content product.

Primary targets:

- `PR-AI-04` Evaluation engineering
- `PR-AI-05` Reliability and failure recovery
- `PR-AI-07` Cost and latency judgment
- `PR-AI-08` Product and model judgment

Secondary observation opportunities:

- `PR-AI-01` Problem decomposition
- `PR-AI-02` AI system architecture
- `PR-AI-03` LLM and tool orchestration
- `PR-AI-06` Software engineering quality

The assignment record must contain these IDs and the pre-run proof coverage that
caused the episode to be selected.

## Canonical product context

A Series B B2B software company has an AI workflow that converts enterprise
customer material into a structured implementation plan.

The prototype performs well in sales demonstrations but is unreliable in
production. The candidate inherits a small TypeScript service and its current
evaluation artifacts.

The scenario must remain broadly relevant to startup Applied AI Engineering; it
must not depend on Fydell-specific domain knowledge.

## Existing system

The workflow currently:

1. accepts a customer document and an account configuration;
2. asks a model to classify the workflow type;
3. asks the model to select a tool;
4. invokes the selected tool;
5. asks a second model call to generate a structured implementation plan;
6. validates JSON shape;
7. stores the plan and trace.

Current baseline:

- quality: 78% on the provided eight-case eval set;
- schema failure rate: 6%;
- duplicate side-effect rate after retry: 3%;
- p50 latency: 6.2 seconds;
- p95 latency: 10.8 seconds;
- estimated model cost: $0.18 per completed plan.

These numbers are synthetic, stable fixture data. The demo never calls a paid
model provider.

## Candidate materials

The project is intentionally small enough to understand in several minutes.

### Editable project files

```text
README.md
src/workflow.ts
src/model-client.ts
src/tool-router.ts
src/schema.ts
src/retry-policy.ts
config/models.json
config/workflow.json
prompts/implementation-plan.md
eval/cases.json
eval/graders.ts
tests/workflow.test.ts
```

### Read-only runtime evidence

```text
requirements/product-brief.md
requirements/security-and-data.md
traces/trace-017-schema-failure.json
traces/trace-024-duplicate-write.json
traces/trace-031-slow-success.json
metrics/baseline.json
docs/provider-errors.md
docs/tool-contracts.md
```

### Product requirements

- produce a typed implementation plan;
- never execute an irreversible customer action without deterministic
  authorization;
- retain an auditable trace;
- tolerate transient provider failure;
- escalate when required information is absent;
- preserve critical-case quality;
- meet the changed production latency requirement after it is released.

## Seeded weaknesses

The candidate is not given this answer list.

1. The model chooses between two tools even though account configuration
   deterministically identifies the valid tool.
2. JSON schema validation exists, but a schema-valid plan can reference a
   region that the account is not allowed to use.
3. The retry policy retries all failures, including permanent validation errors.
4. The write tool has no stable idempotency key, allowing a duplicate side
   effect after a timeout.
5. The eval set contains only straightforward successes.
6. The aggregate quality score hides a critical enterprise-policy failure.
7. Traces omit prompt/config version and retry reason.
8. Two sequential model calls and oversized shared context dominate p95 latency.
9. The fallback path returns a confident plan when it should request human
   review.

Multiple valid solutions are accepted. The evaluator must not reward a single
scripted sequence or require a named framework.

## Candidate mission

> Harden the existing AI workflow for enterprise use. Diagnose the most
> important reliability problems, improve the implementation and evaluation
> approach, and prepare a production recommendation supported by measured
> evidence.

Candidate actions:

- inspect requirements, code, traces, and baseline metrics;
- run the current tests/evals;
- identify and record assumptions;
- edit executable configuration and supported workflow logic;
- add or improve eval cases;
- run tests/evals after changes;
- commit a preliminary architecture decision;
- receive the new production constraint;
- revise implementation/config/evals;
- measure the result;
- submit a production recommendation;
- defend one or more recorded choices.

## Honest runtime boundary

The public walking slice must not pretend to be an unrestricted IDE.

### Supported in the first slice

- real editable JSON configuration, prompt, schema, retry policy, and eval-case
  files;
- constrained edits to the supplied TypeScript workflow modules;
- deterministic scenario execution against local synthetic fixtures;
- real validation of supported configuration/schema/eval mutations;
- repeatable test/eval results derived from the candidate's saved state;
- persistent before/after artifact versions inside the isolated demo boundary.

### Not claimed in the first slice

- arbitrary npm installation;
- arbitrary shell execution;
- arbitrary network access;
- arbitrary TypeScript/Python execution;
- container isolation;
- proof of large-repository software engineering.

If the implementation cannot execute candidate TypeScript safely, the code
editor is a patch/proposal surface and must be labelled accordingly. Only
executable configuration, schema, and eval mutations may affect measured
results. In that version `PR-AI-06` cannot receive strong evidence.

## State machine

```text
INVITED
-> INSPECTING
-> BASELINE_RUN
-> EDITING
-> PRELIMINARY_COMMITTED
-> LATENCY_CONSTRAINT_RELEASED
-> REVISING
-> VALIDATING
-> SUBMITTED
-> PASS_A
-> DEFENSE_READY
-> DEFENSE_SUBMITTED
-> PASS_B
-> REVIEW_PENDING
-> FINALIZED
```

The database currently cannot persist these names in `proof_runs.stage`; its
check constraint contains SE-shaped values. The fixture-first runtime uses this
state machine in code only. It must not map `LATENCY_CONSTRAINT_RELEASED` to
`AUTH_CONSTRAINT` to bypass that schema gap.

## Consequent changed fact

Canonical fact ID: `LATENCY_001`

It may release only after a successful preliminary architecture commitment.

> Enterprise deployment requirements changed. p95 end-to-end response time
> must be below 4 seconds. The current implementation is approximately 10-12
> seconds. Critical-case quality and authorization controls may not regress.

Release behavior:

- deterministic;
- exactly once;
- recorded as a world event;
- not visible in initial files, prompts, browser payloads, or candidate-readable
  source;
- includes the factual baseline and acceptance threshold;
- does not prescribe a solution.

## Expected post-fact observations

Record, without assuming correctness:

- which architecture/config values changed;
- which model calls remained;
- whether deterministic routing replaced model routing;
- whether a smaller/faster model was considered or selected;
- whether context size or call count changed;
- which eval cases or graders changed;
- before/after p50, p95, cost, and critical-case quality;
- whether schema and semantic validation changed;
- whether retries and idempotency changed;
- whether a new failure was introduced;
- which assumptions changed or remained.

## Meaningful event contract

Candidate/work events:

```text
FILE_OPENED
TRACE_OPENED
FAILURE_INSPECTED
ASSUMPTION_RECORDED
CODE_EDITED
CONFIG_EDITED
EVAL_CASE_ADDED
TEST_RUN
EVAL_RUN
ARCHITECTURE_DECISION_COMMITTED
CODE_REVISION
CONFIG_REVISION
EVAL_REVISION
MODEL_CHANGED
RETRY_POLICY_CHANGED
DETERMINISTIC_COMPONENT_INTRODUCED
PRODUCTION_RECOMMENDATION_WRITTEN
SUBMISSION_COMPLETED
DEFENSE_RESPONSE_RECEIVED
```

World events:

```text
FACT_RELEASED
STAGE_CHANGED
DEFENSE_QUESTION_ASKED
```

System events:

```text
AUTOSAVE_FAILED
RUN_RECOVERED
ANALYSIS_STARTED
ANALYSIS_COMPLETED
```

Do not capture every keystroke. An edit event represents a saved semantic
version and contains changed file IDs, hashes, and version references—not the
entire evidence interpretation.

Every event envelope includes:

- event ID and version;
- run ID and server-assigned sequence;
- source and actor;
- stage;
- occurred and recorded timestamps;
- correlation and idempotency keys;
- typed payload version.

Candidate events, telemetry, world facts, and system/analysis events remain
distinct. No event from this instrument writes to `sim_session_events`.

## Required genuine mutations

A user cannot complete the demo through Next-only progression. Candidate 01
must:

1. open at least one code/config file;
2. open and inspect a failed trace;
3. run the baseline test/eval;
4. change executable config, schema, retry policy, or supported workflow logic;
5. add or modify an eval case;
6. commit a preliminary architecture decision;
7. receive `LATENCY_001`;
8. make a post-fact revision;
9. run a post-fact eval;
10. submit a production recommendation;
11. answer a generated defense question.

The system must permit weak choices:

- retaining model-based deterministic routing;
- failing to add a critical eval case;
- keeping an unsafe retry policy;
- missing the latency target;
- meeting latency while regressing critical quality.

Those choices change evidence rather than merely blocking the UI.

## Deterministic evaluator

The synthetic runtime executes cases against the saved workflow definition.
Results are generated from the actual candidate-controlled configuration and
supported code/schema mutations, not from a fixed animation.

Every eval run records:

- fixture and evaluator version;
- workspace version hash;
- case IDs;
- pass/fail and grader details;
- quality by critical slice;
- schema and semantic failures;
- duplicate side effects;
- model-call count;
- p50 and p95 latency;
- estimated cost;
- new regressions.

The evaluator must expose why a metric changed. Aggregate score alone is
insufficient.

## Analysis pipeline

```text
RUN SNAPSHOT
-> EVENT NORMALIZATION
-> ARTIFACT VERSION DIFF
-> BASELINE / PRE-COMMIT / POST-FACT COMPARISON
-> REQUIREMENT MATCHING
-> CONTRADICTION SEARCH
-> UNKNOWN / LIMIT SEARCH
-> PASS A CLAIM DRAFT
-> DEFENSE QUESTION GENERATION
-> DEFENSE
-> PASS B CLAIM REVISION
-> HUMAN REVIEW
```

Questions the analysis must answer:

- What did the engineer notice?
- What did they test before changing the system?
- What did they change?
- What measured evidence did they gather?
- Which assumptions remained?
- Did the fix improve the relevant critical slice?
- Did it satisfy the changed constraint?
- Did it overfit to visible eval cases?
- Did it introduce a new failure?
- Did it replace an inappropriate model decision with deterministic software?
- Can the engineer explain the tradeoff?

Keyword presence is not evidence. Claims derive from structured actions,
artifact versions, and measured results.

## Evidence-claim shape

Example:

**PR-AI-04 — Evaluation engineering / strength / high confidence**

> Candidate added malformed tool output and duplicate-side-effect cases before
> claiming the reliability change worked, then reran the full suite.

Support:

```text
event_eval_case_104
event_eval_run_111
artifact_eval_cases_v3
eval_run_post_fact_02
```

Counterevidence:

> The revised suite still did not measure concurrency-related latency variance.

Limitation:

> The episode did not test large-scale offline evaluation infrastructure.

Every persisted claim follows the contract in the Proof Spec and starts in
`REVIEW_REQUIRED`.

## Defense generation

Questions originate from recorded choices and unresolved contradictions.

Examples:

- You converted tool routing from a model decision into deterministic logic.
  Why is that boundary appropriate for this product?
- Your retry change reduced provider failures but increased p95 latency. How
  would you decide whether that tradeoff is acceptable?
- Quality improved from 78% to 91%. What would make you distrust that result?
- You preserved the current model. What evidence made a model change lower
  priority?
- Your latency target passed but one critical authorization case regressed.
  Would you ship?

Generic behavioral-interview prompts are prohibited.

## Evaluator fixtures

### Fixture A — Demo builder

- produces a polished workflow;
- no rigorous eval expansion;
- weak failure handling;
- claims success from happy paths.

Expected: implementation speed may be a strength; evaluation and reliability
remain concern/insufficient. Never `STRONG_INTERVIEW`.

### Fixture B — Overengineer

- adds unnecessary abstraction or multiple agents;
- misses latency and product simplicity;
- partially improves reliability.

Expected: mixed evidence.

### Fixture C — Ignores changed constraint

- strong initial architecture;
- no meaningful response to `LATENCY_001`;
- may provide a polished explanation.

Expected: cannot produce `STRONG_INTERVIEW`.

### Fixture D — Strong Applied AI Engineer

- diagnoses the high-impact failures;
- improves representative evals;
- replaces deterministic routing appropriately;
- bounds retries and side effects;
- adapts to latency without critical-quality regression;
- measures and explains tradeoffs.

Expected: `STRONG_INTERVIEW` after review.

### Fixture E — Polished but shallow

- excellent prose and defense;
- weak executable changes and evaluation evidence.

Expected: communication alone cannot produce `STRONG_INTERVIEW`.

Stability tests run each fixture repeatedly and require the same recommendation
and materially consistent claims.

## Decision Brief contract

The brief identifies the candidate and **Applied AI Engineer** role, then shows:

- recommendation;
- why interview;
- strongest requirement-linked evidence;
- concerns and uncertainty;
- three candidate-specific engineering questions;
- expandable support/counterevidence/limits.

No percentage skill scores.

## Work Receipt contract

Title: **Applied AI Engineering Work Receipt**

Includes:

- episode and version;
- work performed;
- approved requirement-linked evidence;
- source event and artifact references;
- changed constraint and measured response;
- review state and issuer;
- explicit limitations.

Always list unobserved areas such as foundation-model training, distributed GPU
systems, large-scale ML infrastructure, and people management.

## Workbench information architecture

```text
Applied AI Engineer · Stage · Time · Autosave

TASK / REQUIREMENTS | CODE / WORKSPACE | RUNTIME / CONTEXT
proof targets       | files            | tests and evals
resources           | config           | traces
assumptions         | prompt/schema    | latency and cost
                    | recommendation   | changed fact

Commit approach · Run evaluation · Submit
```

The composition is capability/config driven. Do not add a RoleKey switch for
every panel. The renderer registry remains partial and contains no placeholder
renderer.

## Persistence and migration boundary

The existing proof graph can represent ordered events, versioned generic
artifacts, claims, defense, briefs, review, receipts, and outcomes. It cannot
honestly represent all first-class workspace concepts without later work:

- immutable AI role/version catalog provisioning;
- AI-specific run stages;
- active workspace files and eval runs;
- AI tool interactions distinct from people messages;
- versioned proof requirements and candidate-role proof coverage.

The first walking slice is fixture-first and writes to no production table.
Historical SE IDs and migration `025` remain unchanged. Public DB-backed cutover
requires a separately approved additive persistence plan.

## Acceptance tests

- new role/spec/scenario versions resolve without relabelling SE data;
- proof targets are `PR-AI-*`;
- project resources load;
- mutations persist in the isolated fixture runtime;
- eval results change in response to saved mutations;
- `LATENCY_001` cannot release before preliminary commitment;
- `LATENCY_001` releases exactly once;
- event sequence is deterministic and server-assigned when DB-backed;
- Pass A/B claims cite AI requirement, event, and artifact versions;
- defense questions cite recorded engineering choices;
- Fixture C is never `STRONG_INTERVIEW`;
- Fixture E is never `STRONG_INTERVIEW`;
- brief and receipt use Applied AI language and explicit limits;
- reset restores the original fixture;
- no sandbox/live data crossover;
- protected production simulation and report tests remain green.

## Fresh-user comprehension gate

After five minutes, a new user should be able to answer:

- Fydell is helping companies hire Applied AI / LLM engineers.
- The candidate diagnosed and changed a production-style AI workflow.
- Fydell was testing evaluation, reliability, architecture, latency/cost, and
  model-versus-deterministic judgment.
- This is not LeetCode because it observes production-style work, changed
  constraints, measured behavior, and defense.
- The employer receives a Decision Brief with underlying evidence.
- The candidate keeps a portable Work Receipt.

If those answers are unclear, the flagship fails even if its screens are
visually polished.
