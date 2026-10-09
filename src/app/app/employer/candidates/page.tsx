import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import CandidatesTable from "@/components/employer/CandidatesTable";
import InviteActionButton from "@/components/employer/InviteActionButton";
import { WorkspacePageHeader, WorkspaceSection } from "@/components/employer/WorkspacePage";
import { Panel } from "@/components/ui/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LocalDate } from "@/components/eng/LocalTime";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import { engAdmin } from "@/lib/eng/context";
import { candidateIdentity } from "@/lib/eng/candidate-label";
import { listRoleCandidates, listRoleSummaries } from "@/lib/eng/employer-view";
import { OPERATIONAL_STATES } from "@/lib/eng/state";
import { listOrgApplications } from "@/lib/hiring/applications";
import { getInvitationRecords } from "../_lib/data";

export const metadata = { title: "Candidates" };
export const dynamic = "force-dynamic";

function matches(q: string, ...values: (string | null | undefined)[]): boolean {
  return !q || values.some((v) => (v ?? "").toLowerCase().includes(q));
}

export default async function EmployerCandidatesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fcandidates");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  // Home's attention queue links here filtered to one person, so the row it was
  // talking about is the row you land on.
  const params = (await searchParams) || {};
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const q = initialQuery.trim().toLowerCase();

  const db = engAdmin();
  const [records, applications, assessments] = await Promise.all([
    getInvitationRecords(org.organizationId, 200),
    listOrgApplications(org.organizationId),
    listRoleSummaries(db, org.organizationId),
  ]);
  const assessmentRows = (
    await Promise.all(
      assessments.map(async (role) => (await listRoleCandidates(db, role)).map((row) => ({ role, row }))),
    )
  )
    .flat()
    .filter(({ row }) => !row.invitation.is_preview)
    .filter(({ role, row }) => matches(q, row.invitation.candidate_name, row.invitation.candidate_email, role.title))
    .sort((a, b) => b.row.invitation.created_at.localeCompare(a.row.invitation.created_at));
  const applicationRows = applications.filter((a) => matches(q, a.name, a.email, a.roleTitle));
  const recordRows = records.filter((r) => matches(q, r.name, r.email, r.roleTitle));
  const nothingShown = recordRows.length === 0 && applicationRows.length === 0 && assessmentRows.length === 0;
  const empty = !q && nothingShown;
  const noMatch = Boolean(q) && nothingShown;

  return (
    <div>
      <WorkspacePageHeader
        title="Candidates"
        description="Everyone who applied to one of your roles or was invited to an assessment or simulation, newest first."
        // The empty simulation list carries its own invite button; one per screen.
        action={!empty ? <InviteActionButton label="Invite candidate" size="sm" /> : undefined}
      />

      {!empty ? (
        <form method="get" role="search" className="mt-6 flex flex-wrap items-center gap-2">
          <label htmlFor="candidate-search" className="sr-only">
            Search candidates
          </label>
          <input
            id="candidate-search"
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Search by name, email or role"
            autoComplete="off"
            className="platform-input h-9 w-full max-w-[320px] text-app-control"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q ? (
            <>
              <ButtonLink href="/app/employer/candidates" variant="quiet">
                Clear
              </ButtonLink>
              <p role="status" className="w-full text-app-meta text-[var(--text-tertiary)]">
                Showing candidates matching &ldquo;{initialQuery.trim()}&rdquo;.
              </p>
            </>
          ) : null}
        </form>
      ) : null}

      {noMatch ? (
        <p className="mt-6 text-app-body text-[var(--text-secondary)]">No candidate matches &ldquo;{initialQuery.trim()}&rdquo;.</p>
      ) : null}

      {applicationRows.length > 0 ? (
        <Panel className="mt-6">
          <WorkspaceSection
            title="Applications"
            description={`${applicationRows.length} applied through a role page with their Passport.`}
            bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
          >
            <Table>
              <THead>
                <TH>Candidate</TH>
                <TH>Role</TH>
                <TH>Stage</TH>
                <TH align="right">Applied</TH>
              </THead>
              <TBody>
                {applicationRows.map((a) => (
                  <TR key={a.id}>
                    <TDPrimary>
                      <Link href={`/app/employer/openings/${a.roleId}/applications/${a.id}`} className="hover:underline">
                        {a.name}
                      </Link>
                      <span className="block max-w-[260px] truncate text-app-meta font-normal text-[var(--text-tertiary)]" title={a.email}>
                        {a.email}
                      </span>
                    </TDPrimary>
                    <TD>{a.roleTitle}</TD>
                    <TD>{a.stageLabel}</TD>
                    <TD align="right" className="whitespace-nowrap">
                      <LocalDate iso={a.submittedAt} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </WorkspaceSection>
        </Panel>
      ) : null}

      {assessmentRows.length > 0 ? (
        <Panel className="mt-6">
          <WorkspaceSection
            title="Assessments"
            description={`${assessmentRows.length} invited to a work sample from an assessment.`}
            bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
          >
            <Table>
              <THead>
                <TH>Candidate</TH>
                <TH>Assessment</TH>
                <TH>Status</TH>
                <TH align="right">Invited</TH>
              </THead>
              <TBody>
                {assessmentRows.map(({ role, row }) => {
                  const who = candidateIdentity(row.invitation);
                  const href = row.attempt ? `/app/employer/engineering/attempts/${row.attempt.id}` : `/app/employer/engineering/roles/${role.id}`;
                  return (
                    <TR key={row.invitation.id}>
                      <TDPrimary>
                        <Link href={href} className="hover:underline">
                          {who.primary}
                        </Link>
                        {who.secondary ? (
                          <span className="block max-w-[260px] truncate text-app-meta font-normal text-[var(--text-tertiary)]" title={who.secondary}>
                            {who.secondary}
                          </span>
                        ) : null}
                      </TDPrimary>
                      <TD>{role.title}</TD>
                      <TD>{OPERATIONAL_STATES[row.state].label}</TD>
                      <TD align="right" className="whitespace-nowrap">
                        <LocalDate iso={row.invitation.created_at} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </WorkspaceSection>
        </Panel>
      ) : null}

      {recordRows.length > 0 || empty ? (
        <div className="mt-6">
          {recordRows.length > 0 && (applicationRows.length > 0 || assessmentRows.length > 0) ? (
            <h2 className="mb-3 text-app-section font-semibold text-[var(--text-primary)]">Simulations</h2>
          ) : null}
          <CandidatesTable rows={recordRows} searchable={false} />
        </div>
      ) : null}
    </div>
  );
}
