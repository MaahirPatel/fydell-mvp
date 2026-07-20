/**
 * Feature flags for the FDE marketplace rebuild.
 * Unfinished surfaces must stay hidden — never ship empty “shell” nav.
 */
export function fdeMarketplaceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FDE_MARKETPLACE === "1";
}

/**
 * Explicit pilot/demo mode. Enables walkthrough helper and a labeled
 * "Enter pilot workspace" fallback when auth secrets are missing.
 * Never silently bypasses production authentication.
 */
export function pilotModeEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PILOT_MODE === "true" ||
    process.env.NEXT_PUBLIC_PILOT_MODE === "1"
  );
}

export function relaySpikeEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_RELAY_SPIKE === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export function relayExecutionMode(): "pyodide" | "node_test" {
  const raw = (process.env.RELAY_EXECUTION || "pyodide").toLowerCase();
  return raw === "node_test" ? "node_test" : "pyodide";
}

/** Legacy Project Meridian surfaces. Off by default — kept only for rollback. */
export function legacyMeridianEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LEGACY_MERIDIAN === "1";
}

/** Partner signup path. Off by default — approval flow is still a stub. */
export function partnerSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PARTNER_SIGNUP === "1";
}

/**
 * Runtime performance budgets for the Project Relay workspace (Checkpoint A).
 * These are targets checked/reported by scripts/test-relay-spike.ts and the
 * browser workspace — not hard client-side enforcement.
 */
export const RELAY_PERF_BUDGETS = {
  workspaceInteractiveMs: 4000,
  monacoReadyMs: 3000,
  pythonReadyMs: 8000,
  localAutosaveMs: 300,
  remoteSnapshotMs: 2000,
  testCommandStartMs: 1000,
  restoreRefreshMs: 5000,
  submitConfirmMs: 5000,
} as const;

/** Nav items that must not render until their milestone ships. */
export const HIDDEN_UNTIL_CORE_LOOP = [
  "network_browse",
  "partner_app",
  "outcomes_full",
  "execution_graph_full",
  "billing_checkout",
] as const;
