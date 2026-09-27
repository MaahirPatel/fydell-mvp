import "server-only";

/**
 * Feature flags with a kill switch for the evaluator and per-scenario gates
 * (OPS-04: roll out and roll back safely).
 *
 * - evaluator_enabled: global kill switch for all automated evaluation.
 * - scenario:<id>_enabled: per-scenario gate (broken scenario => disable,
 *   candidates keep their existing work).
 * - Flags are read on the evaluation path; disabling preserves existing work
 *   and queued jobs are held, not deleted.
 */

export type FlagName = "evaluator_enabled" | `scenario:${string}:enabled`;

export interface FlagStore {
  get(name: string): boolean | undefined;
  set(name: string, value: boolean, changedBy: string, reason: string): void;
  history(name: string): { value: boolean; changedBy: string; reason: string; at: string }[];
}

export function createMemoryFlagStore(initial: Record<string, boolean> = {}): FlagStore {
  const values = new Map<string, boolean>(Object.entries(initial));
  const history = new Map<string, { value: boolean; changedBy: string; reason: string; at: string }[]>();
  return {
    get: (name) => values.get(name),
    set: (name, value, changedBy, reason) => {
      values.set(name, value);
      const log = history.get(name) ?? [];
      log.push({ value, changedBy, reason, at: new Date().toISOString() });
      history.set(name, log);
    },
    history: (name) => history.get(name) ?? [],
  };
}

/** Default-on semantics: unset flags read as enabled (safe for fresh deploys). */
export function isEvaluatorEnabled(store: FlagStore): boolean {
  return store.get("evaluator_enabled") ?? true;
}

export function isScenarioEnabled(store: FlagStore, scenarioId: string): boolean {
  return store.get(`scenario:${scenarioId}:enabled`) ?? true;
}

/** Kill switch: disable the evaluator or one scenario, with actor + reason logged. */
export function setKillSwitch(
  store: FlagStore,
  target: "evaluator" | { scenarioId: string },
  enabled: boolean,
  changedBy: string,
  reason: string
): void {
  if (!changedBy || reason.trim().length < 8) {
    throw new Error("Kill-switch changes require an operator identity and a descriptive reason.");
  }
  const name: FlagName = target === "evaluator" ? "evaluator_enabled" : `scenario:${target.scenarioId}:enabled`;
  store.set(name, enabled, changedBy, reason);
}

/**
 * Evaluation-path guard. Throws a typed error the job runner converts into a
 * held (not failed) job, so a kill switch never fabricates candidate failures.
 */
export function assertEvaluationAllowed(store: FlagStore, scenarioId: string): void {
  if (!isEvaluatorEnabled(store)) {
    const err = new Error("Evaluator is disabled by kill switch; job held.");
    (err as { code?: string }).code = "EVALUATOR_DISABLED";
    throw err;
  }
  if (!isScenarioEnabled(store, scenarioId)) {
    const err = new Error(`Scenario ${scenarioId} is disabled by kill switch; job held.`);
    (err as { code?: string }).code = "SCENARIO_DISABLED";
    throw err;
  }
}
