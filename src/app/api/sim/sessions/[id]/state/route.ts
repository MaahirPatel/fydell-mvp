import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate, saveSessionState } from "@/lib/simulations/db";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";

const MAX_NOTES_CHARS = 200_000;
const MAX_DELIVERABLE_BYTES = 1_000_000;
const MAX_WORKSPACE_BYTES = 8_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Absent fields are left alone; null still clears the two pointer fields. */
function stateBodyError(body: Record<string, unknown>): string | null {
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > MAX_NOTES_CHARS))
    return "notes must be text of at most 200,000 characters.";
  if (body.deliverable !== undefined && (!isRecord(body.deliverable) || JSON.stringify(body.deliverable).length > MAX_DELIVERABLE_BYTES))
    return "deliverable must be an object under 1 MB.";
  if (body.workspace !== undefined && (!isRecord(body.workspace) || JSON.stringify(body.workspace).length > MAX_WORKSPACE_BYTES))
    return "workspace must be an object under 8 MB.";
  for (const key of ["currentTaskId", "openResourceId"] as const) {
    const value = body[key];
    if (value !== undefined && value !== null && (typeof value !== "string" || value.length > 200))
      return `${key} must be an id or null.`;
  }
  const done = body.completedTaskIds;
  if (done !== undefined && (!Array.isArray(done) || done.length > 500 || !done.every((t) => typeof t === "string" && t.length <= 200)))
    return "completedTaskIds must be a list of task ids.";
  return null;
}

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
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("not an object");
    body = raw as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const shapeError = stateBodyError(body);
  if (shapeError) return NextResponse.json({ error: shapeError }, { status: 400 });
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
      { error: publicErrorMessage(err, "Save failed") },
      { status: 400 }
    );
  }
}
