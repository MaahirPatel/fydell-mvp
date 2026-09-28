import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertDemoMutationAllowed, assertDemoNamespace } from "@/lib/ops/demo-isolation";
import { checkThrottle, createMemoryThrottleStore, THROTTLE_POLICIES, throttleIdentity } from "@/lib/security/throttles";

export const runtime = "nodejs";

/**
 * Demo reset (DEMO-05 backend isolation).
 *
 * Resets ONLY the named demo namespace. The namespace must match demo_* and be
 * registered in public.demo_namespaces; any other target is refused. Real
 * records, email sends, evaluation jobs and charges are unreachable from here:
 * assertDemoMutationAllowed blocks them in demo context, and this route
 * performs no external sends at all.
 */
const throttleStore = createMemoryThrottleStore();

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const namespace =
    typeof body === "object" && body !== null && "namespace" in body
      ? String((body as { namespace: unknown }).namespace ?? "")
      : "";

  try {
    assertDemoMutationAllowed("reset_demo_namespace", { isDemo: true, namespace });
    assertDemoNamespace(namespace);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 403;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Forbidden" }, { status });
  }

  const policy = THROTTLE_POLICIES.demo_reset;
  const throttle = checkThrottle("demo_reset", throttleIdentity(req, policy), throttleStore);
  if (!throttle.ok) {
    return NextResponse.json(
      { error: "Too many reset attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
    );
  }

  let admin: ReturnType<typeof createAdminSupabaseClient>;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json({ error: "Demo reset is not configured on this deployment." }, { status: 503 });
  }

  // The namespace must be a registered demo namespace — never a live one.
  const { data: registered, error: lookupError } = await admin
    .from("demo_namespaces")
    .select("namespace")
    .eq("namespace", namespace)
    .maybeSingle();
  if (lookupError || !registered) {
    return NextResponse.json({ error: "Unknown demo namespace." }, { status: 404 });
  }

  // Mark the reset. Demo fixture rows live client-side today (the demo page
  // states "nothing you do is saved"); this timestamp is the server-side
  // record that the namespace was reset, and any future server-side demo
  // tables must scope their deletes to this namespace only.
  const { error: updateError } = await admin
    .from("demo_namespaces")
    .update({ reset_at: new Date().toISOString() })
    .eq("namespace", namespace);
  if (updateError) {
    return NextResponse.json({ error: "Demo reset failed." }, { status: 500 });
  }
  return NextResponse.json({ reset: true, namespace });
}
