import RepairConsole, { type RepairActionOption } from "@/components/admin/RepairConsole";
import { hasPermission, type AdminPermission } from "@/lib/ops/admin-permissions";
import { requirePlatformRole } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

const ACTIONS: readonly (RepairActionOption & { permission: AdminPermission })[] = [
  { id: "approve_organization", label: "Approve organization", fields: ["organizationId"], permission: "commercial.edit" },
  {
    id: "connect_user_to_org",
    label: "Connect user to org",
    fields: ["userId", "organizationId", "role", "reason"],
    permission: "accounts.membership",
  },
  { id: "extend_invitation", label: "Extend invitation", fields: ["invitationId", "days"], permission: "invitations.manage" },
  { id: "revoke_invitation", label: "Revoke invitation", fields: ["invitationId"], permission: "invitations.manage" },
  { id: "cancel_session", label: "Cancel unsubmitted session", fields: ["sessionId", "reason"], permission: "ops.act" },
  { id: "retry_email", label: "Retry failed email", fields: ["outboxId"], permission: "ops.act" },
  { id: "requeue_report", label: "Requeue report review", fields: ["reportId"], permission: "reports.review" },
  { id: "explain_setup_required", label: "Explain setup-required routing", fields: ["userId"], permission: "accounts.view" },
];

export default async function AdminRepairPage() {
  const admin = await requirePlatformRole(["super_admin", "admin", "operator", "support", "reviewer"]);
  const actions = ACTIONS.filter((a) => hasPermission(admin.roles, a.permission)).map(({ id, label, fields }) => ({
    id,
    label,
    fields,
  }));

  return (
    <div>
      <h1 className="text-app-page" style={{ fontWeight: 500, letterSpacing: "-0.03em" }}>
        Repair console
      </h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        Audited recovery tools for pilot edge cases. Each action records who ran it, the state before and after, and
        why. Never assigns passwords and never edits submitted evidence.
      </p>
      <RepairConsole actions={actions} />
    </div>
  );
}
