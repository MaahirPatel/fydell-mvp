import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { EvidenceReport } from "@/components/sim/EvidenceReport";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { getReportRecords } from "../../_lib/data";

export const dynamic = "force-dynamic";

const TABS = ["brief", "evidence", "work", "defense", "interview", "outcome"] as const;
type CandidateTab = (typeof TABS)[number];

export default async function CandidateDecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const [{ sessionId }, query, reports] = await Promise.all([
    params,
    searchParams,
    getReportRecords(org.organizationId),
  ]);
  const report = reports.find((item) => item.sessionId === sessionId);
  if (!report) redirect("/app/employer/evidence");
  const tab = TABS.includes(query.tab as CandidateTab) ? (query.tab as CandidateTab) : "brief";

  return (
    <div>
      <PageHeader
        title={report.candidate || report.email}
        description={report.roleTitle || report.simulation}
        meta={
          <span className="text-app-body font-medium text-[var(--text-primary)]">
            {report.needsReview ? "Review evidence" : "Decision recorded"}
          </span>
        }
      />
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]" aria-label="Candidate">
        {TABS.map((item) => (
          <Link
            key={item}
            href={`/app/employer/candidates/${sessionId}?tab=${item}`}
            aria-current={tab === item ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b px-3 py-2.5 text-app-body font-medium capitalize ${
              tab === item
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item}
          </Link>
        ))}
      </nav>
      <div className="mt-7">
        {tab === "brief" || tab === "evidence" ? <EvidenceReport sessionId={sessionId} /> : null}
        {tab === "work" ? (
          <Panel>
            <PanelSection
              title="Recorded work"
              description="The evidence report links claims to the candidate's submitted work. Raw work remains governed by the same workspace access boundary."
            />
          </Panel>
        ) : null}
        {tab === "defense" ? (
          <Panel>
            <PanelSection
              title="Defense"
              description="A defense appears only when this candidate was asked a follow-up question. Nothing is synthesized to fill this state."
            />
          </Panel>
        ) : null}
        {tab === "interview" || tab === "outcome" ? (
          <Panel>
            <PanelSection
              title={tab === "interview" ? "Interview finding" : "Outcome"}
              description={
                tab === "interview"
                  ? "Record what the interview confirmed, contradicted, or left unresolved."
                  : "Hiring outcomes appear after an authorized workspace member records them."
              }
            />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
