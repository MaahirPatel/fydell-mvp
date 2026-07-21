/** Dependency graph for Project Relay — change propagation / stale marking. */

export const DEFAULT_DEPENDENTS: Record<string, string[]> = {
  "data/shipments.csv": ["outputs/daily_delay_view.csv", "__tests__", "__preview__"],
  "data/carriers.csv": ["outputs/daily_delay_view.csv", "__tests__", "__preview__"],
  "data/delays_manual_tracking.csv": ["outputs/daily_delay_view.csv", "__tests__", "__preview__"],
  "src/load.py": ["__tests__", "__preview__", "outputs/daily_delay_view.csv"],
  "src/join.py": ["__tests__", "__preview__", "outputs/daily_delay_view.csv", "src/report.py"],
  "src/reconcile.py": ["__tests__", "__preview__", "outputs/daily_delay_view.csv"],
  "src/metrics.py": ["__preview__", "outputs/daily_delay_view.csv"],
  "src/report.py": ["__preview__", "outputs/daily_delay_view.csv"],
  "tests/test_reconcile.py": ["__tests__"],
};

export function affectedClosure(start: string, dependents: Record<string, string[]>): Set<string> {
  const out = new Set<string>();
  const stack = [...(dependents[start] || [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (out.has(n)) continue;
    out.add(n);
    for (const child of dependents[n] || []) stack.push(child);
  }
  return out;
}

export function kindForPath(path: string): "code" | "data" | "markdown" | "json" | "other" | "output" {
  if (path.startsWith("outputs/")) return "output";
  if (path.endsWith(".csv")) return "data";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".py") || path.endsWith(".ts") || path.endsWith(".js")) return "code";
  return "other";
}
