import { readJson, str } from "@/lib/eng/context";
import { addNote } from "@/lib/eng/employer";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "write_notes");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const body = await readJson(req);
  try {
    const note = await addNote(db, member, attempt, str(body?.body, 4001));
    return ok({ noteId: note.id as string }, 201);
  } catch (err) {
    return errorResponse(err, "notes");
  }
}
