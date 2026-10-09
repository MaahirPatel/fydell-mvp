import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getReceiptView } from "@/lib/receipts/store";
import { receiptExport } from "@/lib/receipts/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET - one of the caller's receipts as an export. Owner-only: another
 * account, or a signed-out visitor, gets the same 404 as a missing id.
 * ?download=1 returns it as a file.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see this receipt." }, { status: 401 });
  const { id } = await context.params;
  const view = await getReceiptView(user.id, id).catch(() => null);
  if (!view) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const body = receiptExport(view, new Date().toISOString());
  const download = new URL(req.url).searchParams.get("download") === "1";
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store",
      ...(download ? { "Content-Disposition": `attachment; filename="fydell-receipt-${view.id}.json"` } : {}),
    },
  });
}
