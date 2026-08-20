import { strict as assert } from "node:assert";
import { northlineOperationsYieldScenario } from "../scenarios/data-analyst/northline-operations-yield";
import { createAttempt } from "./simulationRuntime";
import { executeSqlQuery } from "./sqlRuntime";

async function main(): Promise<void> {
const scenario = northlineOperationsYieldScenario;
const config = scenario.sqlRuntime;
assert.ok(config);

const attempt = createAttempt(scenario, "sql-runtime-test");
const unanticipated = await executeSqlQuery(
  config,
  attempt,
  `SELECT
    p.line,
    p.shift,
    SUM(p.scrap) AS scrap_units,
    SUM(q.units) AS disposition_units
  FROM production_runs AS p
  LEFT JOIN quality_events AS q
    ON p.period = q.period
   AND p.day = q.day
   AND p.line = q.line
   AND p.shift = q.shift
  WHERE p.period = 'current'
  GROUP BY p.line, p.shift
  HAVING SUM(p.scrap) >= 100
  ORDER BY scrap_units DESC`,
  10
);

assert.equal(unanticipated.success, true);
assert.deepEqual(unanticipated.columns, [
  "line",
  "shift",
  "scrap_units",
  "disposition_units",
]);
assert.equal(unanticipated.rows.length, 4);
assert.deepEqual(unanticipated.rows[0], {
  line: "L2",
  shift: "Day",
  scrap_units: 320,
  disposition_units: 248,
});
assert.equal(unanticipated.patternId, "residual_scrap");

const freeform = await executeSqlQuery(
  config,
  attempt,
  `SELECT
     line,
     COUNT(*) AS run_count,
     AVG(completed_good + hold_reclass) AS adjusted_good
   FROM production_runs
   WHERE period = 'current'
   GROUP BY line
   HAVING COUNT(*) = 40
   ORDER BY adjusted_good DESC`,
  15
);
assert.equal(freeform.success, true);
assert.equal(freeform.patternId, "freeform_sql");
assert.deepEqual(freeform.rows, [
  { line: "L1", run_count: 40, adjusted_good: 94.5 },
  { line: "L2", run_count: 40, adjusted_good: 92 },
]);

const filteredAggregate = await executeSqlQuery(
  config,
  attempt,
  `SELECT day, SUM(units) AS held_units
   FROM quality_events
   WHERE disposition = 'HOLD_RECLASS'
   GROUP BY day
   HAVING SUM(units) >= 12
   ORDER BY day DESC`,
  20
);
assert.equal(filteredAggregate.success, true);
assert.equal(filteredAggregate.rows.length, 12);
assert.deepEqual(filteredAggregate.rows[0], { day: 20, held_units: 12 });

const unsupported = await executeSqlQuery(
  config,
  attempt,
  "DELETE FROM production_runs",
  30
);
assert.equal(unsupported.success, false);
assert.match(unsupported.error ?? "", /read-only SELECT or WITH/);

const invalid = await executeSqlQuery(
  config,
  attempt,
  "SELECT imaginary FROM missing_table",
  40
);
assert.equal(invalid.success, false);
assert.match(invalid.error ?? "", /could not be executed/);

console.log("SQL runtime freeform execution passed.");
}

void main();
