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

/**
 * Deterministic structural SQL mock — not a real database.
 * Recognizes SELECT/FROM/WHERE/JOIN/GROUP BY patterns via configured matchers.
 */
export function executeSqlQuery(
  config: SqlRuntimeConfig | undefined,
  attempt: SimulationAttempt,
  sql: string,
  elapsedMs: number
): SqlExecuteResult {
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

  const upper = trimmed.toUpperCase();
  if (!/\bSELECT\b/.test(upper)) {
    let world = setWorldFlag(attempt.world, "sql_syntax_error", true, elapsedMs);
    world = pushScenarioEvent(world, "CUSTOM", "SQL syntax error: missing SELECT", elapsedMs, {
      error: "missing_select",
    });
    return {
      success: false,
      error: "Syntax error: expected SELECT",
      columns: [],
      rows: [],
      rowCount: 0,
      attempt: { ...attempt, world },
    };
  }

  if (!/\bFROM\b/.test(upper)) {
    let world = setWorldFlag(attempt.world, "sql_syntax_error", true, elapsedMs);
    world = pushScenarioEvent(world, "CUSTOM", "SQL syntax error: missing FROM", elapsedMs, {
      error: "missing_from",
    });
    return {
      success: false,
      error: "Syntax error: expected FROM",
      columns: [],
      rows: [],
      rowCount: 0,
      attempt: { ...attempt, world },
    };
  }

  // Unknown table detection (simple)
  const fromMatch = trimmed.match(/\bFROM\s+([a-zA-Z_][\w]*)/i);
  if (fromMatch) {
    const table = fromMatch[1].toLowerCase();
    if (!config.knownTables.map((t) => t.toLowerCase()).includes(table)) {
      let world = setWorldFlag(attempt.world, "sql_unknown_table", true, elapsedMs);
      world = pushScenarioEvent(world, "CUSTOM", `SQL relation error: ${table}`, elapsedMs, {
        table,
      });
      return {
        success: false,
        error: `Relation "${table}" does not exist`,
        columns: [],
        rows: [],
        rowCount: 0,
        attempt: { ...attempt, world },
      };
    }
  }

  const lower = trimmed.toLowerCase();
  for (const pattern of config.patterns) {
    if (pattern.whenSqlIncludes.every((k) => lower.includes(k.toLowerCase()))) {
      let world = attempt.world;
      world = setWorldFlag(world, "sql_executed", true, elapsedMs);
      world = setWorldFlag(world, "last_sql_pattern", pattern.id, elapsedMs);
      if (pattern.setFlags) {
        for (const [flag, value] of Object.entries(pattern.setFlags)) {
          world = setWorldFlag(world, flag, value, elapsedMs);
        }
      }
      world = pushScenarioEvent(
        world,
        "CUSTOM",
        `SQL matched pattern: ${pattern.label ?? pattern.id}`,
        elapsedMs,
        { patternId: pattern.id, rowCount: pattern.rows.length }
      );
      return {
        success: true,
        columns: pattern.columns,
        rows: pattern.rows,
        patternId: pattern.id,
        rowCount: pattern.rows.length,
        attempt: { ...attempt, world },
      };
    }
  }

  // Default: return first table preview if SELECT * FROM known
  const tableName = fromMatch?.[1];
  const table = config.tables.find((t) => t.name.toLowerCase() === tableName?.toLowerCase());
  if (table) {
    let world = setWorldFlag(attempt.world, "sql_executed", true, elapsedMs);
    world = setWorldFlag(world, "last_sql_pattern", "table_scan", elapsedMs);
    return {
      success: true,
      columns: table.columns,
      rows: table.rows.slice(0, 8),
      patternId: "table_scan",
      rowCount: Math.min(8, table.rows.length),
      attempt: { ...attempt, world },
    };
  }

  return {
    success: true,
    columns: ["note"],
    rows: [{ note: "Query ran but matched no analytical pattern. Refine filters or joins." }],
    patternId: "no_pattern",
    rowCount: 1,
    attempt: {
      ...attempt,
      world: setWorldFlag(attempt.world, "sql_executed", true, elapsedMs),
    },
  };
}
