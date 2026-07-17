/**
 * Feature flags for the FDE marketplace rebuild.
 * Unfinished surfaces must stay hidden — never ship empty “shell” nav.
 */
export function fdeMarketplaceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FDE_MARKETPLACE === "1";
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

/** Nav items that must not render until their milestone ships. */
export const HIDDEN_UNTIL_CORE_LOOP = [
  "network_browse",
  "partner_app",
  "outcomes_full",
  "execution_graph_full",
  "billing_checkout",
] as const;
