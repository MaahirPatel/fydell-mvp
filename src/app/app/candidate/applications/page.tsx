import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { listMyApplications, type ApplicantView } from "@/lib/hiring/applications";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Status, type StatusKind } from "@/components/ui/report";
import { LocalDate } from "@/components/eng/LocalTime";
import s from "@/components/candidate/candidate.module.css";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

type Group = { key: string; title: string; kind: StatusKind; label: string; items: ApplicantView[] };

export default async function MyApplicationsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/applications")}`);
  const applications = await listMyApplications(user.id);

  const groups: Group[] = [
    { key: "waiting", title: "Waiting on you", kind: "attention", label: "Waiting on you", items: applications.filter((a) => a.status !== "withdrawn" && a.waitingOnYou) },
    { key: "sent", title: "With the team", kind: "success", label: "Sent", items: applications.filter((a) => a.status !== "withdrawn" && !a.waitingOnYou) },
    { key: "withdrawn", title: "Withdrawn", kind: "neutral", label: "Withdrawn", items: applications.filter((a) => a.status === "withdrawn") },
  ].filter((g): g is Group => g.items.length > 0);

  return (
    <CandidateShell current="applications">
      <CandidatePageHead
        title="Applications"
        lead="Roles you applied to from a role page, what you shared with each team, and where each application stands."
      />
      {applications.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No applications yet"
          description="When a hiring team shares a role page with you, apply there with your Passport. The application shows up here with a receipt."
          action={
            <ButtonLink href="/app/candidate/work-record" variant="primary" size="sm">
              Get your Passport ready
            </ButtonLink>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`applications-${g.key}`} className={s.section}>
              <div className={s.sectionHead}>
                <h2 id={`applications-${g.key}`} className={s.sectionTitle}>
                  {g.title}
                </h2>
                <span className={s.sectionCount}>{g.items.length}</span>
              </div>
              <ul className="mt-0.5 divide-y divide-[var(--border-subtle)]">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/app/candidate/applications/${a.id}`}
                      className="group flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[var(--text-primary)]">{a.roleTitle}</span>
                        <span className="mt-px block truncate text-[13px] text-[var(--text-tertiary)]">
                          {a.organizationName} · Applied <LocalDate iso={a.submittedAt} />
                        </span>
                      </span>
                      <Status kind={g.kind} icon={false}>
                        {g.label}
                      </Status>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--text-quaternary)] group-hover:text-[var(--text-tertiary)] sm:block" strokeWidth={1.75} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </CandidateShell>
  );
}
