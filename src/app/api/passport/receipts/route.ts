import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listReceipts } from "@/lib/receipts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET - the caller's own receipts, newest first. A client whose response was lost can always find its receipt here. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your receipts." }, { status: 401 });
  try {
    return NextResponse.json({ receipts: await listReceipts(user.id) });
  } catch {
    return NextResponse.json({ error: "Could not load your receipts." }, { status: 500 });
  }
}
