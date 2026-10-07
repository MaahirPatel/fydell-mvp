import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { isEmployerDestination, safeNext, withNext } from "@/lib/auth/safe-next";
import { engAdmin, resolveMembership } from "@/lib/eng/context";
import { roleCan } from "@/lib/eng/permissions";
import { FOCUS_OPTIONS } from "@/lib/eng/roles";
import { CURRENT_SCENARIO } from "@/lib/eng/scenarios";
import type { RoleRow } from "@/lib/eng/types";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import Checklist, { type ChecklistItem } from "@/components/onboarding/Checklist";
import { CreateRoleStep, PublishRole, WorkspaceForm } from "@/components/onboarding/EmployerSteps";
import { InviteCandidateForm } from "@/components/eng/RoleControls";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const linkCls = "font-medium text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--text-secondary)]";

/**
 * First run for a hiring team: workspace, then an engineering role, then the
 * first candidate. Every step's state is read from the database on each
 * render, so a refresh, a second tab or a half-finished setup all show the
 * truth, and each step's controls call the same endpoints as the workspace.
 */
export default async function OnboardingEmployerPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser();
  if (!user) redirect(withNext("/login", "/onboarding/employer"));
  const rawNext = safeNext((await searchParams).next);
  const next = rawNext && isEmployerDestination(rawNext) ? rawNext : null;

  const member = await resolveMembership(user.id, user.email);
  const db = engAdmin();
  let roles: RoleRow[] = [];
  let invited = 0;
  let suggestedName = "";
  if (member) {
    const [rolesRes, invitesRes] = await Promise.all([
      db.from("eng_roles").select("*").eq("organization_id", member.organizationId).neq("status", "archived").order("created_at", { ascending: false }),
      db.from("eng_invitations").select("id", { count: "exact", head: true }).eq("organization_id", member.organizationId).neq("status", "withdrawn"),
    ]);
    roles = (rolesRes.data ?? []) as RoleRow[];
    invited = invitesRes.count ?? 0;
  } else {
    const { data } = await db.from("profiles").select("company_name").eq("id", user.id).maybeSingle();
    suggestedName = ((data as { company_name?: string | null } | null)?.company_name ?? "").trim();
  }

  const published = roles.find((r) => r.status === "published") ?? null;
  const draft = published ? null : (roles.find((r) => r.status === "draft") ?? null);
  const role = published ?? draft;
  const canManage = member ? roleCan(member.role, "manage_roles") : false;
  const canInvite = member ? roleCan(member.role, "invite_candidates") : false;
  const scenario = CURRENT_SCENARIO;
  const roleHref = role ? `/app/employer/engineering/roles/${role.id}` : "/app/employer/engineering";

  const roleItem: ChecklistItem = !member
    ? {
        key: "role",
        title: "Create an engineering role",
        state: "todo",
        detail: `Candidates get ${scenario.title}: about ${scenario.targetMinutes} minutes of practical backend work in their own editor.`,
      }
    : published
      ? {
          key: "role",
          title: "Create an engineering role",
          state: "done",
          detail: (
            <>
              <Link href={roleHref} className={linkCls}>
                {published.title}
              </Link>{" "}
              is published. Every candidate gets {scenario.title}, version {scenario.version}.
            </>
          ),
        }
      : draft
        ? {
            key: "role",
            title: "Publish your engineering role",
            state: "working",
            detail: (
              <>
                <Link href={roleHref} className={linkCls}>
                  {draft.title}
                </Link>{" "}
                is a draft. Preview the task or edit it on the role page, then publish to start inviting.
              </>
            ),
            children: canManage ? <PublishRole roleId={draft.id} /> : null,
          }
        : {
            key: "role",
            title: "Create an engineering role",
            state: "current",
            detail: canManage
              ? `Candidates get ${scenario.title}: about ${scenario.targetMinutes} minutes of practical backend work in their own editor, with one requirement change part-way through.`
              : "An owner, admin or hiring manager in your workspace creates roles.",
            children: canManage ? <CreateRoleStep focusOptions={FOCUS_OPTIONS} /> : null,
          };

  const items: ChecklistItem[] = [
    {
      key: "workspace",
      title: "Create your workspace",
      state: member ? "done" : "current",
      detail: member
        ? `${member.organizationName}. Only people you add can see its roles, candidates and reports.`
        : "Your workspace holds your roles, candidates and reports. Only people you add can see it.",
      children: member ? null : <WorkspaceForm initialName={suggestedName} />,
    },
    roleItem,
    {
      key: "invite",
      title: "Invite your first candidate",
      state: invited > 0 ? "done" : published ? "current" : "todo",
      detail:
        invited > 0
          ? `${invited} candidate${invited === 1 ? "" : "s"} invited. Track them and read released reports from the role page.`
          : published
            ? canInvite
              ? "By their Fydell @handle, or by email. You get a link to share yourself as well."
              : "Your role in this workspace cannot invite candidates. Ask an owner or hiring manager."
            : "Available once a role is published.",
      children: published && canInvite ? <InviteCandidateForm roleId={published.id} /> : null,
    },
  ];

  const doneCount = items.filter((i) => i.state === "done").length;
  const finished = doneCount === items.length;
  const exitHref = next ?? (role ? roleHref : "/app/employer");

  return (
    <OnboardingShell
      title={finished ? "Your workspace is ready" : "Set up hiring on Fydell"}
      lead={
        finished
          ? "Your candidate has the invitation. When they submit, your team reviews the evidence and releases the report."
          : "Three steps to your first evidence report: a workspace, a role with a fixed task, and a candidate."
      }
      meta={
        <p className="text-app-meta tabular-nums text-[var(--text-tertiary)]" aria-live="polite">
          {doneCount} of {items.length} done
        </p>
      }
      skipHref={member ? exitHref : "/app/employer"}
      skipLabel={finished ? "Go to your workspace" : "Skip for now"}
    >
      <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
        <Checklist label="Workspace setup" items={items} />

        <aside className="grid gap-6 border-t border-[var(--border-subtle)] pt-6 text-app-meta leading-[1.6] text-[var(--text-secondary)] lg:sticky lg:top-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
          <div>
            <h2 className="text-app-body font-medium text-[var(--text-primary)]">The task</h2>
            <p className="mt-1">{scenario.summary}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[var(--text-tertiary)]">Target effort</dt>
                <dd className="text-[var(--text-primary)]">About {scenario.targetMinutes} minutes</dd>
              </div>
              <div>
                <dt className="text-[var(--text-tertiary)]">Window</dt>
                <dd className="text-[var(--text-primary)]">{scenario.defaultAllowedMinutes} minutes after Start</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="text-app-body font-medium text-[var(--text-primary)]">What you get back</h2>
            <p className="mt-1">A report your team reviews before release, where each finding cites the code, test, message or handoff behind it.</p>
          </div>
          {member ? (
            <ButtonLink href={exitHref} variant={finished ? "primary" : "secondary"} size="md" className="justify-self-start">
              {next ? "Continue" : finished ? "Go to the role" : "Go to your workspace"}
            </ButtonLink>
          ) : null}
        </aside>
      </div>
    </OnboardingShell>
  );
}
