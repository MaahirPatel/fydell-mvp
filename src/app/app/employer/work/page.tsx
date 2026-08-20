import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getInvitationRecords } from "../_lib/data";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";

export const metadata = { title: "Work" };
export const dynamic = "force-dynamic";

function workState(record: Awaited<ReturnType<typeof getInvitationRecords>>[number]): string {
  if (record.reportReady) return "Complete";
  if (record.progress === "Scoring") return "Submitted";
  if (record.progress === "In progress") return "In progress";
  return "Not started";
}

export default async function EmployerWorkPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fwork");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const records = await getInvitationRecords(org.organizationId, 300);

  return (
    <div>
      <PageHeader
        title="Work"
        description="Active and completed work episodes moving through the hiring process."
      />
      <div className="mt-7">
        {records.length === 0 ? (
          <EmptyState
            title="Start collecting work evidence"
            description="Invite a candidate to complete realistic work for an active role. The work episode appears here once they begin."
            action={
              <Link
                href="/app/employer/candidates"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
              >
                Invite candidate
              </Link>
            }
          />
        ) : (
          <Panel>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,0.6fr)_120px_96px] border-b border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-tertiary)]">
              <span>Candidate</span>
              <span>Role</span>
              <span>State</span>
              <span className="text-right">Open</span>
            </div>
            <ul>
              {records.map((record) => (
                <li
                  key={record.invitationId}
                  className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_minmax(150px,0.6fr)_120px_96px] items-center border-b border-[var(--border-subtle)] px-4 py-2.5 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-app-body font-medium text-[var(--text-primary)]">
                      {record.name || record.email}
                    </span>
                    <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
                      {record.simulation}
                    </span>
                  </span>
                  <span className="truncate text-app-body text-[var(--text-secondary)]">{record.roleTitle}</span>
                  <span className="text-app-body text-[var(--text-secondary)]">{workState(record)}</span>
                  <span className="text-right">
                    {record.reportReady && record.sessionId ? (
                      <Link
                        href={`/app/employer/candidates/${record.sessionId}`}
                        className="text-app-body font-medium text-[var(--action-ink)] hover:underline"
                      >
                        Evidence
                      </Link>
                    ) : (
                      <Link
                        href={`/app/employer/candidates?q=${encodeURIComponent(record.email)}`}
                        className="text-app-body font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Candidate
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
