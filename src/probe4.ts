import { transitionInvitation, type InvitationState, type InvitationEvent } from "@/lib/invitations/states";
import { fail } from "@/lib/invitations/types";

export function probe(inv: { state: InvitationState }, event: InvitationEvent) {
  const t = transitionInvitation(inv.state, event);
  if (!t.ok) return fail(t.code === "terminal_state" ? "bad_state" : "illegal_transition", t.message);
  return t.next;
}
