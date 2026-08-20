import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getEmployerCatalog } from "../_lib/catalog";
import { getInvitationRecords } from "../_lib/data";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

export const metadata = { title: "Roles" };
export const dynamic = "force-dynamic";

export default async function EmployerRolesPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Froles");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");

  const [catalog, invitations] = await Promise.all([
    getEmployerCatalog(),
    getInvitationRecords(org.organizationId, 400),
  ]);

  return (
    <div>
      <PageHeader
        title="Roles"
        description="The work your team needs done, the evidence required, and every candidate moving through it."
      />
      <div className="mt-7">
        {catalog.length === 0 ? (
          <EmptyState
            title="Create your first role"
            description="Start with the work the person will actually do. Fydell uses it to define what candidates should demonstrate."
          />
        ) : (
          <Panel>
            <div className="grid grid-cols-[minmax(0,1fr)_96px_120px] border-b border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-tertiary)]">
              <span>Role</span>
              <span>Status</span>
              <span className="text-right">Candidates</span>
            </div>
            <ul>
              {catalog.map((role) => {
                const roleInvitations = invitations.filter((item) => item.roleKey === role.key);
                return (
                  <li key={role.key} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    <Link
                      href={`/app/employer/roles/${role.key}`}
                      className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_96px_120px] items-center px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-app-body font-medium text-[var(--text-primary)]">
                          {role.title}
                        </span>
                        <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
                          {role.sims.length === 1
                            ? role.sims[0].title
                            : `${role.sims.length} evaluation paths`}
                        </span>
                      </span>
                      <span className="text-app-meta text-[var(--text-secondary)]">
                        {role.sims.some((simulation) => simulation.templateId) ? "Active" : "Draft"}
                      </span>
                      <span className="text-right text-app-body tabular-nums text-[var(--text-secondary)]">
                        {roleInvitations.length}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
