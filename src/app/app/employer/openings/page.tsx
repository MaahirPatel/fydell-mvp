import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { orgCan } from "@/lib/orgs/capabilities";
import { listRoles } from "@/lib/hiring/roles";
import { ROLE_STATE_LABEL, type RoleState } from "@/lib/hiring/role-contract";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";

export const metadata = { title: "Roles" };
export const dynamic = "force-dynamic";

const STATE_BADGE: Record<RoleState, string> = {
  draft: "badge-neutral",
  open: "badge-teal",
  paused: "badge-attention",
  filled: "badge-neutral",
  closed: "badge-neutral",
};

export default async function OpeningsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fopenings");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const roles = await listRoles(org.organizationId);
  const canManage = orgCan(org.role, "manage_candidates");

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Each role has a page you can share. Applicants choose which Passport projects to send, and every application arrives here with its evidence."
        action={canManage ? <ButtonLink href="/app/employer/openings/new" variant="primary">New role</ButtonLink> : undefined}
      />

      <div className="mt-6 overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {roles.length === 0 ? (
          <div className="px-5 py-10">
            <p className="text-app-body font-medium text-[var(--text-primary)]">No roles yet</p>
            <p className="mt-1 max-w-[60ch] text-app-meta text-[var(--text-secondary)]">
              {canManage
                ? "Describe the work and what you need to see. Nothing is public until you publish, and you confirm it's a genuine opening first."
                : "Someone with hiring access on your team can create the first role."}
            </p>
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Applications</TH>
              <TH align="right">Updated</TH>
            </THead>
            <TBody>
              {roles.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link href={`/app/employer/openings/${r.id}`} className="font-medium text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                      {r.title}
                    </Link>
                    {r.seniority || r.location ? (
                      <span className="block text-app-meta text-[var(--text-tertiary)]">{[r.seniority, r.location].filter(Boolean).join(" · ")}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <span className={`badge ${STATE_BADGE[r.state]}`}>{ROLE_STATE_LABEL[r.state]}</span>
                  </TD>
                  <TD>
                    {r.applications === 0 ? (
                      <span className="text-[var(--text-tertiary)]">None yet</span>
                    ) : (
                      <>
                        {r.applications}
                        {r.newApplications > 0 ? <span className="ml-2 badge badge-attention">{r.newApplications} new</span> : null}
                      </>
                    )}
                  </TD>
                  <TD align="right" className="text-app-meta text-[var(--text-tertiary)]">
                    {new Date(r.updatedAt).toLocaleDateString()}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
