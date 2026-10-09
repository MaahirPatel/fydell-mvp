import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { orgCan } from "@/lib/orgs/capabilities";
import { listRoles } from "@/lib/hiring/roles";
import { ROLE_STATE_LABEL, type RoleState } from "@/lib/hiring/role-contract";
import { FAMILY_LABEL, LEVEL_LABEL, SPECIALIZATION_LABEL } from "@/lib/eng/taxonomy";
import { ButtonLink } from "@/components/ui/Button";
import { WorkspacePageHeader } from "@/components/employer/WorkspacePage";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/employer/WorkspaceTable";
import { LocalDate } from "@/components/eng/LocalTime";

export const metadata = { title: "Roles" };
export const dynamic = "force-dynamic";

const STATE_BADGE: Record<RoleState, string> = {
  draft: "badge-neutral",
  open: "badge-teal",
  paused: "badge-attention",
  filled: "badge-neutral",
  closed: "badge-neutral",
};

export default async function OpeningsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fopenings");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const view = (await searchParams).view === "archived" ? "archived" : "active";
  const all = await listRoles(org.organizationId);
  const archived = all.filter((r) => r.state === "closed");
  const active = all.filter((r) => r.state !== "closed");
  const roles = view === "archived" ? archived : active;
  const canManage = orgCan(org.role, "manage_candidates");

  const tab = (key: "active" | "archived", label: string, count: number) => (
    <Link
      href={key === "active" ? "/app/employer/openings" : "/app/employer/openings?view=archived"}
      aria-current={view === key ? "page" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-app-meta font-medium ${
        view === key ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
      <span className="tabular-nums text-[var(--text-tertiary)]">{count}</span>
    </Link>
  );

  return (
    <div>
      <WorkspacePageHeader
        title="Roles"
        description="Each role has a page you can share. Applicants choose which Passport projects to send, and every application arrives here with its evidence."
        action={
          canManage ? (
            <ButtonLink href="/app/employer/openings/new" variant="primary" size="sm">
              New role
            </ButtonLink>
          ) : undefined
        }
      />

      <nav className="mt-6 flex gap-1" aria-label="Role filter">
        {tab("active", "Active", active.length)}
        {tab("archived", "Archived", archived.length)}
      </nav>

      <div className="mt-3 overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        {roles.length === 0 ? (
          <div className="px-4 py-8">
            {view === "archived" ? (
              <p className="text-[14px] font-medium text-[var(--text-primary)]">No archived roles</p>
            ) : (
              <>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">No active roles</p>
                <p className="mt-1 max-w-[60ch] text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                  {canManage
                    ? "Describe the engineering work and what reviewers should look for. Nothing is public until you publish, and you confirm it's a genuine opening first."
                    : "Someone with hiring access on your team can create the first role."}
                </p>
              </>
            )}
          </div>
        ) : (
          <Table className="min-w-[640px]">
            <THead>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Applications</TH>
              <TH align="right">Updated</TH>
            </THead>
            <TBody>
              {roles.map((r) => {
                const kind = r.intake.family
                  ? r.intake.specialization && r.intake.specialization !== "general"
                    ? SPECIALIZATION_LABEL[r.intake.specialization]
                    : FAMILY_LABEL[r.intake.family]
                  : "";
                const facts = [kind, r.intake.level ? LEVEL_LABEL[r.intake.level] : r.seniority, r.location].filter(Boolean);
                return (
                  <TR key={r.id}>
                    <TDPrimary>
                      <Link href={`/app/employer/openings/${r.id}`} className="hover:underline hover:underline-offset-4">
                        {r.title}
                      </Link>
                      {facts.length > 0 ? <span className="block text-[12px] font-normal text-[var(--text-tertiary)]">{facts.join(" · ")}</span> : null}
                    </TDPrimary>
                    <TD>
                      <span className={`badge ${STATE_BADGE[r.state]}`}>{view === "archived" ? "Archived" : ROLE_STATE_LABEL[r.state]}</span>
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
                    <TD align="right" className="tabular-nums text-[var(--text-tertiary)]">
                      <LocalDate iso={r.updatedAt} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
