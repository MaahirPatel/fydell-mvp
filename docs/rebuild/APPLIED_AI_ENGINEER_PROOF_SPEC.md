# Applied AI Engineer Proof Spec

Spec version: `aai-proof-v1`

Role family: **Applied AI Engineering**

Primary display role: **Applied AI Engineer**

Supported aliases: LLM Engineer, AI Product Engineer, Generative AI Engineer,
Software Engineer AI, Full-Stack AI Engineer, Agent Engineer, Founding AI
Engineer.

This instrument does not cover foundation-model research, pretraining,
deep-learning research, distributed GPU infrastructure, or research-scientist
work.

## Product contract

The role proof flow is:

```text
ROLE PROOF REQUIREMENTS
-> EXISTING PROOF
-> PROOF COVERAGE
-> PROOF GAPS
-> TARGETED WORK
-> OBSERVED EVENTS AND ARTIFACTS
-> DEFENSE
-> REVIEWED EVIDENCE
-> DECISION BRIEF
-> WORK RECEIPT
```

The work episode is not an independent assessment product. It exists to reduce
specific candidate-role uncertainty. Every run must record the requirement IDs
it targets.

## Coverage states

Each candidate-role requirement has exactly one state:

- `PROVEN`
- `PARTIALLY_PROVEN`
- `NOT_PROVEN`
- `STALE`
- `NOT_APPLICABLE`

Approved evidence-source kinds:

- prior Fydell Work Receipt;
- current Fydell work;
- verified project artifact;
- human attestation;
- another explicitly approved source.

Source age, role relevance, verification status, limitations, and review state
remain visible. A source cannot become `PROVEN` merely because it contains the
right keywords.

## Requirement set

### PR-AI-01 — Problem decomposition

**Description**

Converts an ambiguous product need into components, interfaces, assumptions,
constraints, failure costs, and testable success conditions.

**Why role relevant**

Applied AI engineers routinely receive underspecified workflows. Production
quality depends on defining what the system should do, where uncertainty is
acceptable, and what must be measured before choosing models or frameworks.

**Observation opportunities**

- produces a bounded system decomposition;
- identifies users, irreversible actions, and failure costs;
- separates quality, reliability, latency, cost, and security goals;
- records unknowns and assumptions;
- defines acceptance and release conditions.

**Strong anchor**

Defines a coherent boundary and measurable success criteria, identifies
high-cost failure modes, and uses the decomposition to prioritize work.

**Moderate anchor**

Identifies major components and some measurable criteria, but leaves important
assumptions or failure costs implicit.

**Weak anchor**

Jumps into prompt/model changes without a defensible problem boundary or defines
success as a subjective demo impression.

**Insufficient-evidence anchor**

The episode does not require the candidate to frame a problem or make scope
choices.

**Common failure modes**

- solution-first framework selection;
- conflating model quality with product success;
- no critical-slice or failure-cost definition;
- treating every workflow step as an LLM task.

**Known limits**

A short episode cannot establish long-horizon roadmap judgment, organization
leadership, or domain expertise beyond the supplied materials.

### PR-AI-02 — AI system architecture

**Description**

Designs an appropriate boundary across model calls, deterministic code, tools,
state, persistence, retrieval where necessary, validation, and human review.

**Why role relevant**

Employers need engineers who can turn models into reliable systems, not merely
call an API.

**Observation opportunities**

- diagrams or records components and interfaces;
- chooses where state and durable checkpoints live;
- defines tool permissions and validation boundaries;
- uses retrieval only when external knowledge is required;
- preserves auditability and human escalation.

**Strong anchor**

Chooses the simplest architecture that satisfies the requirements, keeps
probabilistic boundaries explicit, and explains state, validation, and recovery.

**Moderate anchor**

Architecture is plausible but leaves one important boundary—state, validation,
permissions, or recovery—underspecified.

**Weak anchor**

Adds opaque chains/agents without necessity, treats a framework as the
architecture, or ignores persistence and failure boundaries.

**Insufficient-evidence anchor**

Only isolated prompt text is observed.

**Common failure modes**

- RAG or multi-agent design by default;
- hidden mutable state;
- model-controlled authorization;
- no separation between generated suggestions and irreversible actions.

**Known limits**

The episode does not prove distributed model serving, large-scale ML
infrastructure, or GPU systems design.

### PR-AI-03 — LLM and tool orchestration

**Description**

Builds or reasons about multi-step workflows with typed tools, structured model
output, explicit state transitions, bounded retries, and controlled behavior.

**Why role relevant**

Tool and state coordination is a recurring source of production failures in
model-powered applications.

**Observation opportunities**

- defines typed tool inputs and outputs;
- validates model output before tool execution;
- bounds loops and retries;
- handles partial execution and resumed state;
- makes side effects idempotent;
- records model/config/tool versions.

**Strong anchor**

Produces an inspectable, bounded workflow whose tools, states, errors, and side
effects have explicit contracts.

**Moderate anchor**

Happy-path orchestration is sound, but one recovery or idempotency path remains
weak.

**Weak anchor**

Relies on free-form output, unbounded loops, blind retry, or model discretion for
permissions.

**Insufficient-evidence anchor**

No multi-step or tool-mediated behavior is observed.

**Common failure modes**

- retrying permanent errors;
- duplicate writes after retry;
- schema-valid but semantically invalid tool arguments;
- broad tool permissions;
- no maximum-iteration or timeout policy.

**Known limits**

One bounded workflow does not prove experience operating large multi-agent or
long-running distributed systems.

### PR-AI-04 — Evaluation engineering

**Description**

Defines success, creates representative and failure cases, builds regression
checks, and combines deterministic, model-based, and human evaluation where
appropriate.

**Why role relevant**

The research consistently separates production engineers from demo builders by
whether they can measure quality and make evidence-based release decisions.

**Observation opportunities**

- audits the existing eval set;
- adds difficult, malformed, and known-failure cases;
- chooses deterministic checks where possible;
- defines a rubric for semantic judgment;
- compares before/after versions;
- identifies contamination, overfitting, and uncertainty.

**Strong anchor**

Creates a representative evaluation path, captures discovered failures as
regressions, and conditions claims on measured results and known limits.

**Moderate anchor**

Improves the eval set and measures change, but coverage or judge calibration is
incomplete.

**Weak anchor**

Uses only happy-path examples, reports an aggregate improvement without slice
analysis, or claims success from a few manual demos.

**Insufficient-evidence anchor**

No evaluation design or result is produced.

**Common failure modes**

- eval set too easy;
- optimizing to the visible cases;
- no baseline;
- no failure taxonomy;
- treating an LLM judge as ground truth;
- ignoring latency/cost regressions.

**Known limits**

A small episode cannot prove large-scale evaluation infrastructure, long-term
online experimentation, or domain-expert calibration.

### PR-AI-05 — Reliability and failure recovery

**Description**

Handles malformed or semantically invalid output, provider and tool failures,
partial execution, retries, fallback, idempotency, observability, and recovery.

**Why role relevant**

Production model systems fail in more ways than a deterministic happy path:
provider limits, stochastic output, tool errors, and repeated side effects must
be expected.

**Observation opportunities**

- classifies transient and permanent errors;
- honors retry guidance and applies bounded backoff;
- validates semantics after schema validation;
- prevents duplicate side effects;
- adds fallback or human escalation;
- creates useful traces and alerts.

**Strong anchor**

Fixes the highest-impact failure with bounded recovery, verifies it against a
regression case, and preserves auditability.

**Moderate anchor**

Handles the primary failure but leaves a secondary recovery path or operational
signal incomplete.

**Weak anchor**

Blindly retries, catches and suppresses errors, or improves the demo while
leaving duplicate/partial execution possible.

**Insufficient-evidence anchor**

No failure or recovery behavior is exercised.

**Common failure modes**

- retry storms;
- retrying 4xx/permanent validation errors;
- no idempotency key;
- schema validation without business validation;
- logs that omit the model/config/tool version;
- sensitive content in telemetry.

**Known limits**

The episode does not prove sustained on-call performance or resilience at
internet scale.

### PR-AI-06 — Software engineering quality

**Description**

Writes maintainable surrounding software with clear modules, reasonable
abstractions, tests, types/schemas, error handling, and readable code.

**Why role relevant**

Applied AI remains software engineering. Model integration does not excuse weak
interfaces, untested code, or unmaintainable abstractions.

**Observation opportunities**

- edits executable code or configuration;
- adds focused tests;
- uses typed schemas at boundaries;
- keeps model-provider details behind clear interfaces;
- handles errors without swallowing context;
- avoids unnecessary architecture.

**Strong anchor**

Makes a focused, readable change with appropriate tests and boundaries, and the
executed checks pass.

**Moderate anchor**

The change works and is understandable but has limited tests or one avoidable
coupling.

**Weak anchor**

Decorative code, broad rewrites, dead abstractions, no tests, or changes that
cannot be executed.

**Insufficient-evidence anchor**

The environment cannot execute or meaningfully inspect candidate code. In that
case Fydell must not issue a strong software-engineering claim.

**Common failure modes**

- notebook/demo code presented as production-ready;
- framework-driven over-abstraction;
- no type/schema boundary;
- no regression tests;
- unrelated rewrite instead of a targeted fix.

**Known limits**

A small repository does not prove performance in a large legacy codebase,
distributed systems expertise, or long-term maintainership.

### PR-AI-07 — Cost and latency judgment

**Description**

Makes realistic tradeoffs involving model choice, call count, context size,
caching, batching, latency distributions, and cost.

**Why role relevant**

Production AI products are constrained by tail latency and per-request cost;
quality-only optimization can make a system commercially unusable.

**Observation opportunities**

- reads p50/p95 latency and cost data;
- identifies the expensive/slow path;
- considers fewer calls, smaller models, shorter context, caching, or
  deterministic logic;
- measures rather than assumes improvement;
- checks quality after optimization.

**Strong anchor**

Chooses and validates a change against quality, p95 latency, and cost, and states
the remaining tradeoff.

**Moderate anchor**

Makes a plausible optimization and measures one or two axes, but leaves an
important tradeoff unverified.

**Weak anchor**

Selects a cheaper/faster model without eval evidence, optimizes average rather
than tail latency, or ignores call amplification.

**Insufficient-evidence anchor**

No latency/cost constraint or measurement is available.

**Common failure modes**

- model swap by reputation;
- no before/after measurement;
- cache proposal without cacheability analysis;
- reducing latency while regressing critical quality;
- ignoring first-request/schema or retry latency.

**Known limits**

Fixture pricing and latency cannot prove capacity planning, provider negotiation,
or large-scale serving expertise.

### PR-AI-08 — Product and model judgment

**Description**

Determines when a step should use an LLM, deterministic software, retrieval, or
human review.

**Why role relevant**

This is the signature Applied AI judgment repeatedly identified in employer and
practitioner sources. Good engineers do not maximize the number of model calls.

**Observation opportunities**

- identifies a deterministic step currently delegated to a model;
- preserves model use where semantic ambiguity creates value;
- places authorization and hard constraints outside the model;
- explains where human review is required;
- validates the boundary through evals.

**Strong anchor**

Moves at least one boundary for a defensible product/system reason and verifies
that the result improves reliability, latency, cost, or control without
unacceptable quality loss.

**Moderate anchor**

Articulates the correct boundary and makes a partial improvement, but validation
is incomplete.

**Weak anchor**

Uses the model for deterministic routing/authorization, removes a useful model
step without evidence, or argues from preference rather than system behavior.

**Insufficient-evidence anchor**

No boundary decision is available to the candidate.

**Common failure modes**

- “AI everywhere” design;
- deterministic rules for genuinely ambiguous semantic work;
- authorization in prompts;
- no human escalation for irreversible uncertainty;
- no evidence that the boundary change helped.

**Known limits**

One scenario cannot establish product taste across domains or long-term user
research ability.

## Current flagship work-episode coverage

The first Applied AI work episode is designed primarily to reduce uncertainty
for:

- `PR-AI-04` Evaluation engineering;
- `PR-AI-05` Reliability and failure recovery;
- `PR-AI-07` Cost and latency judgment;
- `PR-AI-08` Product and model judgment.

It creates secondary observation opportunities for `PR-AI-01`, `PR-AI-02`,
`PR-AI-03`, and `PR-AI-06`, but those requirements must remain
`PARTIALLY_PROVEN` or `INSUFFICIENT_EVIDENCE` when the environment does not
execute arbitrary candidate code.

## Claim contract

Every generated evidence claim must contain:

- requirement ID and role/spec version;
- direction: `STRENGTH`, `CONCERN`, or `INSUFFICIENT_EVIDENCE`;
- confidence independent of direction;
- supporting event and artifact version IDs;
- counterevidence IDs;
- explicit limitation;
- rubric, prompt, model, and analysis versions;
- review state.

Communication quality cannot substitute for execution evidence. No combination
of prose-only claims may yield `STRONG_INTERVIEW`.

## Decision hard gates

- Missing meaningful evaluation work prevents `STRONG_INTERVIEW`.
- Ignoring the changed production constraint prevents `STRONG_INTERVIEW`.
- Polished explanation without implementation/eval support prevents
  `STRONG_INTERVIEW`.
- A schema-valid but semantically unsafe solution cannot receive strong
  reliability evidence.
- If executable code behavior is not observed, `PR-AI-06` cannot be `PROVEN`.
- Research/model-training claims outside the episode remain explicit limits,
  never inferred strengths.
