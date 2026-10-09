import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { ROLES } from "@/lib/simulations/roles";
import ReportsList from "@/components/employer/ReportsList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { ExampleReviewModule } from "@/components/employer/ExampleReviewModule";
import { getReportRecords } from "../_lib/data";

export const metadata = { title: "Evidence" };
export const dynamic = "force-dynamic";

export default async function EmployerEvidencePage({
  searchParams,
}: {
  searchParams?: Promise<{ review?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fevidence");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const params = (await searchParams) || {};
  const records = await getReportRecords(org.organizationId);

  return (
    <div>
      <PageHeader
        title="Evidence"
        description="Candidate claims that can be traced back to observed work, with limitations kept visible."
      />
      <div className="mt-7">
        {records.length === 0 ? (
          <Panel>
            <PanelSection
              title="Turn candidate work into hiring evidence"
              description="Evidence appears after a candidate completes enough observable work. Claims remain connected to their source and do not become a score presented as truth."
            >
              <Link
                href="/how-it-works"
                className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-app-body font-medium text-[var(--text-primary)]"
              >
                How evidence works
              </Link>
            </PanelSection>
          </Panel>
        ) : (
          <ReportsList
            rows={records}
            roleOptions={ROLES.map((role) => ({ key: role.key, title: role.title }))}
            initialReviewFilter={params.review === "needs" ? "needs_review" : "all"}
          />
        )}
      </div>
      {records.length === 0 ? <ExampleReviewModule className="mt-6" /> : null}
    </div>
  );
}
