import { NextResponse } from "next/server";
import { billingConfig } from "@/lib/billing/stripe";
import { reportCompletedSimulations } from "@/lib/billing/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = billingConfig();
  if (!config) return NextResponse.json({ ok: true, skipped: "Billing is not configured." });
  const result = await reportCompletedSimulations(config);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
