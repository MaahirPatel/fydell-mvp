/**
 * Northline Components: operations-yield investigation, resource bundle v3.
 *
 * Fictional manufacturer. Synthetic data, generated to be internally coherent
 * rather than merely plausible. Not affiliated with any customer brand.
 *
 * Generation logic, so a later editor can change a number without silently
 * breaking the scenario:
 *
 *   scheduled_units == started_units for every run. Nothing is cancelled
 *   before it starts, which keeps the denominator question about the metric
 *   definition rather than about missing rows.
 *
 *   completed_units + rework_units + scrap_units + hold_reclass_units
 *     == scheduled_units, exactly, for every run.
 *
 *   Every unit in the three loss columns is accounted for by quality_events
 *   rows for that run. Summing events by disposition reproduces the run's
 *   loss columns exactly.
 *
 *   HOLD_RECLASS exists only in the current period, on L1 Day (35) and
 *   L2 Day (60). Under the prior reporting definition those 95 units counted
 *   as completed; under the current one they do not, and the prior period was
 *   not restated. That is the measurement artifact.
 *
 *   Residual operating loss is concentrated in L2 Day, which drops 5.00pp
 *   even after the reclass is added back, against 0.50pp on L1 Day and
 *   1.25pp on L1 Night. It is the only segment where a real problem survives
 *   the measurement correction.
 *
 * `docs/../truth.ts` recomputes all of this from these rows, and
 * `scripts/test-northline-v3.ts` fails if a row changes without the expected
 * values and the checksums being updated with it.
 */

import type { ResourceBundle, ResourceFile } from "../../resources";

export const NORTHLINE_BUNDLE_ID = "northline-ops-yield";
export const NORTHLINE_BUNDLE_VERSION = "3.0.0";
export const NORTHLINE_RESOURCE_VERSION_ID = `${NORTHLINE_BUNDLE_ID}@${NORTHLINE_BUNDLE_VERSION}`;

export const PRIOR_PERIOD = "2026-06";
export const CURRENT_PERIOD = "2026-07";

/* production_runs ----------------------------------------------------------- */

const productionRuns: ResourceFile = {
  kind: "table",
  fileId: "production_runs",
  fileName: "production_runs.csv",
  title: "Production runs",
  description:
    "One row per line, shift and product group per reporting period. Loss columns are reconciled against quality_events.",
  columns: [
    { key: "run_id", label: "run_id", type: "string" },
    { key: "period", label: "period", type: "string" },
    { key: "site", label: "site", type: "string" },
    { key: "line", label: "line", type: "string" },
    { key: "shift", label: "shift", type: "string" },
    { key: "product_group", label: "product_group", type: "string" },
    {
      key: "scheduled_units",
      label: "scheduled_units",
      type: "number",
      description: "Units the plan called for.",
    },
    {
      key: "started_units",
      label: "started_units",
      type: "number",
      description: "Units actually released to the line.",
    },
    {
      key: "completed_units",
      label: "completed_units",
      type: "number",
      description: "Units credited as good output under the reporting definition in force.",
    },
    { key: "rework_units", label: "rework_units", type: "number" },
    { key: "scrap_units", label: "scrap_units", type: "number" },
    {
      key: "hold_reclass_units",
      label: "hold_reclass_units",
      type: "number",
      description: "Units held and reclassified. Populated only from mid-2026-07.",
    },
    { key: "downtime_minutes", label: "downtime_minutes", type: "number" },
    { key: "period_start", label: "period_start", type: "timestamp" },
  ],
  rows: [
    {
      rowId: "run-prior-l1-day",
      cells: {
        run_id: "run-prior-l1-day",
        period: PRIOR_PERIOD,
        site: "Plant A",
        line: "L1",
        shift: "Day",
        product_group: "Widget-A",
        scheduled_units: 1000,
        started_units: 1000,
        completed_units: 940,
        rework_units: 30,
        scrap_units: 30,
        hold_reclass_units: 0,
        downtime_minutes: 40,
        period_start: "2026-06-01T00:00:00Z",
      },
    },
    {
      rowId: "run-prior-l2-day",
      cells: {
        run_id: "run-prior-l2-day",
        period: PRIOR_PERIOD,
        site: "Plant A",
        line: "L2",
        shift: "Day",
        product_group: "Widget-A",
        scheduled_units: 1000,
        started_units: 1000,
        completed_units: 930,
        rework_units: 35,
        scrap_units: 35,
        hold_reclass_units: 0,
        downtime_minutes: 55,
        period_start: "2026-06-01T00:00:00Z",
      },
    },
    {
      rowId: "run-prior-l1-night",
      cells: {
        run_id: "run-prior-l1-night",
        period: PRIOR_PERIOD,
        site: "Plant A",
        line: "L1",
        shift: "Night",
        product_group: "Widget-B",
        scheduled_units: 800,
        started_units: 800,
        completed_units: 760,
        rework_units: 20,
        scrap_units: 20,
        hold_reclass_units: 0,
        downtime_minutes: 30,
        period_start: "2026-06-01T00:00:00Z",
      },
    },
    {
      rowId: "run-cur-l1-day",
      cells: {
        run_id: "run-cur-l1-day",
        period: CURRENT_PERIOD,
        site: "Plant A",
        line: "L1",
        shift: "Day",
        product_group: "Widget-A",
        scheduled_units: 1000,
        started_units: 1000,
        completed_units: 900,
        rework_units: 35,
        scrap_units: 30,
        hold_reclass_units: 35,
        downtime_minutes: 50,
        period_start: "2026-07-01T00:00:00Z",
      },
    },
    {
      rowId: "run-cur-l2-day",
      cells: {
        run_id: "run-cur-l2-day",
        period: CURRENT_PERIOD,
        site: "Plant A",
        line: "L2",
        shift: "Day",
        product_group: "Widget-A",
        scheduled_units: 1000,
        started_units: 1000,
        completed_units: 820,
        rework_units: 70,
        scrap_units: 50,
        hold_reclass_units: 60,
        downtime_minutes: 120,
        period_start: "2026-07-01T00:00:00Z",
      },
    },
    {
      rowId: "run-cur-l1-night",
      cells: {
        run_id: "run-cur-l1-night",
        period: CURRENT_PERIOD,
        site: "Plant A",
        line: "L1",
        shift: "Night",
        product_group: "Widget-B",
        scheduled_units: 800,
        started_units: 800,
        completed_units: 750,
        rework_units: 25,
        scrap_units: 25,
        hold_reclass_units: 0,
        downtime_minutes: 35,
        period_start: "2026-07-01T00:00:00Z",
      },
    },
    {
      rowId: "run-cur-l2-night",
      cells: {
        run_id: "run-cur-l2-night",
        period: CURRENT_PERIOD,
        site: "Plant A",
        line: "L2",
        shift: "Night",
        product_group: "Widget-A",
        scheduled_units: 900,
        started_units: 900,
        completed_units: 860,
        rework_units: 20,
        scrap_units: 20,
        hold_reclass_units: 0,
        downtime_minutes: 25,
        period_start: "2026-07-01T00:00:00Z",
      },
    },
  ],
};

/* quality_events ------------------------------------------------------------ */

interface EventSeed {
  id: string;
  runId: string;
  recordedAt: string;
  reasonCode: "SCRAP_MATERIAL" | "REWORK_FIT" | "HOLD_RECLASS";
  disposition: "scrap" | "rework" | "hold_reclass";
  units: number;
}

/*
 * Events sum to their run's loss columns exactly. Several runs carry more than
 * one event for the same reason code so that reading a single row is not
 * enough; the candidate has to aggregate.
 */
const eventSeeds: EventSeed[] = [
  // Prior period
  { id: "Q-201", runId: "run-prior-l1-day", recordedAt: "2026-06-09T10:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 18 },
  { id: "Q-202", runId: "run-prior-l1-day", recordedAt: "2026-06-19T13:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 12 },
  { id: "Q-203", runId: "run-prior-l1-day", recordedAt: "2026-06-12T09:00:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 30 },
  { id: "Q-204", runId: "run-prior-l2-day", recordedAt: "2026-06-11T14:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 35 },
  { id: "Q-205", runId: "run-prior-l2-day", recordedAt: "2026-06-18T15:30:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 35 },
  { id: "Q-206", runId: "run-prior-l1-night", recordedAt: "2026-06-14T23:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 20 },
  { id: "Q-207", runId: "run-prior-l1-night", recordedAt: "2026-06-22T02:00:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 20 },

  // Current period, L1 Day: barely moved once the hold is set aside
  { id: "Q-301", runId: "run-cur-l1-day", recordedAt: "2026-07-07T10:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 30 },
  { id: "Q-302", runId: "run-cur-l1-day", recordedAt: "2026-07-09T11:30:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 35 },
  { id: "Q-303", runId: "run-cur-l1-day", recordedAt: "2026-07-16T08:00:00Z", reasonCode: "HOLD_RECLASS", disposition: "hold_reclass", units: 35 },

  // Current period, L2 Day: the residual problem
  { id: "Q-304", runId: "run-cur-l2-day", recordedAt: "2026-07-08T09:30:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 28 },
  { id: "Q-305", runId: "run-cur-l2-day", recordedAt: "2026-07-21T13:15:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 22 },
  { id: "Q-306", runId: "run-cur-l2-day", recordedAt: "2026-07-08T11:00:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 40 },
  { id: "Q-307", runId: "run-cur-l2-day", recordedAt: "2026-07-20T10:45:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 30 },
  { id: "Q-308", runId: "run-cur-l2-day", recordedAt: "2026-07-15T16:00:00Z", reasonCode: "HOLD_RECLASS", disposition: "hold_reclass", units: 60 },

  // Current period, nights: unremarkable
  { id: "Q-309", runId: "run-cur-l1-night", recordedAt: "2026-07-18T22:00:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 25 },
  { id: "Q-310", runId: "run-cur-l1-night", recordedAt: "2026-07-24T01:30:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 25 },
  { id: "Q-311", runId: "run-cur-l2-night", recordedAt: "2026-07-19T23:15:00Z", reasonCode: "SCRAP_MATERIAL", disposition: "scrap", units: 20 },
  { id: "Q-312", runId: "run-cur-l2-night", recordedAt: "2026-07-23T03:00:00Z", reasonCode: "REWORK_FIT", disposition: "rework", units: 20 },
];

const runIndex = new Map(productionRuns.kind === "table" ? productionRuns.rows.map((r) => [r.rowId, r.cells]) : []);

const qualityEvents: ResourceFile = {
  kind: "table",
  fileId: "quality_events",
  fileName: "quality_events.csv",
  title: "Quality events",
  description:
    "Individual loss events. Summing units by disposition within a run reproduces that run's loss columns.",
  columns: [
    { key: "event_id", label: "event_id", type: "string" },
    { key: "run_id", label: "run_id", type: "string" },
    { key: "period", label: "period", type: "string" },
    { key: "line", label: "line", type: "string" },
    { key: "shift", label: "shift", type: "string" },
    { key: "reason_code", label: "reason_code", type: "string" },
    {
      key: "disposition",
      label: "disposition",
      type: "string",
      description: "How the units were treated for completed-unit credit.",
    },
    { key: "units_affected", label: "units_affected", type: "number" },
    { key: "recorded_at", label: "recorded_at", type: "timestamp" },
  ],
  rows: eventSeeds.map((e) => {
    const run = runIndex.get(e.runId);
    if (!run) throw new Error(`quality event ${e.id} references unknown run ${e.runId}`);
    return {
      rowId: e.id,
      cells: {
        event_id: e.id,
        run_id: e.runId,
        period: run.period,
        line: run.line,
        shift: run.shift,
        reason_code: e.reasonCode,
        disposition: e.disposition,
        units_affected: e.units,
        recorded_at: e.recordedAt,
      },
    };
  }),
};

/* reported_metrics ---------------------------------------------------------- */

const reportedMetrics: ResourceFile = {
  kind: "table",
  fileId: "reported_metrics",
  fileName: "reported_metrics.csv",
  title: "Published yield",
  description: "What the dashboard published, and under which definition.",
  columns: [
    { key: "report_id", label: "report_id", type: "string" },
    { key: "period", label: "period", type: "string" },
    { key: "published_yield", label: "published_yield", type: "number" },
    { key: "denominator_definition", label: "denominator_definition", type: "string" },
    { key: "numerator_definition", label: "numerator_definition", type: "string" },
    { key: "report_version", label: "report_version", type: "string" },
    { key: "published_at", label: "published_at", type: "timestamp" },
  ],
  rows: [
    {
      rowId: "rm-prior-v1",
      cells: {
        report_id: "rm-prior-v1",
        period: PRIOR_PERIOD,
        published_yield: 0.939,
        denominator_definition: "scheduled_units",
        numerator_definition: "completed_units",
        report_version: "v1",
        published_at: "2026-07-02T09:00:00Z",
      },
    },
    {
      rowId: "rm-current-v2",
      cells: {
        report_id: "rm-current-v2",
        period: CURRENT_PERIOD,
        published_yield: 0.9,
        denominator_definition: "scheduled_units",
        numerator_definition: "completed_units, excluding units in HOLD_RECLASS",
        report_version: "v2",
        published_at: "2026-08-03T09:00:00Z",
      },
    },
  ],
};

/* Documents ----------------------------------------------------------------- */

const metricDefinition: ResourceFile = {
  kind: "document",
  fileId: "metric_definition",
  fileName: "metric_definition.md",
  title: "Yield definition",
  sections: [
    {
      sectionId: "formula",
      heading: "Formula",
      body: "yield = completed_units / scheduled_units\n\nGrain: line, shift and product group, per reporting period. Downtime is contextual and is not part of the formula.",
    },
    {
      sectionId: "included-units",
      heading: "Which units count as completed",
      body: "A unit counts as completed when it leaves the line as good output.\n\nScrapped units never count. Units sent to rework do not count in the period they are reworked; if they are released later they count in the period of release.",
    },
    {
      sectionId: "held-units-v1",
      heading: "Held units, definition v1",
      body: "Units placed on hold pending disposition were coded IN_PROCESS_HOLD and were credited as completed, on the reasoning that most holds are released.\n\nThis is the definition under which the 2026-06 figure was published.",
    },
    {
      sectionId: "held-units-v2",
      heading: "Held units, definition v2",
      body: "Units on hold are coded HOLD_RECLASS and are not credited as completed until released.\n\nThis is the definition under which the 2026-07 figure was published.",
    },
  ],
};

const reportingChange: ResourceFile = {
  kind: "document",
  fileId: "reporting_change",
  fileName: "reporting_change.md",
  title: "Reporting change note",
  sections: [
    {
      sectionId: "change-summary",
      heading: "CR-2026-114: hold disposition mapping",
      body: "Effective 2026-07-14, units previously coded IN_PROCESS_HOLD map to HOLD_RECLASS. The yield dashboard treats HOLD_RECLASS like scrap for completed-unit credit until the hold is released.",
    },
    {
      sectionId: "restatement",
      heading: "Restatement",
      body: "Prior periods were not restated. The 2026-06 figure remains published under definition v1.",
    },
    {
      sectionId: "scope",
      heading: "Scope",
      body: "The change applies to all lines and shifts at Plant A. It does not change how scrap or rework are recorded.",
    },
    {
      sectionId: "open-question",
      heading: "Open question at time of writing",
      body: "The change was raised to improve accuracy of in-period reporting. Whether it materially moves the published number was not assessed before release.",
    },
  ],
};

const shiftNotes: ResourceFile = {
  kind: "document",
  fileId: "shift_notes",
  fileName: "shift_notes.md",
  title: "Shift supervisor notes",
  sections: [
    {
      sectionId: "l2-day-fixture",
      heading: "L2 Day, week of 2026-07-06",
      body: "Fit rejects up again on the second fixture. Operators are re-seating parts by hand to get them through. Raised with maintenance; no change yet.",
    },
    {
      sectionId: "l2-day-followup",
      heading: "L2 Day, week of 2026-07-20",
      body: "Same fixture, same complaint. We are keeping up with schedule but only by reworking more than usual.",
    },
    {
      sectionId: "l1-day",
      heading: "L1 Day, 2026-07",
      body: "Nothing unusual. A batch of material came in slightly out of spec early in the month and was scrapped at incoming inspection.",
    },
    {
      sectionId: "nights",
      heading: "Night shifts, 2026-07",
      body: "Both night shifts ran normally. No escalations.",
    },
    {
      sectionId: "hold-area",
      heading: "Hold area",
      body: "The hold cage has been fuller than usual since the middle of the month. Quality say the parts are mostly fine and waiting on paperwork.",
    },
  ],
};

/* Bundle -------------------------------------------------------------------- */

export const NORTHLINE_FILES: ResourceFile[] = [
  productionRuns,
  qualityEvents,
  reportedMetrics,
  metricDefinition,
  reportingChange,
  shiftNotes,
];

/**
 * Declared content hashes. Regenerate with `npm run checksums:northline` after
 * an intentional data change, and update the expected values in `truth.ts` in
 * the same commit. The fixture test fails if these drift.
 */
export const NORTHLINE_CHECKSUMS: Record<string, string> = {
  production_runs: "06ac24353ea386787b899b3de22e08694e2c56142635206136dc78f12081cce0",
  quality_events: "a0d4c45f1cc0a0068b5f823896f583bd35fe62d59f66c42a748b628fdea48834",
  reported_metrics: "c762278bc2881d83f66a982cecbe55f7cdac37c10884cab900fffeb05c96ab1c",
  metric_definition: "60e8b8e4774c0680bc2eb8b3ca2d895b153bf40580a12db528cc7843e0beeabc",
  reporting_change: "7703d9b908530dc4a4095336d6660bf6139a2bab7daf58b423b88fb2dd181a39",
  shift_notes: "56ff696bd5d329d5fa618e708acb06ce38b6bd95a35979d4e34db8d2239fd430",
};

export const NORTHLINE_BUNDLE: ResourceBundle = {
  bundleId: NORTHLINE_BUNDLE_ID,
  version: NORTHLINE_BUNDLE_VERSION,
  resourceVersionId: NORTHLINE_RESOURCE_VERSION_ID,
  files: NORTHLINE_FILES,
  checksums: NORTHLINE_CHECKSUMS,
};
