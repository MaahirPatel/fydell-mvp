/** Pure invitation status gate (safe for unit tests; no server-only). */

export interface InvitationGateInput {
  status: string;
  expires_at: string;
}

export function invitationGate(inv: InvitationGateInput): {
  ok: boolean;
  reason?: string;
  code?: "revoked" | "expired" | "completed" | "malformed";
} {
  if (inv.status === "revoked")
    return {
      ok: false,
      code: "revoked",
      reason: "This invitation has been revoked by the employer.",
    };
  if (inv.status === "completed")
    return {
      ok: false,
      code: "completed",
      reason: "This invitation was already used and the simulation has been submitted.",
    };
  if (inv.status === "expired" || new Date(inv.expires_at) < new Date())
    return {
      ok: false,
      code: "expired",
      reason: "This invitation has expired. Ask the employer to resend it.",
    };
  return { ok: true };
}
