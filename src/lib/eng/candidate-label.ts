import type { InvitationRow } from "./types";

/**
 * How an employer sees a candidate. Engineers invited by @handle keep their
 * email private, so employer views show the handle in its place.
 */
export function candidateIdentity(inv: Pick<InvitationRow, "candidate_name" | "candidate_email" | "candidate_handle">): {
  primary: string;
  secondary: string | null;
  secondaryLabel: "Handle" | "Email";
} {
  const handle = inv.candidate_handle ? `@${inv.candidate_handle}` : null;
  if (handle) return { primary: inv.candidate_name || handle, secondary: inv.candidate_name ? handle : null, secondaryLabel: "Handle" };
  return { primary: inv.candidate_name || inv.candidate_email, secondary: inv.candidate_name ? inv.candidate_email : null, secondaryLabel: "Email" };
}
