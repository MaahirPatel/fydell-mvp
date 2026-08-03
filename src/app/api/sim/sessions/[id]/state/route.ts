import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate, saveSessionState } from "@/lib/simulations/db";

export const runtime = "nodejs";

/** PATCH: autosave working state with optimistic concurrency. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    baseRevision?: number;
    notes?: string;
    deliverable?: Record<string, string | number | string[]>;
    workspace?: Record<string, unknown>;
    currentTaskId?: string | null;
    openResourceId?: string | null;
    completedTaskIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.baseRevision !== "number")
    return NextResponse.json({ error: "baseRevision is required" }, { status: 400 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    if (session.status !== "active")
      return NextResponse.json({ error: "Session is not active" }, { status: 409 });

    const patch: Record<string, unknown> = {};
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.deliverable !== undefined) patch.deliverable = body.deliverable;
    if (body.workspace !== undefined) patch.workspace = body.workspace;
    if (body.currentTaskId !== undefined) patch.current_task_id = body.currentTaskId;
    if (body.openResourceId !== undefined) patch.open_resource_id = body.openResourceId;
    if (body.completedTaskIds !== undefined) patch.completed_task_ids = body.completedTaskIds;

    const result = await saveSessionState(id, body.baseRevision, patch);
    if ("conflict" in result) {
      const c = result.conflict;
      return NextResponse.json(
        {
          ok: false,
          conflict: {
            revision: c.revision,
            notes: c.notes,
            deliverable: c.deliverable,
            workspace: c.workspace,
            currentTaskId: c.current_task_id,
            openResourceId: c.open_resource_id,
            completedTaskIds: c.completed_task_ids,
          },
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, revision: result.revision });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 }
    );
  }
}
