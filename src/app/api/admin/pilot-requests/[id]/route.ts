import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { updatePilotRequestStatus } from "@/lib/ops/pilot-requests";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { processEmailOutbox } from "@/lib/ops/process-outbox";
import { writeAudit } from "@/lib/ops/platform-roles";
import { approvePilotRequest } from "@/lib/ops/approve-pilot";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformRoleApi([
    "super_admin",
    "admin",
    "operator",
    "support",
  ]);
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "status") {
      await updatePilotRequestStatus({
        id,
        status: String(body.status || "reviewing"),
        actorEmail: auth.email,
        note: typeof body.note === "string" ? body.note : undefined,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "note") {
      if (!isSupabaseConfigured()) {
        return NextResponse.json({ error: "Supabase required" }, { status: 503 });
      }
      const note = String(body.note || "").trim().slice(0, 4000);
      if (!note) {
        return NextResponse.json({ error: "Note required" }, { status: 400 });
      }
      const db = getSupabaseAdmin();
      await db.from("pilot_request_notes").insert({
        pilot_request_id: id,
        author_email: auth.email,
        body: note,
      });
      await db.from("pilot_request_events").insert({
        pilot_request_id: id,
        event_type: "note_added",
        description: "Internal note added",
      });
      await writeAudit({
        actorEmail: auth.email,
        action: "pilot_request_note_added",
        entityType: "pilot_request",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "process-email") {
      const result = await processEmailOutbox(25);
      return NextResponse.json({ ok: true, result });
    }

    if (action === "approve") {
      const result = await approvePilotRequest({
        pilotRequestId: id,
        actorEmail: auth.email,
      });
      try {
        await processEmailOutbox(10);
      } catch {
        // outbox retains rows
      }
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Action failed" },
      { status: 500 }
    );
  }
}
