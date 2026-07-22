import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  appendEvent,
  beginSession,
  getSessionForOwner,
  heartbeat,
  recordConsent,
  revealCurveball,
  saveWorkspaceState,
  startPreflight,
  submitSession,
  markProcessing,
  generateEvidenceFindings,
} from "@/lib/fde/relay-session";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const result = await getSessionForOwner(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load session.";
    const status = /not found/i.test(msg) ? 404 : /forbidden/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    switch (action) {
      case "consent": {
        const result = await recordConsent(
          id,
          user.id,
          String(body.consentVersion || "unversioned")
        );
        return NextResponse.json({ ok: true, ...result });
      }
      case "start_preflight": {
        const session = await startPreflight(id, user.id);
        return NextResponse.json({ ok: true, session });
      }
      case "begin": {
        const { session, seedFiles } = await beginSession(id, user.id);
        return NextResponse.json({ ok: true, session, seedFiles });
      }
      case "heartbeat": {
        const result = await heartbeat(id, user.id);
        return NextResponse.json({ ok: true, ...result });
      }
      case "save": {
        const session = await saveWorkspaceState(id, user.id, {
          files: body.files,
          plan: body.plan,
          handoff: body.handoff,
          notes: body.notes,
        });
        return NextResponse.json({ ok: true, session });
      }
      case "command_event": {
        const result = await appendEvent(id, user.id, {
          actor: body.actor,
          eventType: String(body.eventType || "command_run"),
          sourceSurface: body.sourceSurface,
          payload: body.payload || {},
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "curveball": {
        const result = await revealCurveball(id, user.id);
        return NextResponse.json({ ok: true, ...result });
      }
      case "submit": {
        // submitSession is idempotent; markProcessing / generateEvidenceFindings are
        // safe no-ops once the session has already advanced past their stage.
        await submitSession(id, user.id, {
          files: body.files,
          plan: body.plan,
          handoff: body.handoff,
          notes: body.notes,
        });
        await markProcessing(id);
        await generateEvidenceFindings(id);

        const admin = createAdminSupabaseClient();
        const { data: refreshed } = await admin
          .from("relay_sessions")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        return NextResponse.json({ ok: true, session: refreshed });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Session update failed.";
    const status = /not found/i.test(msg) ? 404 : /forbidden/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
