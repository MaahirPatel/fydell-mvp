import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  listMessages,
} from "@/lib/simulations/db";
import { toMicroCandidateView } from "@/lib/simulations/candidate-view";
import { isMicroContent } from "@/lib/simulations/micro-types";

export const runtime = "nodejs";

/**
 * GET: the full candidate payload - session, sanitized content, working
 * state, messages.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    const content = await getVersionContent(session.template_version_id);
    if (!isMicroContent(content)) {
      return NextResponse.json(
        { error: "This simulation format is retired." },
        { status: 410 }
      );
    }

    const [state, messages] = await Promise.all([getSessionState(id), listMessages(id)]);
    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        durationMinutes: session.duration_minutes,
        startedAt: session.started_at,
        endsAt: session.ends_at,
        submittedAt: session.submitted_at,
      },
      content: toMicroCandidateView(content),
      state: {
        revision: state.revision,
        currentTaskId: state.current_task_id,
        notes: state.notes,
        deliverable: state.deliverable,
        workspace: state.workspace,
        completedTaskIds: state.completed_task_ids,
      },
      messages: messages.map((m) => ({
        id: m.id,
        thread: m.thread,
        stakeholderId: m.stakeholder_id,
        sender: m.sender,
        body: m.body,
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load session";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 404 });
  }
}
