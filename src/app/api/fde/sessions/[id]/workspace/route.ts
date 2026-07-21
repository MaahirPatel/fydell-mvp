import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  applyRuntimeToEngine,
  dispatchWorkspaceCommand,
  loadOrInitEngine,
  maybeTriggerAdaptiveEvent,
  persistEngine,
} from "@/lib/relay/workspace";
import type { WorkspaceCommand } from "@/lib/relay/workspace";
import { toCandidateFileMap } from "@/lib/relay/workspace/seed";
import { getSessionForOwner } from "@/lib/fde/relay-session";
import { initFromFiles } from "@/lib/relay/workspace/reducer";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/** GET — load canonical engine state + maybe adaptive event. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;

    const sessionBundle = await getSessionForOwner(id, user.id);
    let state = await loadOrInitEngine(id, user.id);

    if (state.headVersion === 0 || Object.keys(state.artifacts).length === 0) {
      const files = toCandidateFileMap(
        ((sessionBundle.session.workspace_state as { files?: Record<string, string> })?.files ||
          {}) as Record<string, string>
      );
      state = initFromFiles(id, files, "Northbeam Logistics");
      await persistEngine(id, user.id, state, [
        { eventType: "workspace.initialized", payload: { fileCount: Object.keys(files).length } },
      ]);
    }

    let adaptiveText: string | null = state.curveballText;
    if (!adaptiveText && sessionBundle.session.started_at && sessionBundle.session.ends_at) {
      const started = new Date(sessionBundle.session.started_at).getTime();
      const ends = new Date(sessionBundle.session.ends_at).getTime();
      const now = Date.now();
      const elapsedRatio = Math.max(0, Math.min(1, (now - started) / Math.max(1, ends - started)));
      const remainingMinutes = Math.max(0, (ends - now) / 60000);
      const adaptive = await maybeTriggerAdaptiveEvent(id, user.id, {
        elapsedRatio,
        remainingMinutes,
      });
      if (adaptive.triggered && adaptive.text) {
        adaptiveText = adaptive.text;
        state = await loadOrInitEngine(id, user.id);
      }
    }

    return NextResponse.json({
      ok: true,
      state,
      acknowledgedHeadVersion: state.headVersion,
      candidateFacts:
        (sessionBundle as { candidateFacts?: string[] }).candidateFacts ||
        [],
      companyName: "Northbeam Logistics",
      curveballText: adaptiveText,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load workspace engine";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** POST — dispatch command, runtime result, or adaptive poll. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    if (body.action === "runtime_result") {
      const result = await applyRuntimeToEngine(id, user.id, {
        command: String(body.command || ""),
        ok: Boolean(body.ok),
        exitCode: Number(body.exitCode ?? 1),
        stdout: String(body.stdout || ""),
        stderr: String(body.stderr || ""),
        workspaceVersion: Number(body.workspaceVersion || 0),
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 409 });
    }

    if (body.action === "adaptive_tick") {
      const adaptive = await maybeTriggerAdaptiveEvent(id, user.id, {
        elapsedRatio: Number(body.elapsedRatio || 0),
        remainingMinutes: Number(body.remainingMinutes || 30),
      });
      const state = await loadOrInitEngine(id, user.id);
      return NextResponse.json({ ok: true, adaptive, state });
    }

    const command: WorkspaceCommand = {
      commandId: String(body.commandId || `cmd_${Date.now()}`),
      type: body.type,
      expectedHeadVersion: Number(body.expectedHeadVersion ?? 0),
      actor: body.actor || "candidate",
      payload: body.payload || {},
    };

    const result = await dispatchWorkspaceCommand(id, user.id, command);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Dispatch failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
