/**
 * Wave 1 permission matrix. Server routes enforce this; the UI only hides
 * actions the actor cannot take.
 */

export type Wave1Actor =
  | "owner"
  | "admin"
  | "reviewer"
  | "viewer"
  | "candidate";

export type Wave1Action =
  | "invite_candidate"
  | "revoke_invitation"
  | "view_report"
  | "release_report"
  | "record_decision"
  | "view_workbench"
  | "submit_attempt"
  | "create_receipt_share"
  | "revoke_receipt_share"
  | "manage_members"
  | "edit_workspace";

const YES: Wave1Actor[] = ["owner", "admin", "reviewer", "viewer", "candidate"];

export const WAVE1_PERMISSIONS: Record<Wave1Action, readonly Wave1Actor[]> = {
  invite_candidate: ["owner", "admin"],
  revoke_invitation: ["owner", "admin"],
  view_report: ["owner", "admin", "reviewer", "viewer"],
  release_report: ["owner", "admin", "reviewer"],
  record_decision: ["owner", "admin", "reviewer"],
  view_workbench: ["candidate"],
  submit_attempt: ["candidate"],
  create_receipt_share: ["candidate"],
  revoke_receipt_share: ["candidate"],
  manage_members: ["owner", "admin"],
  edit_workspace: ["owner", "admin"],
};

export function can(actor: Wave1Actor, action: Wave1Action): boolean {
  return WAVE1_PERMISSIONS[action].includes(actor);
}

export const ALL_ACTORS: readonly Wave1Actor[] = [
  "owner",
  "admin",
  "reviewer",
  "viewer",
  "candidate",
];

void YES;
