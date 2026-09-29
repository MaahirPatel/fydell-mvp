import { readJson, str } from "@/lib/eng/context";
import { flagFinding } from "@/lib/eng/employer";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "flag_finding");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const body = await readJson(req);
  try {
    const flag = await flagFinding(db, member, attempt, str(body?.findingId, 64), str(body?.reason, 2001));
    return ok({ flagId: flag.id as string }, 201);
  } catch (err) {
    return errorResponse(err, "flags");
  }
}
