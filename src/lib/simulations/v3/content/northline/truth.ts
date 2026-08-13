/**
 * Northline ground truth, derived from the resource bundle.
 *
 * Nothing here is a hand-typed answer. Every figure is computed from the rows
 * in `data.ts`, and every figure carries the source references it was computed
 * from. That is what makes an employer-facing citation openable: the engine can
 * say "the reclass explains 2.57 points" and hand the reviewer the exact rows.
 *
 * `NORTHLINE_EXPECTED` is the one hand-written part. It exists so that a change
 * to the data that alters the scenario fails a test instead of quietly
 * producing a different evaluation.
 */

import {
  cellRef,
  rowRef,
  sectionRef,
  type EvidenceSourceRef,
  type ResourceBundle,
  type TabularResourceFile,
} from "../../resources";
import { CURRENT_PERIOD, PRIOR_PERIOD } from "./data";

function table(bundle: ResourceBundle, fileId: string): TabularResourceFile {
  const file = bundle.files.find((f) => f.fileId === fileId);
  if (!file || file.kind !== "table") {
    throw new Error(`Northline bundle is missing tabular file "${fileId}"`);
  }
  return file;
}

const num = (v: unknown): number => (typeof v === "number" ? v : 0);

export interface SegmentFact {
  segment: string;
  line: string;
  shift: string;
  priorYield: number;
  reportedYield: number;
  /** Yield with held units credited back, comparable to the prior definition. */
  normalizedYield: number;
  /** Prior minus normalized. What survives the measurement correction. */
  residualDropPp: number;
  sourceRefs: EvidenceSourceRef[];
}

export interface YieldFacts {
  priorScheduled: number;
  priorCompleted: number;
  priorYield: number;

  currentScheduled: number;
  currentCompleted: number;
  currentReportedYield: number;

  reclassUnits: number;
  currentNormalizedYield: number;

  /** Prior yield minus current reported yield, in percentage points. */
  totalDeclinePp: number;
  /** The part explained by the definition change. */
  measurementDeclinePp: number;
  /** The part that is a real operating loss. */
  residualDeclinePp: number;
  /** Share of the reported decline attributable to the definition change. */
  measurementShare: number;

  segments: SegmentFact[];
  residualSegment: SegmentFact;

  sources: {
    reclassTiming: EvidenceSourceRef;
    noRestatement: EvidenceSourceRef;
    definitionV1: EvidenceSourceRef;
    definitionV2: EvidenceSourceRef;
    publishedPrior: EvidenceSourceRef;
    publishedCurrent: EvidenceSourceRef;
    reclassEvents: EvidenceSourceRef[];
    residualEvents: EvidenceSourceRef[];
  };
}

/**
 * Deterministic extraction. The analysis engine calls this to get the facts a
 * candidate's work is compared against, and the fixture test calls it to prove
 * the bundle still describes the scenario it is supposed to describe.
 */
export function computeYieldFacts(bundle: ResourceBundle): YieldFacts {
  const runs = table(bundle, "production_runs");
  const events = table(bundle, "quality_events");

  const runsIn = (period: string) => runs.rows.filter((r) => r.cells.period === period);
  const total = (period: string, key: string) =>
    runsIn(period).reduce((a, r) => a + num(r.cells[key]), 0);

  const priorScheduled = total(PRIOR_PERIOD, "scheduled_units");
  const priorCompleted = total(PRIOR_PERIOD, "completed_units");
  const currentScheduled = total(CURRENT_PERIOD, "scheduled_units");
  const currentCompleted = total(CURRENT_PERIOD, "completed_units");
  const reclassUnits = total(CURRENT_PERIOD, "hold_reclass_units");

  const priorYield = priorCompleted / priorScheduled;
  const currentReportedYield = currentCompleted / currentScheduled;
  const currentNormalizedYield = (currentCompleted + reclassUnits) / currentScheduled;

  const totalDeclinePp = (priorYield - currentReportedYield) * 100;
  const measurementDeclinePp = (currentNormalizedYield - currentReportedYield) * 100;
  const residualDeclinePp = (priorYield - currentNormalizedYield) * 100;

  // Segments are matched on line and shift, so a segment present in only one
  // period is reported rather than silently dropped.
  const segments: SegmentFact[] = [];
  for (const currentRun of runsIn(CURRENT_PERIOD)) {
    const line = String(currentRun.cells.line);
    const shift = String(currentRun.cells.shift);
    const priorRun = runsIn(PRIOR_PERIOD).find(
      (r) => r.cells.line === line && r.cells.shift === shift
    );
    if (!priorRun) continue;

    const scheduled = num(currentRun.cells.scheduled_units);
    const completed = num(currentRun.cells.completed_units);
    const held = num(currentRun.cells.hold_reclass_units);

    const priorSegYield = num(priorRun.cells.completed_units) / num(priorRun.cells.scheduled_units);
    const reportedYield = completed / scheduled;
    const normalizedYield = (completed + held) / scheduled;

    segments.push({
      segment: `${line} ${shift}`,
      line,
      shift,
      priorYield: priorSegYield,
      reportedYield,
      normalizedYield,
      residualDropPp: (priorSegYield - normalizedYield) * 100,
      sourceRefs: [
        rowRef(bundle, "production_runs", priorRun.rowId, `${line} ${shift}, ${PRIOR_PERIOD}`),
        rowRef(bundle, "production_runs", currentRun.rowId, `${line} ${shift}, ${CURRENT_PERIOD}`),
      ],
    });
  }

  const residualSegment = segments.reduce((worst, s) =>
    s.residualDropPp > worst.residualDropPp ? s : worst
  );

  const reclassEventRows = events.rows.filter((r) => r.cells.disposition === "hold_reclass");
  const residualEventRows = events.rows.filter(
    (r) =>
      r.cells.period === CURRENT_PERIOD &&
      r.cells.line === residualSegment.line &&
      r.cells.shift === residualSegment.shift &&
      r.cells.disposition !== "hold_reclass"
  );

  return {
    priorScheduled,
    priorCompleted,
    priorYield,
    currentScheduled,
    currentCompleted,
    currentReportedYield,
    reclassUnits,
    currentNormalizedYield,
    totalDeclinePp,
    measurementDeclinePp,
    residualDeclinePp,
    measurementShare: measurementDeclinePp / totalDeclinePp,
    segments,
    residualSegment,
    sources: {
      reclassTiming: sectionRef(
        bundle,
        "reporting_change",
        "change-summary",
        "Effective 2026-07-14, units previously coded IN_PROCESS_HOLD map to HOLD_RECLASS."
      ),
      noRestatement: sectionRef(
        bundle,
        "reporting_change",
        "restatement",
        "Prior periods were not restated."
      ),
      definitionV1: sectionRef(bundle, "metric_definition", "held-units-v1"),
      definitionV2: sectionRef(bundle, "metric_definition", "held-units-v2"),
      publishedPrior: cellRef(bundle, "reported_metrics", "rm-prior-v1", "published_yield"),
      publishedCurrent: cellRef(bundle, "reported_metrics", "rm-current-v2", "published_yield"),
      reclassEvents: reclassEventRows.map((r) =>
        rowRef(bundle, "quality_events", r.rowId, `${r.cells.units_affected} units held`)
      ),
      residualEvents: residualEventRows.map((r) =>
        rowRef(
          bundle,
          "quality_events",
          r.rowId,
          `${r.cells.reason_code}, ${r.cells.units_affected} units`
        )
      ),
    },
  };
}

/**
 * Internal consistency of the bundle itself, independent of the scenario:
 * losses must account for the gap between scheduled and completed, and the
 * events must account for the losses.
 */
export function checkBundleArithmetic(bundle: ResourceBundle): string[] {
  const errors: string[] = [];
  const runs = table(bundle, "production_runs");
  const events = table(bundle, "quality_events");

  for (const run of runs.rows) {
    const c = run.cells;
    const scheduled = num(c.scheduled_units);
    const accounted =
      num(c.completed_units) +
      num(c.rework_units) +
      num(c.scrap_units) +
      num(c.hold_reclass_units);
    if (accounted !== scheduled) {
      errors.push(
        `run ${run.rowId}: completed + rework + scrap + hold = ${accounted}, scheduled = ${scheduled}`
      );
    }
    if (num(c.started_units) !== scheduled) {
      errors.push(`run ${run.rowId}: started_units does not equal scheduled_units`);
    }

    const forRun = events.rows.filter((e) => e.cells.run_id === run.rowId);
    const byDisposition = (d: string) =>
      forRun.filter((e) => e.cells.disposition === d).reduce((a, e) => a + num(e.cells.units_affected), 0);

    const pairs: Array<[string, number, number]> = [
      ["scrap", byDisposition("scrap"), num(c.scrap_units)],
      ["rework", byDisposition("rework"), num(c.rework_units)],
      ["hold_reclass", byDisposition("hold_reclass"), num(c.hold_reclass_units)],
    ];
    for (const [label, fromEvents, onRun] of pairs) {
      if (fromEvents !== onRun) {
        errors.push(
          `run ${run.rowId}: quality_events give ${fromEvents} ${label} units, run row says ${onRun}`
        );
      }
    }
  }

  const runIds = new Set(runs.rows.map((r) => r.rowId));
  for (const e of events.rows) {
    if (!runIds.has(String(e.cells.run_id))) {
      errors.push(`quality event ${e.rowId} references unknown run ${e.cells.run_id}`);
    }
  }

  return errors;
}

/**
 * The scenario, stated once. If the data changes so that these stop holding,
 * the evaluation is measuring something different and the rubric, the
 * stakeholder replies and the defense questions all need revisiting.
 *
 * Percentages are in points and compared with a tolerance, since they are
 * ratios rather than authored constants.
 */
export const NORTHLINE_EXPECTED = {
  priorYield: 0.9392857142857143,
  currentReportedYield: 0.9,
  currentNormalizedYield: 0.9256756756756757,

  reclassUnits: 95,

  totalDeclinePp: 3.9285714285714288,
  measurementDeclinePp: 2.5675675675675675,
  residualDeclinePp: 1.3610038610038612,

  /** Roughly two thirds of the reported drop is the definition change. */
  measurementShareRange: [0.62, 0.68] as [number, number],

  residualSegment: "L2 Day",
  residualSegmentDropPp: 5.0,

  /** The residual segment must be unambiguous, not a coin flip. */
  minimumResidualMarginPp: 3.0,

  publishedPriorYield: 0.939,
  publishedCurrentYield: 0.9,

  /** Published figures must match the data to within a rounding step. */
  publishedTolerance: 0.001,
} as const;
