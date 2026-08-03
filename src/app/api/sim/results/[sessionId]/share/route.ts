import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken, issueCredential, mintToken } from "@/lib/simulations/db";
import { appUrl } from "@/lib/app-url";

export const runtime = "nodejs";

/**
 * POST: create (or return) a work-receipt share link for a scored session.
 * Stores a SHA-256 hash on sim_credentials.share_token_hash and sets visibility=link.
 * The plaintext token is returned once for the /record/{token} URL.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, candidate_user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.candidate_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: run } = await admin
    .from("sim_analysis_runs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "complete")
    .maybeSingle();
  if (!run) {
    return NextResponse.json({ error: "Result is not ready yet" }, { status: 409 });
  }

  // Ensure credential row exists (issued during scoring; re-issue is idempotent).
  try {
    await issueCredential(sessionId);
  } catch {
    // Session may still be report_ready; issueCredential requires analyzed/report_ready.
  }

  const { data: credential } = await admin
    .from("sim_credentials")
    .select("id, share_token_hash, visibility, credential_number")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!credential) {
    return NextResponse.json({ error: "Credential not issued yet" }, { status: 409 });
  }

  // If already shared, we cannot recover the plaintext token from the hash.
  // Mint a fresh token so the candidate always gets a working link.
  const token = mintToken();
  const tokenHash = hashToken(token);

  const { error } = await admin
    .from("sim_credentials")
    .update({
      share_token_hash: tokenHash,
      visibility: "link",
      updated_at: new Date().toISOString(),
    })
    .eq("id", credential.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recordUrl = `${appUrl()}/record/${token}`;
  return NextResponse.json({
    ok: true,
    token,
    recordUrl,
    credentialNumber: credential.credential_number,
  });
}
