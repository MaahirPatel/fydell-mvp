import { NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/ops/process-outbox";

export const runtime = "nodejs";

/**
 * Cron / manual worker for email outbox.
 * Protect with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processEmailOutbox(50);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processor failed" },
      { status: 500 }
    );
  }
}
