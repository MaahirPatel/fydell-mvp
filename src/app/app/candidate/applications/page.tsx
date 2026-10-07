import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { listMyApplications } from "@/lib/hiring/applications";
import { CandidateShell } from "@/components/candidate/CandidateShell";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function MyApplicationsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/applications")}`);
  const applications = await listMyApplications(user.id);

  return (
    <CandidateShell current="applications">
      <h1 className="text-app-page text-[var(--text-primary)]">Applications</h1>
      <p className="mt-2 max-w-[62ch] text-app-body text-[var(--text-body)]">
        Roles you&apos;ve applied to through a role page, what you shared with each team, and where each application stands.
      </p>
      {applications.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-8">
          <p className="text-app-body font-medium text-[var(--text-primary)]">No applications yet</p>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
            When a team shares a role page with you, apply from there with your Passport. It will show up here with a receipt.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          {applications.map((a) => (
            <li key={a.id}>
              <Link href={`/app/candidate/applications/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--surface-hover)]">
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--text-primary)]">{a.roleTitle}</span>
                  <span className="block text-app-meta text-[var(--text-secondary)]">
                    {a.organizationName} · Applied {new Date(a.submittedAt).toLocaleDateString()}
                  </span>
                </span>
                <span className={`badge ${a.status === "withdrawn" ? "badge-neutral" : a.waitingOnYou ? "badge-attention" : "badge-teal"}`}>
                  {a.status === "withdrawn" ? "Withdrawn" : a.waitingOnYou ? "Waiting on you" : "Sent"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CandidateShell>
  );
}
