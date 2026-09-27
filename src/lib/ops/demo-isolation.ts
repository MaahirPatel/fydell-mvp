import "server-only";

/**
 * Demo isolation backend (DEMO-05).
 *
 * The public demo runs on fictional fixtures. Any server-side demo action is
 * classified through this guard:
 *  - BLOCKED in demo context: sending real email, creating paid evaluation
 *    jobs, creating charges, writing to non-demo records.
 *  - ALLOWED: reading fixtures, resetting the demo namespace.
 *
 * Demo records are namespaced (`demo_*`); the reset route may only touch
 * tables/rows inside a registered demo namespace (public.demo_namespaces).
 */

export type DemoMutationKind =
  | "send_real_email"
  | "paid_evaluation_job"
  | "create_charge"
  | "write_live_record"
  | "reset_demo_namespace"
  | "read_fixture";

const DEMO_BLOCKED: Record<DemoMutationKind, boolean> = {
  send_real_email: true,
  paid_evaluation_job: true,
  create_charge: true,
  write_live_record: true,
  reset_demo_namespace: false,
  read_fixture: false,
};

export interface DemoContext {
  /** true when the request is served in the anonymous public demo */
  isDemo: boolean;
  /** namespace for demo writes, e.g. "demo_public" */
  namespace?: string;
}

/** Throws when a mutation is not allowed in the demo context. */
export function assertDemoMutationAllowed(kind: DemoMutationKind, ctx: DemoContext): void {
  if (!ctx.isDemo) return;
  if (DEMO_BLOCKED[kind]) {
    const err = new Error(`Demo isolation: "${kind}" is blocked in the public demo.`);
    (err as { status?: number }).status = 403;
    throw err;
  }
}

/** Demo DB writes must land inside a registered demo_* namespace. */
export function assertDemoNamespace(namespace: string | undefined): asserts namespace is string {
  if (!namespace || !/^demo_[a-z0-9_]+$/.test(namespace)) {
    const err = new Error("Demo writes require a registered demo_* namespace.");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

/**
 * Conversion guard (DEMO-06 backend half): when an anonymous demo visitor
 * signs up, their new account must not inherit fictional evidence.
 */
export function sanitizeDemoConversion<T extends Record<string, unknown>>(
  liveProfile: T,
  demoArtifacts: Record<string, unknown>
): { profile: T; dropped: string[] } {
  const dropped = Object.keys(demoArtifacts ?? {});
  return { profile: { ...liveProfile }, dropped };
}
