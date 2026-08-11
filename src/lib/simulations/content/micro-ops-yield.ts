/**
 * October pilot flagship: Operations performance investigation.
 * Fictional manufacturer (Northline Components). Synthetic data only.
 * Not affiliated with any customer brand.
 */
import type { MicroSimContent } from "../micro-types";

export const PILOT_EVALUATION_SLUG = "ops-yield-investigation";

export const MICRO_OPS_YIELD: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: PILOT_EVALUATION_SLUG,
  roleKey: "data_analyst",
  title: "Operations performance investigation",
  tagline:
    "Reported yield fell last period. Separate measurement change from any real production risk.",
  mission:
    "Northline Components reports that production yield declined in the latest reporting period. Investigate the run and quality data, reconcile the yield definition, quantify how much of the change is a classification/reporting artifact, isolate any remaining operational signal, ask one useful stakeholder question, and submit a concise recommendation with uncertainty and a next validation step.",
  companyName: "Northline Components",
  durationMinutes: 20,
  curveball: {
    id: "ops_curveball",
    stakeholderId: "jordan",
    announcement:
      "Operations confirms that the reporting-code change began midway through the period, but leadership still needs to know whether any real production issue requires action before the next shift.",
    requiredAdaptation:
      "You cannot stop at \"it is only a data issue.\" State whether a residual operational risk remains, where it sits, and what to validate before the next shift.",
  },
  resources: [
    {
      id: "production_runs",
      title: "production_runs.csv",
      kind: "table",
      content: `| period | site | line | shift | product_group | planned_units | completed_units | rework | scrap | downtime_min |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| prior | Plant A | L1 | Day | Widget-A | 1000 | 940 | 30 | 30 | 40 |
| prior | Plant A | L2 | Day | Widget-A | 1000 | 930 | 35 | 35 | 55 |
| prior | Plant A | L1 | Night | Widget-B | 800 | 760 | 20 | 20 | 30 |
| current | Plant A | L1 | Day | Widget-A | 1000 | 900 | 55 | 45 | 50 |
| current | Plant A | L2 | Day | Widget-A | 1000 | 820 | 90 | 90 | 120 |
| current | Plant A | L1 | Night | Widget-B | 800 | 750 | 25 | 25 | 35 |
| current | Plant A | L2 | Night | Widget-A | 900 | 860 | 20 | 20 | 25 |`,
    },
    {
      id: "quality_events",
      title: "quality_events.csv",
      kind: "table",
      content: `| event_id | period | line | shift | reason_code | units_affected | recorded_at |
| --- | --- | --- | --- | --- | ---: | --- |
| Q-201 | prior | L1 | Day | SCRAP_MATERIAL | 18 | 2026-06-12T10:00:00Z |
| Q-202 | prior | L2 | Day | REWORK_FIT | 22 | 2026-06-12T14:00:00Z |
| Q-301 | current | L2 | Day | SCRAP_MATERIAL | 40 | 2026-07-08T09:30:00Z |
| Q-302 | current | L2 | Day | REWORK_FIT | 50 | 2026-07-08T11:00:00Z |
| Q-303 | current | L2 | Day | HOLD_RECLASS | 60 | 2026-07-15T16:00:00Z |
| Q-304 | current | L1 | Day | HOLD_RECLASS | 35 | 2026-07-16T08:00:00Z |
| Q-305 | current | L1 | Night | SCRAP_MATERIAL | 12 | 2026-07-18T22:00:00Z |`,
    },
    {
      id: "metric_reporting",
      title: "Metric dictionary and reporting note",
      kind: "markdown",
      content: `## Yield definition (official)

\`yield = completed_units / planned_units\`

- Grain: line + shift + product group per reporting period
- Rework and scrap reduce completed units when units leave the good-output path
- Downtime is contextual and is not part of the yield formula

## Prior-period published yield

Plant A overall prior yield was reported as **93.2%** (weighted by planned units).

## Reporting-change note (internal, dated mid-current period)

Effective mid-period, units previously coded as \`IN_PROCESS_HOLD\` began mapping to \`HOLD_RECLASS\`, which the yield dashboard treats like scrap for completed-unit credit until released. Historical prior-period rows were **not** restated.

## Known constraints

- Leadership needs a number they can trust for the next shift huddle.
- Do not invent semiconductor process knowledge. Use only the tables and notes provided.`,
    },
  ],
  stakeholders: [
    {
      id: "jordan",
      name: "Jordan Hale",
      role: "Operations Lead",
      blurb: "Owns Plant A shift huddles. Needs a clear call on data vs real risk.",
      knowledge: [
        "The HOLD_RECLASS mapping started about halfway through the current period.",
        "Line L2 Day shift had more fit-related rework tickets than usual this period.",
        "Night shift on L1 looked normal to the floor supervisors.",
      ],
      withholds: [
        "Will not state the residual operational segment unprompted.",
        "Will not invent a corrected plant-wide yield number.",
      ],
      responseRules: [
        {
          id: "rel_reclass",
          priority: 4,
          anyKeywords: [
            "reclass",
            "hold_reclass",
            "mapping",
            "classification",
            "reporting change",
            "code change",
            "when did",
            "mid",
          ],
          reply:
            "The HOLD_RECLASS mapping started about halfway through the current period. Prior period was not restated.",
        },
        {
          id: "rel_l2",
          priority: 3,
          anyKeywords: ["l2", "line 2", "day shift", "rework", "fit", "which line", "segment"],
          reply:
            "Line L2 Day shift had more fit-related rework tickets than usual. Night L1 looked normal to supervisors.",
        },
        {
          id: "rel_next_shift",
          priority: 2,
          anyKeywords: ["next shift", "action", "leadership", "huddle", "need", "priority"],
          reply:
            "For the huddle I need: how much is measurement noise, and whether any line/shift still needs action before the next shift.",
        },
      ],
      fallbackReply:
        "I can confirm the reporting-code change and what the floor saw. I cannot recalculate the dashboard for you.",
    },
  ],
  questions: [
    {
      id: "primary_driver",
      kind: "single_select",
      prompt: "What is the primary driver of the apparent plant-wide yield decline?",
      options: [
        "A mid-period classification/reporting change that treats holds like scrap",
        "A plant-wide material shortage affecting every line equally",
        "Night-shift staffing gaps on Line L1",
        "An incorrect planned_units denominator in the prior period only",
      ],
      points: 25,
      answer: ["A mid-period classification/reporting change that treats holds like scrap"],
      competencyKey: "metric_data_quality",
      expectedEvidence:
        "The reporting note shows HOLD_RECLASS began mid-period and is treated like scrap without restating prior data; quality_events shows HOLD_RECLASS only in the current period.",
    },
    {
      id: "residual_segment",
      kind: "single_select",
      prompt: "After accounting for the reporting change, where is the remaining operational signal strongest?",
      options: [
        "Line L2 Day shift (elevated rework/scrap beyond reclass holds)",
        "Line L1 Night shift only",
        "Every line equally after reclass adjustment",
        "There is no residual operational signal anywhere",
      ],
      points: 20,
      answer: ["Line L2 Day shift (elevated rework/scrap beyond reclass holds)"],
      competencyKey: "analytical_correctness",
      expectedEvidence:
        "L2 Day current completed/planned is 820/1000 with high rework/scrap and SCRAP_MATERIAL + REWORK_FIT events beyond HOLD_RECLASS volume.",
    },
    {
      id: "evidence_rows",
      kind: "multi_select",
      prompt: "Which evidence best supports separating measurement artifact from residual risk?",
      options: [
        "HOLD_RECLASS events appearing only in the current period",
        "Reporting note: prior period not restated",
        "L2 Day elevated REWORK_FIT / SCRAP_MATERIAL alongside holds",
        "Night L1 looking normal to supervisors",
      ],
      points: 15,
      answer: [
        "HOLD_RECLASS events appearing only in the current period",
        "Reporting note: prior period not restated",
        "L2 Day elevated REWORK_FIT / SCRAP_MATERIAL alongside holds",
      ],
      competencyKey: "investigation_evidence",
      expectedEvidence:
        "Cite the reclass timing/note plus L2 Day quality/run rows that remain after isolating holds.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt:
        "Submit your artifact: claim, evidence, caveat, recommendation, and next validation step (max 800 characters).",
      helpText:
        "Include uncertainty. After the curveball, address whether any real action is needed before the next shift.",
      maxChars: 800,
      points: 25,
      concepts: [
        {
          id: "name_reclass",
          label: "Names the classification/reporting artifact",
          keywords: ["reclass", "classification", "reporting", "mapping", "hold", "measurement"],
        },
        {
          id: "name_segment",
          label: "Names the residual L2 Day (or equivalent) segment",
          keywords: ["l2", "line 2", "day shift", "rework", "scrap", "fit"],
        },
        {
          id: "caveat",
          label: "States a caveat or uncertainty",
          keywords: ["uncertain", "caveat", "approx", "estimate", "partial", "mid-period", "limitation"],
        },
        {
          id: "next_validation",
          label: "Proposes a next validation step",
          keywords: ["validate", "next", "check", "audit", "recount", "release", "huddle", "before"],
        },
      ],
      competencyKey: "communication_uncertainty",
      expectedEvidence:
        "Artifact separates reclass noise from L2 Day residual risk, states uncertainty, and proposes a concrete validation before the next shift.",
    },
  ],
  competencies: [
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "investigation_evidence", label: "Investigation and evidence use" },
    { key: "metric_data_quality", label: "Metric and data-quality judgment" },
    { key: "business_prioritization", label: "Business prioritization" },
    { key: "communication_uncertainty", label: "Communication and uncertainty" },
    { key: "adaptation", label: "Adaptation to changed information" },
  ],
  stakeholderPoints: 15,
  stakeholderCompetencyKey: "business_prioritization",
  strengthTemplates: {
    primary_driver:
      "Correctly identified the mid-period HOLD_RECLASS mapping as the main driver of the apparent decline.",
    residual_segment:
      "Isolated the remaining operational signal on Line L2 Day shift rather than blaming the whole plant.",
    evidence_rows:
      "Selected evidence that separates the reporting artifact from residual rework/scrap on L2 Day.",
    recommendation:
      "The written artifact separates measurement change from residual risk and includes a validation step.",
  },
  improvementTemplates: {
    primary_driver:
      "The primary plant-wide effect is the mid-period HOLD_RECLASS mapping treated like scrap without restating prior data.",
    residual_segment:
      "After isolating holds, Line L2 Day still shows elevated rework/scrap that needs action review.",
    evidence_rows:
      "Stronger evidence pairs the reporting note and HOLD_RECLASS timing with L2 Day quality/run rows.",
    recommendation:
      "A stronger artifact would name the reclass effect, the L2 Day residual risk, a caveat, and a next-shift validation step.",
  },
};
