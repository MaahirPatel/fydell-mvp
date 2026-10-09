import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { ProofInviteAccessError, startRunFromToken } from "@/lib/sim-engine/proof/db";

const ACCESS_STATUS: Record<ProofInviteAccessError["state"], number> = {
  invalid: 404,
  sign_in: 401,
  wrong_email: 403,
  taken: 409,
  unverified: 403,
};

export async function POST(request: Request) {
  const user = await requireUser();
  const raw: unknown = await request.json().catch(() => null);
  const token = raw && typeof raw === "object" ? (raw as Record<string, unknown>).token : undefined;
  if (typeof token !== "string" || !token || token.length > 100) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  try {
    const started = await startRunFromToken(token, user);
    return NextResponse.json({ runId: started.run.id, invitationId: started.invite.id });
  } catch (err) {
    if (err instanceof ProofInviteAccessError) {
      const body = err.state === "unverified" ? { error: err.message, code: "email_unverified" } : { error: err.message };
      return NextResponse.json(body, { status: ACCESS_STATUS[err.state] });
    }
    console.error("[proof/start]", err);
    return NextResponse.json({ error: "Could not start this run. Try again." }, { status: 500 });
  }
}
