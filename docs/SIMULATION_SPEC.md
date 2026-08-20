# Solutions Engineer simulation specification

Public sandbox fixture: `acme-rollout-v1` (Northstar / Acme Technical Discovery and Rollout).
Seeded proof-graph catalog in the database still includes the older CRM-auth scenario until a migration can replace it. The public `/sandbox` walkthrough uses only the Acme fixture manifest.

Version: `se-northstar-v1`  
Role: Solutions Engineer  
This document is the hiring instrument. The LLM may phrase messages; it may not invent world facts.

## Public sandbox — Acme rollout

Northstar is selling into Acme. The candidate is a Solutions Engineer. The sponsor wants a 200-user production cohort based on licensed seats. After the initial recommendation, security confirms the review takes six weeks and **blocks production access**. Sandbox enablement is allowed now. The 200 WAU figure remains unverified.

Pass A runs after the revised submission and generates the oral-defense question. Pass B runs after the defense and must not erase counterevidence. Review in the sandbox is either a scripted demonstration review or a sandbox-visitor decision. It is never presented as human hiring review.

The evidence report answers whether to interview. The work receipt answers what work occurred and what can be verified. The receipt integrity hash is not tamper-proof.

## The job situation (catalog scenario)

Acme Cloud’s customer, Northstar Health, must complete a CRM → accounts API integration before a board demo. Authentication works in Postman. Production requests fail validation. Sales has already implied Friday is possible. Engineering knows the path the candidate is likely to choose does not support the customer’s auth method — that fact is withheld until the candidate commits a preliminary recommendation.

## Candidate objective

Diagnose the integration failure, propose a technically sound plan, communicate appropriately with the customer and internal stakeholders, and revise the plan when material facts change.

## Starting information

- Customer deadline (board demo / Friday pressure).
- Observed error class (validation / schema), not the auth incompatibility.
- API docs for the originally advertised endpoint.
- Conflicting theories (customer SA vs engineering).

## Hidden information

- `AUTH_001`: the selected endpoint is incompatible with the customer’s authentication configuration.
- `SALES_001`: sales already promised Friday and wants the candidate not to “scare” the customer.
- `CUSTOMER_001`: if Friday slips, they will evaluate a competitor.

## Stakeholders

| Agent | Knows | Does not know | Must not |
|---|---|---|---|
| Customer (Northstar technical lead) | Architecture, deadline, observed errors, business goal | Internal roadmap, engineering private constraints, sales notes | Solve the task, invent product capabilities |
| Engineering | Product limits, AUTH_001 after it is released | Customer politics | Dump the answer unprompted before the fact is released |
| Sales | Commercial promise, Friday narrative | Deep auth constraints until engineering releases them | Rewrite technical facts |

## Decisions the candidate must make

1. Preliminary technical recommendation (endpoint / auth approach).
2. What to change after `AUTH_001`.
3. What to preserve after `AUTH_001`.
4. Whether and when to tell Sales and the customer.
5. How to respond to Friday pressure and competitive threat.
6. Final artifact: diagnosis, recommendation, customer-facing note, internal note, assumptions, limitations.

## Changed facts (deterministic)

| id | Canonical fact | Trigger | Invalidates |
|---|---|---|---|
| AUTH_001 | `selected_endpoint_incompatible_with_customer_auth` | `PRELIMINARY_RECOMMENDATION_SUBMITTED` | `recommendation.endpoint_choice` |
| SALES_001 | `sales_promised_friday_do_not_alarm_customer` | `AUTH_001` acknowledged **and** candidate has revised or 2 minutes after AUTH_001 | none (adds stakeholder conflict) |
| CUSTOMER_001 | `customer_will_evaluate_competitor_if_friday_slips` | `SALES_001` released **and** candidate messaged anyone **or** next artifact save | none (adds pressure) |

LLM presentation is not the scored object. The scored object is the row above.

## Intended observation opportunities

- Technical reasoning on docs, errors, and auth.
- Adaptation vs preservation after AUTH_001.
- Stakeholder propagation (Sales vs customer) after a material delivery risk.
- Intellectual honesty under sales pressure.
- Prioritization under competitive threat.

## Competencies (anchors)

### Technical reasoning

- Strong: names a real constraint, cites a resource or error, proposes a compatible path.
- Weak: guesses, invents endpoints, ignores docs.

### Adaptability

- Strong: after AUTH_001, changes the invalidated endpoint choice and preserves unaffected data-flow decisions.
- Weak: ignores AUTH_001, or rewrites the entire plan including valid parts.

### Stakeholder escalation

- Strong: tells the relevant internal stakeholder about material delivery risk before making further external commitments.
- Weak: recognizes the technical impact and continues with the customer without informing Sales.

### Customer communication

- Strong: clear, no invented certainty, states limitations.
- Weak: promises Friday anyway, or dumps internal engineering conflict on the customer.

### Intellectual honesty

- Strong: reduces confidence when facts change; does not hide uncertainty when Sales asks to.
- Weak: inflates certainty to match the sales narrative.

## Intentionally unobserved

- Long-term relationship building.
- Live coding skill beyond API reasoning.
- Culture or personality.
- Protected-class attributes. Never infer them.

## Known limitations

This simulation cannot establish on-site customer workshop skill, multi-week project management, or whether the candidate would repeat this behavior under a real quota. Interview probes must cover those gaps.

---

# Data Analyst simulation specification

Version: `da-northline-2.0.0`  
Role key: `data_analyst`  
Scenario ID: `northline-operations-yield`  
This document is the hiring instrument. The deterministic runtime owns world facts. A language model may phrase analysis, but it may not invent scenario facts.

## The job situation

Northline Components reports that plant yield fell from 93.2 percent. Operations needs to know whether production deteriorated or the number moved because a new disposition, `HOLD_RECLASS`, now leaves the completed-good numerator. Prior periods were not restated. The aggregate reported decline is explained by the rule change, while L2 Day retains a genuine residual scrap increase that merits an operational check.

## Candidate objective

Inspect the run-level and quality-event data, apply the metric definition, separate reporting movement from production loss, communicate with the people who own the metric and process, save a working recommendation, revise it when the code timing is corrected, and submit a concise recommendation to the Operations Manager.

## Starting information

- Reported yield fell from approximately 93.2 percent.
- `HOLD_RECLASS` is new in the current period.
- `yield = completed_good / planned`.
- `completed_good` excludes units in `HOLD_RECLASS`.
- Prior periods were not restated.
- Two inspectable datasets are available:
  - `production_runs`: 160 run-level rows, two periods × 20 days × two lines × two shifts.
  - `quality_events`: 68 current-period disposition events.

## Hidden information

- `HOLD_RECLASS_DAY_9`: the code went live on day 9, not day 1.
- `L2_DAY_RESIDUAL`: after restoring held units for comparability, L2 Day has 200 scrap units in the current period versus 160 prior.
- The aggregate current-period reported yield is 91.45 percent versus 93.25 percent prior.
- The current period contains 144 `HOLD_RECLASS` units. Restoring them closes the aggregate 1.8-point gap.
- The data establishes a residual loss on L2 Day but does not establish its cause.

## Stakeholders

| Person | Knows | Does not know | Disclosure boundary |
|---|---|---|---|
| Operations Manager | Business question, deadline, consequence of unnecessary line intervention | Exact reporting mechanics and cause of L2 Day loss | Wants an operational recommendation with a caveat |
| Quality Lead | Disposition definition, release timing, residual L2 Day observation | Root cause of the residual loss | Day-9 timing is released by the event system after a working memo is saved |
| Finance Analyst | Metric definition and non-restatement policy | Production root cause | Shares metric semantics, not operational causation |

Persona replies are determined from the selected person’s knowledge, classified candidate intent, prior topics, disclosure rules, and current world flags. A person cannot reveal a fact they do not own, and the Quality Lead cannot disclose the corrected timing before the world event releases it.

## Decisions the candidate must make

1. Which sources and queries are sufficient to establish comparability.
2. How much of the headline movement is reporting rather than production.
3. Whether any line or shift retains a genuine residual loss.
4. What confidence and limitation to attach to the adjusted comparison.
5. What to change after `HOLD_RECLASS_DAY_9`.
6. What to preserve after `HOLD_RECLASS_DAY_9`.
7. What action Operations should take before the next shift.
8. Whether the available evidence supports naming a cause.

## Changed fact

| ID | Canonical fact | Deterministic trigger | Expected effect |
|---|---|---|---|
| `HOLD_RECLASS_DAY_9` | `hold_reclass_started_on_day_9` | Candidate has opened `quality_events` and saved an `analysis_memo` | Recalculate the affected window; preserve the L2 Day residual finding and the metric-definition caveat |

The trigger is state-based and fires once. It does not depend on model output, candidate wording, or a random branch. Every candidate who reaches the same state receives the same fact.

## Multiple valid investigation paths

- Metric first: dictionary → yield by period → reclassification volume → residual by line and shift.
- Data first: inspect run rows → identify day boundary → verify dispositions → confirm definition.
- Stakeholder first: ask Finance about comparability → inspect data → ask Quality about residual evidence.
- Residual first: compare scrap by line and shift → identify L2 Day → quantify the aggregate reporting effect.

No path is privileged by sequence. Evidence quality, adaptation, and communication are the observed behaviors.

## Intended observation opportunities

- Opens and interprets source data rather than relying only on the headline.
- Uses a denominator and numerator definition consistently.
- Distinguishes a reporting reclassification from scrap.
- Detects a local residual hidden by an aggregate offset.
- Saves a working view before all facts are known.
- Revises after a material correction.
- Preserves valid work instead of restarting indiscriminately.
- Communicates uncertainty and an actionable next check.
- Separates AI-tool use from person conversations.

## Competencies and anchors

### Source comprehension and data quality

- Strong: uses both dataset grain and the metric dictionary; notes that prior periods were not restated.
- Weak: treats period averages as directly comparable or describes held units as scrap.

### Analytical correctness

- Strong: identifies 144 held units, the 1.8-point aggregate reporting effect, and the +40-unit L2 Day residual.
- Weak: calls the whole decline production loss, calls the whole decline harmless reporting, or names an unsupported cause.

### Metric definition and assumptions

- Strong: states the numerator change, affected day range, and estimation limitation.
- Weak: silently applies day-9 logic to all 20 days or mixes reported and adjusted yield.

### Evidence traceability

- Strong: connects claims to query events, source rows, and the changed-fact event.
- Weak: gives unsupported numbers or cites only a stakeholder opinion for a data claim.

### Response to changed information

- Strong: revises after the day-9 correction and preserves the L2 Day residual and non-restatement caveat.
- Weak: ignores the correction, or discards all valid prior work and halts both lines.
- Insufficient evidence: the changed fact was never released or no post-change artifact/defense evidence exists.

### Business judgment and recommendation

- Strong: advises against treating the aggregate as a plant-wide decline, asks for an L2 Day check before the next shift, and avoids claiming causation.
- Weak: recommends no action at all, an unnecessary plant-wide halt, or certainty the evidence cannot support.

## Pass A and oral defense

Pass A emits provisional claims plus these defense prompts:

1. How did the day-9 correction change your estimate, and what did it not change?
2. Why is L2 Day actionable without being enough evidence to name a cause?
3. How would you explain the recommendation verbally to Operations?

Each claim includes direction, confidence, supporting event IDs, counter-event IDs, rubric version, prompt version, and model version. Observations and inferences remain distinct. Pass B may add oral-defense event IDs and revise confidence; it must not erase contrary evidence.

## Event streams and ordering contract

The lab persists four separate arrays:

- World: released facts, stakeholder replies, revealed resources, and scenario changes.
- Candidate: queries, resources opened, messages sent, artifact revisions, decisions, and defense responses.
- Telemetry: focus loss, paste, navigation, and input-change signals.
- System: lifecycle transitions, task state changes, analysis jobs, retries, approvals, and brief publication.

An event belongs to exactly one stream. Analysis receives the explicit stream and cannot reinterpret a telemetry event as a world fact. The lab merges those arrays only for display using `localSequence` and marks every row `BROWSER_DEV_STAND_IN`. Production evidence must use `POSTGRES_CANONICAL_SEQUENCE` and a contiguous database-assigned `canonicalSequence`; the code rejects browser-local rows when canonical analysis is requested.

## Evaluator fixtures

- A, technically strong and poor communication: technically correct, revised analysis; terse jargon-heavy memo. Expected analytical strength and communication concern.
- B, overreacts to changed information: reruns/revises, but declares all prior work invalid and recommends stopping both lines. Expected change-response concern.
- C, ignores changed information: receives the day-9 fact and submits without revising. Expected high-confidence change-response concern. This fixture must never evaluate as strong.
- D, excellent analyst: correct queries, appropriate stakeholder question, scoped revision, clear limitation and action. Expected strengths across observed competencies.

## Deliberately not observed

- Spreadsheet aesthetics or memorized SQL syntax.
- Personality, charisma, culture fit, or protected attributes.
- Long-term reliability, plant-floor skill, or causal process engineering.
- Whether AI use itself is good or bad. Only verification and judgment are relevant.
- Job performance prediction or a numeric score.

## Known limitations

- SQL runs genuinely in-browser over fresh in-memory fixture tables using AlaSQL. It supports the scenario’s realistic `SELECT`, `WHERE`, expressions, aggregate functions, `GROUP BY`, `HAVING`, `ORDER BY`, and joins. It is not PostgreSQL: PostgreSQL extensions, window-function parity, query plans, DDL/DML, multiple statements, and database-specific casts are not supported. Unsupported syntax returns an explicit execution error and never a canned or silently empty result.
- The SQL package is approximately 10 MB unpacked in `node_modules`; its browser build is roughly 500 KB. The runtime loads that build with `import("alasql")` only when a query executes, so it does not enter marketing or dashboard entry bundles. Production transfer size still needs measurement before promotion.
- Lab workflow and four-stream persistence use localStorage for development only. This is not production durability.
- The lab runtime does not establish canonical Postgres ordering. Production comparability requires the existing database trigger’s assigned sequence. This phase intentionally does not modify production event writes or add migrations.
- The Northline evidence branch reuses the existing lab evidence endpoint but runs the deterministic TypeScript evaluator. The Python worker remains limited to its current Solutions Engineer `AUTH_001` contract and was not modified.
- Defense is captured as typed responses in this lab. Audio capture and transcription remain unproven.
- The scenario observes a 25-minute slice of work. It cannot establish repeated performance, domain tenure, or plant-floor investigation skill.
