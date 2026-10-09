import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isCandidateDestination, safeNext, withNext } from "@/lib/auth/safe-next";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { listImportJobs } from "@/lib/passport/import-store";
import { isActive } from "@/lib/passport/import-jobs";
import { getPresentations } from "@/lib/passport/presentation-store";
import { getProfileHub } from "@/lib/profile/store";
import { accountDisplayName } from "@/lib/auth/account-name";
import type { AttemptRow, InvitationRow } from "@/lib/eng/types";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import Checklist, { type ChecklistItem } from "@/components/onboarding/Checklist";
import ProfileBasicsForm from "@/components/onboarding/ProfileBasicsForm";
import ProjectPaths from "@/components/onboarding/ProjectPaths";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

const PROJECTS = "/app/candidate/work-record";

type Invitation = { id: string; title: string; organization: string; href: string; action: string; expiresAt: string | null };

function day(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Open work a hiring team is waiting on. Read the same way as the Evaluations page. */
async function openInvitations(userId: string, email: string): Promise<Invitation[]> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const [{ data: engInvites }, { data: engAttempts }, { data: sessions }] = await Promise.all([
    admin
      .from("eng_invitations")
      .select("id, status, expires_at, role_snapshot")
      .eq("candidate_email", email.toLowerCase())
      .in("status", ["invited", "accepted"])
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
    admin.from("eng_attempts").select("id, invitation_id, status").eq("candidate_user_id", userId),
    admin
      .from("sim_sessions")
      .select("id, status, organizations(name), sim_templates(title)")
      .eq("candidate_user_id", userId)
      .in("status", ["accepted", "active"])
      .order("created_at", { ascending: false }),
  ]);
  const attempts = new Map(
    ((engAttempts ?? []) as Pick<AttemptRow, "id" | "invitation_id" | "status">[]).map((a) => [a.invitation_id, a]),
  );
  const eng = ((engInvites ?? []) as Pick<InvitationRow, "id" | "status" | "expires_at" | "role_snapshot">[]).flatMap((inv): Invitation[] => {
    const attempt = attempts.get(inv.id);
    if (attempt && attempt.status !== "accepted" && attempt.status !== "preflight_passed" && attempt.status !== "in_progress") return [];
    return [
      {
        id: inv.id,
        title: inv.role_snapshot.title,
        organization: inv.role_snapshot.organizationName,
        href: attempt ? `/assess/${attempt.id}` : `/assess/invitations/${inv.id}`,
        action: attempt ? "Continue task" : "Review invitation",
        expiresAt: inv.expires_at,
      },
    ];
  });
  const sims = (sessions ?? []).map((x): Invitation => {
    const t = x.sim_templates as { title?: string } | null;
    const o = x.organizations as { name?: string } | null;
    return {
      id: x.id as string,
      title: t?.title ?? "Simulation",
      organization: o?.name ?? "",
      href: `/sim/${x.id}`,
      action: x.status === "active" ? "Resume" : "Begin",
      expiresAt: null,
    };
  });
  return [...eng, ...sims];
}

export default async function OnboardingEngineerPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser();
  if (!user) redirect(withNext("/login", "/onboarding/engineer"));

  // Someone who arrived through an invitation link goes straight back to it.
  const next = safeNext((await searchParams).next);
  if (next && isCandidateDestination(next)) redirect(next);

  const name = await accountDisplayName(user.id, user.email);
  const [hub, passport, shares, jobs, invitations] = await Promise.all([
    getProfileHub(user.id, name),
    getOwnerPassport(user.id),
    listShares(user.id),
    listImportJobs(user.id),
    openInvitations(user.id, user.email),
  ]);
  const projects = passport?.projects ?? [];
  const presentations = await getPresentations(user.id, projects);

  const { profile } = hub;
  const basicsDone = Boolean(profile.displayName.trim() && profile.handle && profile.headline.trim());
  const analyzed = projects.filter((p) => p.status !== "stale");
  const described = presentations.filter((p) => p.sourceKind === "manual");
  const projectCount = analyzed.length + described.length;
  const importing = jobs.filter((j) => isActive(j.state)).length;
  const liveShares = shares.filter((s) => !s.revokedAt).length;

  const projectNames = [...analyzed.map((p) => p.repoFullName.replace(/^upload\//, "")), ...described.map((p) => p.title)];
  const projectDetail =
    projectCount > 0
      ? `${projectCount} on your profile: ${projectNames.slice(0, 3).join(", ")}${projectNames.length > 3 ? `, and ${projectNames.length - 3} more` : ""}.`
      : importing > 0
        ? `${importing} import${importing === 1 ? "" : "s"} running. You can leave this page; it keeps going.`
        : "Choose one way in. You can add more projects, and change any of them, later.";

  const items: ChecklistItem[] = [
    {
      key: "basics",
      title: "Your basics",
      state: basicsDone ? "done" : "current",
      detail: basicsDone
        ? [profile.displayName, `@${profile.handle}`, profile.headline, profile.location].filter(Boolean).join(" · ")
        : "Your name, a handle employers can invite you by, and one line about what you build.",
      children: (
        <ProfileBasicsForm
          complete={basicsDone}
          initial={{ displayName: basicsDone ? profile.displayName : name, handle: profile.handle, headline: profile.headline, location: profile.location }}
        />
      ),
    },
    {
      key: "project",
      title: "Your first project",
      state: projectCount > 0 ? "done" : importing > 0 ? "working" : basicsDone ? "current" : "todo",
      detail: projectDetail,
      children: <ProjectPaths jobs={jobs} hasProjects={projectCount > 0} initialLogin={passport?.githubLogin ?? ""} />,
    },
    {
      key: "share",
      title: "Share it when you choose",
      state: liveShares > 0 ? "done" : projectCount > 0 ? "current" : "todo",
      detail:
        liveShares > 0
          ? `${liveShares} active share link${liveShares === 1 ? "" : "s"}. You can revoke any of them from Projects.`
          : projectCount > 0
            ? "Your profile is private. A share link shows the projects you pick, and you can revoke it any time."
            : "Your profile stays private until you create a share link. Available once you have a project.",
      children:
        projectCount > 0 && liveShares === 0 ? (
          <ButtonLink href={`${PROJECTS}#share`} variant="secondary" size="md">
            Create a share link
          </ButtonLink>
        ) : null,
    },
  ];

  const doneCount = items.filter((i) => i.state === "done").length;
  const ready = basicsDone && projectCount > 0;

  return (
    <OnboardingShell
      title={invitations.length ? "You have an invitation waiting" : "Set up your Builder Profile"}
      lead={
        invitations.length
          ? "Start with the invitation. A Builder Profile is optional for it, and you can set one up afterwards."
          : "A Builder Profile shows your real projects, with findings that cite the code behind them. It stays private until you share it."
      }
      meta={
        <p className="text-app-meta tabular-nums text-[var(--text-tertiary)]" aria-live="polite">
          {doneCount} of {items.length} done
        </p>
      }
      skipHref={PROJECTS}
      skipLabel={ready ? "Go to your projects" : "Skip for now"}
    >
      {invitations.length ? (
        <section aria-labelledby="invites-heading" className="mb-12 max-w-[760px]">
          <h2 id="invites-heading" className="sr-only">
            Invitations
          </h2>
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">{inv.title}</p>
                  <p className="mt-0.5 text-app-meta text-[var(--text-secondary)]">
                    {[inv.organization, inv.expiresAt ? `Open until ${day(inv.expiresAt)}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ButtonLink href={inv.href} variant="primary" size="md" className="shrink-0 self-start sm:self-auto">
                  {inv.action}
                </ButtonLink>
              </li>
            ))}
          </ul>
          <h2 className="mt-12 text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">Builder Profile</h2>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">Optional. Pick it up whenever suits you.</p>
        </section>
      ) : null}

      <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
        <Checklist label="Builder Profile setup" items={items} />

        <aside className="grid gap-6 border-t border-[var(--border-subtle)] pt-6 text-app-meta leading-[1.6] text-[var(--text-secondary)] lg:sticky lg:top-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1">
          <div>
            <h2 className="text-app-body font-medium text-[var(--text-primary)]">What Fydell reads</h2>
            <p className="mt-1">
              Public repositories at a pinned commit, or the files you approve from a ZIP. Code is read, never run, and every
              finding links to the lines it came from.
            </p>
          </div>
          <div>
            <h2 className="text-app-body font-medium text-[var(--text-primary)]">Who sees it</h2>
            <p className="mt-1">Only you, until you create a share link. You can revoke a link at any time.</p>
          </div>
          {ready ? (
            <ButtonLink href={PROJECTS} variant="primary" size="md" className="justify-self-start">
              Go to your projects
            </ButtonLink>
          ) : null}
        </aside>
      </div>
    </OnboardingShell>
  );
}
