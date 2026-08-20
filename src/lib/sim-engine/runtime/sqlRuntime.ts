import type { JsonValue, SimulationAttempt, SqlRuntimeConfig } from "../types";
import { pushScenarioEvent, setWorldFlag } from "./worldState";

export interface SqlExecuteResult {
  success: boolean;
  error?: string;
  columns: string[];
  rows: Array<Record<string, JsonValue>>;
  patternId?: string;
  rowCount: number;
  attempt: SimulationAttempt;
}

const MAX_RESULT_ROWS = 500;

function errorResult(
  attempt: SimulationAttempt,
  message: string,
  elapsedMs: number,
  errorCode: string
): SqlExecuteResult {
  let world = setWorldFlag(attempt.world, "sql_syntax_error", true, elapsedMs);
  world = pushScenarioEvent(world, "CUSTOM", `SQL execution error: ${message}`, elapsedMs, {
    error: errorCode,
  });
  return {
    success: false,
    error: message,
    columns: [],
    rows: [],
    rowCount: 0,
    attempt: { ...attempt, world },
  };
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  return Object.values(value).every(isJsonValue);
}

function normalizeRows(value: unknown): Array<Record<string, JsonValue>> {
  if (!Array.isArray(value)) {
    throw new Error("The query did not return a row set.");
  }
  return value.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error("The query returned an unsupported row shape.");
    }
    const normalized: Record<string, JsonValue> = {};
    for (const [key, cell] of Object.entries(row)) {
      if (!isJsonValue(cell)) {
        throw new Error(`Column "${key}" returned an unsupported value.`);
      }
      normalized[key] = cell;
    }
    return normalized;
  });
}

function readOnlyStatement(sql: string): boolean {
  const withoutTrailingSemicolon = sql.trim().replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) return false;
  return /^(SELECT|WITH)\b/i.test(withoutTrailingSemicolon);
}

/**
 * AlaSQL reserves a small set of words that PostgreSQL permits as ordinary
 * column names. Rewrite those identifiers for the in-browser engine without
 * touching quoted strings, quoted identifiers, or comments entered by the
 * candidate.
 */
function adaptPostgresSql(sql: string): string {
  const reserved = new Set(["plan"]);
  let output = "";
  let index = 0;
  let mode: "code" | "single" | "double" | "backtick" | "bracket" | "line-comment" | "block-comment" =
    "code";

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (mode === "line-comment") {
      output += char;
      index += 1;
      if (char === "\n") mode = "code";
      continue;
    }
    if (mode === "block-comment") {
      output += char;
      index += 1;
      if (char === "*" && next === "/") {
        output += next;
        index += 1;
        mode = "code";
      }
      continue;
    }
    if (mode !== "code") {
      output += char;
      index += 1;
      const closing =
        mode === "single"
          ? "'"
          : mode === "double"
            ? '"'
            : mode === "backtick"
              ? "`"
              : "]";
      if (char === closing) {
        if ((mode === "single" || mode === "double") && next === closing) {
          output += next;
          index += 1;
        } else {
          mode = "code";
        }
      }
      continue;
    }

    if (char === "-" && next === "-") {
      output += "--";
      index += 2;
      mode = "line-comment";
      continue;
    }
    if (char === "/" && next === "*") {
      output += "/*";
      index += 2;
      mode = "block-comment";
      continue;
    }
    if (char === "'" || char === '"' || char === "`" || char === "[") {
      output += char;
      index += 1;
      mode =
        char === "'"
          ? "single"
          : char === '"'
            ? "double"
            : char === "`"
              ? "backtick"
              : "bracket";
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < sql.length && /[A-Za-z0-9_$]/.test(sql[end])) end += 1;
      const token = sql.slice(index, end);
      output += reserved.has(token.toLowerCase()) ? `[${token}]` : token;
      index = end;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function classifySuccessfulQuery(
  config: SqlRuntimeConfig,
  sql: string
): { patternId: string; flags: Record<string, JsonValue> } {
  const lower = sql.toLowerCase();
  const matched = config.patterns.find((pattern) =>
    pattern.whenSqlIncludes.every((keyword) => lower.includes(keyword.toLowerCase()))
  );
  const flags: Record<string, JsonValue> = { sql_executed: true };

  if (matched?.setFlags) Object.assign(flags, matched.setFlags);

  const production = /\bproduction_runs\b/.test(lower);
  const quality = /\bquality_events\b/.test(lower);
  const aggregate = /\b(sum|avg|count|min|max)\s*\(/.test(lower);
  if (
    production &&
    aggregate &&
    /\bperiod\b/.test(lower) &&
    (/\byield_pct\b/.test(lower) ||
      (/\bcompleted_good\b/.test(lower) && /\bplanned\b/.test(lower)))
  ) {
    flags.ran_yield_query = true;
  }
  if (quality && /hold_reclass/i.test(sql)) {
    flags.ran_reclass_query = true;
    flags.identified_reporting_change = true;
  }
  if (production && aggregate && /\bscrap\b/.test(lower) && /\bline\b/.test(lower)) {
    flags.ran_residual_query = true;
    flags.identified_residual_loss = true;
  }

  return { patternId: matched?.id ?? "freeform_sql", flags };
}

/**
 * Executes read-only SQL against fresh in-memory fixture tables with AlaSQL.
 *
 * This is genuine query execution, not canned pattern output. The configured
 * patterns only classify successful queries for task/evidence flags after the
 * database has produced the result.
 */
export async function executeSqlQuery(
  config: SqlRuntimeConfig | undefined,
  attempt: SimulationAttempt,
  sql: string,
  elapsedMs: number
): Promise<SqlExecuteResult> {
  const trimmed = sql.trim();
  if (!config) {
    return {
      success: false,
      error: "No SQL runtime configured for this scenario",
      columns: [],
      rows: [],
      rowCount: 0,
      attempt,
    };
  }

  if (!trimmed) {
    return {
      success: false,
      error: "Empty query",
      columns: [],
      rows: [],
      rowCount: 0,
      attempt,
    };
  }

  if (!readOnlyStatement(trimmed)) {
    return errorResult(
      attempt,
      "Only one read-only SELECT or WITH query can run in this workbench.",
      elapsedMs,
      "read_only_required"
    );
  }

  try {
    const { default: alasql } = await import("alasql");
    const database = new alasql.Database();
    for (const table of config.tables) {
      database.exec(`CREATE TABLE [${table.name}]`);
      database.exec(`INSERT INTO [${table.name}] SELECT * FROM ?`, [[...table.rows]]);
    }

    const allRows = normalizeRows(database.exec<unknown>(adaptPostgresSql(trimmed)));
    const visibleRows = allRows.slice(0, MAX_RESULT_ROWS);
    const columns = visibleRows[0] ? Object.keys(visibleRows[0]) : [];
    const classification = classifySuccessfulQuery(config, trimmed);
    let world = attempt.world;
    for (const [flag, value] of Object.entries(classification.flags)) {
      world = setWorldFlag(world, flag, value, elapsedMs);
    }
    world = setWorldFlag(world, "last_sql_pattern", classification.patternId, elapsedMs);
    world = pushScenarioEvent(world, "CUSTOM", "SQL query executed", elapsedMs, {
      patternId: classification.patternId,
      rowCount: allRows.length,
      resultTruncated: allRows.length > MAX_RESULT_ROWS,
    });

    return {
      success: true,
      columns,
      rows: visibleRows,
      patternId: classification.patternId,
      rowCount: allRows.length,
      attempt: { ...attempt, world },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unknownTable = /does not exist|Cannot read properties.*undefined|Table does not exist/i.test(
      message
    );
    let nextAttempt = attempt;
    if (unknownTable) {
      nextAttempt = {
        ...attempt,
        world: setWorldFlag(attempt.world, "sql_unknown_table", true, elapsedMs),
      };
    }
    return errorResult(nextAttempt, `Query could not be executed: ${message}`, elapsedMs, "execution_failed");
  }
}
