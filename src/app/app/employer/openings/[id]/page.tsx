import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { orgCan } from "@/lib/orgs/capabilities";
import { appUrl } from "@/lib/app-url";
import { getRole, listRequirementVersions } from "@/lib/hiring/roles";
import { listApplicationsForRole } from "@/lib/hiring/applications";
import { listActiveMembers } from "@/lib/hiring/members";
import { VISIBILITY_LABEL } from "@/lib/hiring/intake-contract";
import { isStage, publishProblems, REMOTE_LABEL, ROLE_STATE_LABEL, STAGE_LABEL, type ApplicationStage } from "@/lib/hiring/role-contract";
import { EVIDENCE_LABEL, FAMILY_LABEL, LEVEL_LABEL, SPECIALIZATION_LABEL, WORK_SAMPLE_POLICY_LABEL } from "@/lib/eng/taxonomy";
import { ButtonLink } from "@/components/ui/Button";
import { WorkspacePageHeader } from "@/components/employer/WorkspacePage";
import { Table, TBody, TD, TH, THead, TR } from "@/components/employer/WorkspaceTable";
import RoleStatusControls from "@/components/hiring/RoleStatusControls";
import StageSelect from "@/components/hiring/StageSelect";
import CoveragePanel from "@/components/employer/roles/CoveragePanel";

export const metadata = { title: "Role" };
export const dynamic = "force-dynamic";

const DECISION_LABEL: Record<string, string> = { none: "No decision", advance: "Advance", hold: "Hold", decline: "Decline" };

function Panel({ id, title, children, action }: { id: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[14px] font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function OpeningPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string; q?: string; withdrawn?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/openings/${id}`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const role = await getRole(org.organizationId, id);
  if (!role) notFound();

  const stage: ApplicationStage | "all" = isStage(sp.stage) ? sp.stage : "all";
  const q = (sp.q ?? "").slice(0, 100);
  const includeWithdrawn = sp.withdrawn === "1";
  const [applications, versions, members] = await Promise.all([
    listApplicationsForRole(org.organizationId, role.id, { stage, q, includeWithdrawn }),
    listRequirementVersions(org.organizationId, role.id),
    listActiveMembers(org.organizationId),
  ]);
  const filtered = stage !== "all" || !!q || includeWithdrawn;
  const canManage = orgCan(org.role, "manage_candidates");
  const canDecide = orgCan(org.role, "record_decisions");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = host ? `${h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https")}://${host}` : appUrl();
  const publicUrl = role.slug ? `${origin}/jobs/${role.slug}` : null;
  const editable = canManage && role.state !== "filled" && role.state !== "closed";
  const { intake } = role;
  const kind = intake.family
    ? intake.specialization && intake.specialization !== "general"
      ? `${FAMILY_LABEL[intake.family]}, ${SPECIALIZATION_LABEL[intake.specialization]}`
      : FAMILY_LABEL[intake.family]
    : "";
  const facts = [kind, intake.level ? LEVEL_LABEL[intake.level] : role.seniority, role.employmentType, role.location, role.remotePolicy ? REMOTE_LABEL[role.remotePolicy] : ""].filter(Boolean);
  const memberName = (uid: string) => members.find((m) => m.userId === uid)?.label ?? "Former member";
  const required = intake.requirements.filter((r) => r.confirmed && r.kind === "required");
  const preferred = intake.requirements.filter((r) => r.confirmed && r.kind === "preferred");

  return (
    <div>
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/openings" className="hover:underline">Roles</Link> / {role.title}
      </p>
      <WorkspacePageHeader
        className="mt-4"
        title={role.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`badge ${role.state === "open" ? "badge-teal" : role.state === "paused" ? "badge-attention" : "badge-neutral"}`}>
              {role.state === "closed" ? "Archived" : ROLE_STATE_LABEL[role.state]}
            </span>
            {facts.length > 0 ? <span>{facts.join(" · ")}</span> : null}
            <span className="text-[var(--text-tertiary)]">Requirements version {role.requirementsVersion}</span>
          </span>
        }
        action={editable ? <ButtonLink href={`/app/employer/openings/${role.id}/edit`} variant="secondary" size="sm">Edit role</ButtonLink> : undefined}
      />

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-8">
          <section aria-labelledby="applicants-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="applicants-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">Applications</h2>
              {applications.length > 0 || filtered ? (
                <form method="get" className="flex flex-wrap items-center gap-2" role="search">
                  <label htmlFor="applicant-search" className="sr-only">Search applicants</label>
                  <div className="w-48">
                    <input id="applicant-search" name="q" defaultValue={q} placeholder="Name or email" className="platform-input h-8 text-app-meta" />
                  </div>
                  <label htmlFor="stage-filter" className="sr-only">Stage</label>
                  <div className="w-40">
                    <select id="stage-filter" name="stage" defaultValue={stage} className="platform-select h-8 text-app-meta">
                      <option value="all">All stages</option>
                      {(Object.keys(STAGE_LABEL) as ApplicationStage[]).map((s) => (
                        <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 text-app-meta text-[var(--text-secondary)]">
                    <input type="checkbox" name="withdrawn" value="1" defaultChecked={includeWithdrawn} className="accent-[var(--control-solid)]" />
                    Show withdrawn
                  </label>
                  <button type="submit" className="h-8 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-meta font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                    Apply filters
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
              {applications.length === 0 ? (
                <div className="px-5 py-8">
                  {filtered ? (
                    <p className="text-app-body text-[var(--text-secondary)]">
                      No applications match these filters. <Link href={`/app/employer/openings/${role.id}`} className="underline underline-offset-4">Clear filters</Link>
                    </p>
                  ) : role.state === "draft" ? (
                    <p className="text-app-body text-[var(--text-secondary)]">Publish the role page to start receiving applications.</p>
                  ) : (
                    <p className="text-app-body text-[var(--text-secondary)]">No applications yet. Share the role page link with people whose work you&apos;d like to see.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <THead>
                    <TH>Applicant</TH>
                    <TH>Evidence</TH>
                    <TH>Stage</TH>
                    <TH>Next action</TH>
                    <TH align="right">Applied</TH>
                  </THead>
                  <TBody>
                    {applications.map((a) => (
                      <TR key={a.id} className={a.status === "withdrawn" ? "opacity-60" : undefined}>
                        <TD>
                          <Link href={`/app/employer/openings/${role.id}/applications/${a.id}`} className="font-medium text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                            {a.name}
                          </Link>
                          <span className="block text-app-meta text-[var(--text-tertiary)]">{a.email}</span>
                        </TD>
                        <TD className="text-app-meta">
                          {a.status === "withdrawn"
                            ? "Withdrawn"
                            : [
                                a.projects > 0 ? `${a.projects} project${a.projects === 1 ? "" : "s"}` : a.evidenceAvailable ? "" : "No Passport projects",
                                a.links > 0 ? `${a.links} link${a.links === 1 ? "" : "s"}` : "",
                                a.hasNote ? "Note" : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                          {a.requirementsVersion !== role.requirementsVersion ? (
                            <span className="block text-[var(--text-tertiary)]">Applied to version {a.requirementsVersion}</span>
                          ) : null}
                        </TD>
                        <TD>
                          {canDecide && a.status === "submitted" ? (
                            <StageSelect applicationId={a.id} stage={a.stage} applicantName={a.name} />
                          ) : (
                            <span className="text-app-meta">{a.stageLabel}</span>
                          )}
                        </TD>
                        <TD className="text-app-meta">
                          {a.nextAction}
                          {a.decision !== "none" ? <span className="block text-[var(--text-tertiary)]">Decision: {DECISION_LABEL[a.decision] ?? a.decision}</span> : null}
                        </TD>
                        <TD align="right" className="text-app-meta text-[var(--text-tertiary)]">
                          {new Date(a.submittedAt).toLocaleDateString()}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
            <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
              Applications are listed newest first. Fydell doesn&apos;t rank or score applicants; open one to review its evidence against each requirement.
            </p>
          </section>

          <section aria-labelledby="work-heading" className="grid gap-4">
            <h2 id="work-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">The work</h2>
            {role.description ? (
              <p className="max-w-[72ch] whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{role.description}</p>
            ) : (
              <p className="text-app-meta text-[var(--text-secondary)]">No summary yet. Add one before publishing.</p>
            )}
            {intake.responsibilities.length > 0 ? (
              <div>
                <h3 className="text-app-meta font-medium text-[var(--text-primary)]">Responsibilities</h3>
                <ul className="mt-1.5 grid list-disc gap-1 pl-5 text-app-meta leading-[1.5] text-[var(--text-body)]">
                  {intake.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {intake.ownership ? (
              <p className="text-app-meta text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Ownership: </span>
                {intake.ownership}
              </p>
            ) : null}
            {intake.teamContext ? (
              <p className="max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">Team and product: </span>
                {intake.teamContext}
              </p>
            ) : null}
            {intake.languages.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Languages and technologies">
                {intake.languages.map((l) => (
                  <li key={l} className="rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-selected)] px-2 py-0.5 text-app-meta text-[var(--text-primary)]">
                    {l}
                  </li>
                ))}
              </ul>
            ) : null}
            {intake.family && intake.specialization ? <CoveragePanel family={intake.family} specialization={intake.specialization} /> : null}
          </section>
        </div>

        <aside className={`grid content-start gap-5 ${role.state === "draft" ? "order-first xl:order-none" : ""}`}>
          <Panel id="page-heading" title="Role page">
            {canManage ? (
              <RoleStatusControls roleId={role.id} state={role.state} publicUrl={publicUrl} problems={publishProblems(role, false)} />
            ) : (
              <p className="text-app-meta text-[var(--text-secondary)]">{publicUrl ?? "Not published yet."}</p>
            )}
            <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">Visibility: {VISIBILITY_LABEL[intake.visibility].label}</p>
          </Panel>

          <Panel id="req-heading" title="What reviewers look for" action={<span className="text-app-meta text-[var(--text-tertiary)]">Version {role.requirementsVersion}</span>}>
            {required.length === 0 ? (
              <p className="text-app-meta text-[var(--text-secondary)]">No required capabilities yet. Reviews are organized around them, so add at least one before publishing.</p>
            ) : (
              <ol className="grid list-decimal gap-1.5 pl-5 text-app-meta leading-[1.5] text-[var(--text-body)]">
                {required.map((r) => (
                  <li key={r.id}>{r.text}</li>
                ))}
              </ol>
            )}
            {preferred.length > 0 ? (
              <>
                <h3 className="mt-4 text-app-meta font-medium text-[var(--text-primary)]">Preferred</h3>
                <ul className="mt-1.5 grid gap-1 text-app-meta text-[var(--text-secondary)]">
                  {preferred.map((r) => (
                    <li key={r.id}>{r.text}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {versions.length > 0 ? (
              <details className="mt-4 text-app-meta">
                <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Version history ({versions.length})
                </summary>
                <ol className="mt-2 grid gap-2">
                  {versions.map((v) => (
                    <li key={v.version} className="rounded-[6px] border border-[var(--border-subtle)] px-3 py-2">
                      <span className="font-medium text-[var(--text-primary)]">Version {v.version}</span>
                      <span className="text-[var(--text-tertiary)]">
                        {" "}· {new Date(v.createdAt).toLocaleDateString()} · {v.requirements.length} requirement{v.requirements.length === 1 ? "" : "s"}
                        {v.changedBy ? ` · ${memberName(v.changedBy)}` : ""}
                      </span>
                      {v.changeReason ? <span className="mt-0.5 block text-[var(--text-secondary)]">{v.changeReason}</span> : null}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </Panel>

          <Panel id="evidence-heading" title="Evidence and work samples">
            <p className="text-app-meta text-[var(--text-secondary)]">{WORK_SAMPLE_POLICY_LABEL[intake.workSamplePolicy]}</p>
            <ul className="mt-2 grid gap-1 text-app-meta text-[var(--text-body)]">
              {intake.acceptedEvidence.map((e) => (
                <li key={e}>{EVIDENCE_LABEL[e]}</li>
              ))}
            </ul>
          </Panel>

          <Panel id="people-heading" title="People">
            <dl className="grid gap-1.5 text-app-meta">
              <dt className="text-[var(--text-tertiary)]">Hiring owner</dt>
              <dd className="text-[var(--text-body)]">{intake.hiringOwner ? memberName(intake.hiringOwner) : "Not set"}</dd>
              <dt className="mt-1 text-[var(--text-tertiary)]">Reviewers</dt>
              <dd className="text-[var(--text-body)]">{intake.reviewerIds.length > 0 ? intake.reviewerIds.map(memberName).join(", ") : "Not set"}</dd>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
