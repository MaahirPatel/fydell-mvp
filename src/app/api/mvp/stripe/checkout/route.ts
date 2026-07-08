import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import {
  createStripeCheckoutSession,
  BillingNotConfiguredError,
  type PlanId
} from "@/lib/mvp/stripe";

export async function POST(req: Request) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({}));
  if (plan !== "team" && plan !== "pilot") {
    return NextResponse.json({ error: "plan must be 'team' or 'pilot'." }, { status: 400 });
  }

  try {
    const result = await createStripeCheckoutSession({
      workspaceId: ctx.workspace.id,
      plan: plan as PlanId,
      customerEmail: ctx.email
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: err.message, configured: false }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : "Could not start checkout.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
