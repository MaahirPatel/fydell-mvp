# Scenario authoring

How a scenario goes from idea to something an employer can buy. The
reference package is `scenarios/webhook-retry-incident/`.

## Pipeline

```
employer need → approved task family (catalog blueprint)
  → draft package → schema/content validation
  → execute starter, reference, alternatives and defective fixtures
  → expert review (qualified, not the author)
  → deliberate publication of an immutable version
```

AI may draft code, tests, messages and rubric text. It never marks its own
output valid; model agreement is not review. Generated code runs in the same
restricted execution path as candidate code. No scored repository is
generated fresh at candidate start.

## Package layout (runnable scenarios)

| Path | Visibility | Purpose |
| --- | --- | --- |
| `.fydell/scenario.json` | server | id, semver, `execution: remote`, **allowlist** of candidate files, test command |
| `.fydell/evaluation.json` | server | test groups, expected outcome per solution variant |
| `.fydell/rubric.json` | server | intended regression, permitted fixes, forbidden shortcuts, clarification facts, requirement update, dimensions with observable anchors, expected outcomes, known issues, human-review status |
| `canonical.json` | server | canonical facts personas may state |
| `.hidden/hidden_tests/` | server | protected evaluator tests, including a harness canary that must fail |
| `.hidden/solutions/<variant>/` | server | reference, alternative valid, partial and defective fixtures |
| everything on the allowlist | candidate | starter repo, docs, logs, provided tests |

`buildScenarioPackage` reads only allowlisted files, so `.fydell/` and
`.hidden/` never reach candidates. All files under `scenarios/**` are LF
(`.gitattributes`): the package hash must not depend on the OS that built it.

Persona replies, the requirement update and handoff questions live in
`src/lib/simulations/content/<scenario>.ts`.

## Validation lifecycle

`draft → automated_validation → expert_review → approved → published → retired`

Enforced twice, with the same rules:

- in code: `transition()` and `statusIsHonest()` in
  `src/lib/scenario-catalog/lifecycle.ts`;
- in the database: migration 039, `sim_template_versions.validation_status`
  with trigger `sim_template_versions_validation`, and append-only
  `sim_scenario_reviews`.

| Move | Requires |
| --- | --- |
| → `expert_review` | latest `automated_validation` record for this version is `passed` by `automation` |
| → `approved` | latest `expert_review` record is `approved`, by a `human`, with `actor_qualification`, and not by the version's author |
| → `published` | a separate human `publication` record; GPU/device runtimes also need their prerequisites met |
| → `draft` | failed checks or requested changes |
| `published` → | only `retired` |

Published version content is immutable (019 guard, kept by 039); only
`validation_status` may move. Invitations pin `template_version_id`, so a
later edit cannot change an in-progress assessment.

Existing rows are **not backfilled**: every version starts at `draft` in the
database until someone writes its review records.

## Recording a review (operator steps)

Service role only; there are no client policies on `sim_scenario_reviews`.

```sql
-- 1. automated validation, after `npm run validate:scenario` passes
insert into sim_scenario_reviews (template_version_id, stage, outcome, actor_kind, actor, evidence)
values ('<version uuid>', 'automated_validation', 'passed', 'automation',
        'scripts/validate-engineering-scenario.ts', '["17/17 checks, <commit>, <date>"]');
update sim_template_versions set validation_status = 'automated_validation' where id = '<version uuid>';
update sim_template_versions set validation_status = 'expert_review' where id = '<version uuid>';

-- 2. expert review by someone other than the author
insert into sim_scenario_reviews (template_version_id, stage, outcome, actor_kind, actor, actor_user_id, actor_qualification, evidence)
values ('<version uuid>', 'expert_review', 'approved', 'human', 'reviewer@example.com', '<user uuid>',
        'Staff backend engineer, 10 years webhooks/payments', '["reviewed rubric, hidden tests, fixtures"]');
update sim_template_versions set validation_status = 'approved' where id = '<version uuid>';
```

Update the catalog entry's `validation.reviews` in `families.ts` in the same
change, so the code and the database agree.

## Authoring checklist for a new family

1. Start from the family's blueprint in `families.ts`; keep its scope
   disclosure honest.
2. Build the package above. At minimum: shipped (red), reference,
   one alternative valid, one partial, two defective variants, and an
   expected row for each in `evaluation.json`.
3. Adversarial fixtures: reporting tamper (canary), `conftest.py`
   injection, a weakened provided test, an infinite loop.
4. `npm run validate:scenario -- <id>` must pass on Windows and Linux.
5. Personas: 2–3, each with known facts, unknown facts and escalation.
   Clarification answers must be stable across candidates.
6. Requirement update: milestone trigger, fallback trigger, minimum response
   window, evaluation relevance.
7. Set `runnable: true` and record the automated review. Do not set any
   later status yourself.
