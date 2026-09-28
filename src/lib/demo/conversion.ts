/**
 * Clean demo conversion (DEMO-06).
 *
 * "Get started" from the demo retains the visitor's chosen audience and
 * useful route context, but NEVER copies fictional evidence into a live
 * account. This module is the client-side half: it builds the conversion
 * context that signup carries forward. The server-side half is
 * sanitizeDemoConversion() in src/lib/ops/demo-isolation.ts, which drops
 * demo artifacts from the created profile.
 */

export type DemoAudience = "candidate" | "employer";

export interface DemoConversionInput {
  /** Audience the visitor chose (candidate / employer toggle). */
  audience: DemoAudience;
  /** Where the visitor was when they clicked Get started. */
  returnRoute: string;
  /** IDs of fictional evidence the visitor interacted with. */
  demoEvidenceIds: string[];
  /** Demo namespace the visitor was browsing, if any. */
  demoNamespace: string | null;
}

export interface ConversionContext {
  audience: DemoAudience;
  /** Sanitized return route (relative, allowlisted). */
  returnRoute: string;
  /** Always empty: fictional evidence is never carried into a live account. */
  evidence: [];
  /** Always null: the demo namespace is never attached to the account. */
  namespace: null;
}

const ALLOWED_RETURN_PREFIXES = ["/demo", "/get-started", "/signup", "/product", "/"] as const;

/**
 * Keep only safe relative routes. Anything else falls back to /get-started
 * so a crafted returnRoute can never bounce signup somewhere unexpected.
 */
export function sanitizeReturnRoute(route: string): string {
  if (!route.startsWith("/")) return "/get-started";
  if (route.startsWith("//")) return "/get-started";
  const ok = (ALLOWED_RETURN_PREFIXES as readonly string[]).some(
    (p) => route === p || route.startsWith(p + "/") || route.startsWith(p + "#") || route.startsWith(p + "?")
  );
  return ok ? route : "/get-started";
}

/**
 * Build the conversion context. The audience and sanitized route survive;
 * every fictional artifact is dropped. Returns the list of dropped evidence
 * IDs so the UI can be explicit about what was NOT carried over.
 */
export function buildConversionContext(input: DemoConversionInput): {
  context: ConversionContext;
  droppedEvidence: string[];
} {
  return {
    context: {
      audience: input.audience,
      returnRoute: sanitizeReturnRoute(input.returnRoute),
      evidence: [],
      namespace: null,
    },
    droppedEvidence: [...input.demoEvidenceIds],
  };
}
