import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { getProfileHub } from "@/lib/profile/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportView from "@/components/passport/PassportView";
import SharePanel from "@/components/passport/SharePanel";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileCompleteness, { type PresenceItem } from "@/components/profile/ProfileCompleteness";
import ProfileIdentityForm from "@/components/profile/ProfileIdentityForm";
import ConnectedAccounts from "@/components/profile/ConnectedAccounts";
import EditorImport from "@/components/profile/EditorImport";
import EvidenceTimeline from "@/components/profile/EvidenceTimeline";
import PassportConnectSection from "@/components/profile/PassportConnectSection";
import CandidateQuestions from "@/components/candidate/CandidateQuestions";

export const metadata = { title: "Engineering Profile" };
export const dynamic = "force-dynamic";

function Section({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <h2 className="text-app-section font-semibold tracking-[-0.012em]">{title}</h2>
      {hint ? <p className="mt-1 text-app-body leading-[1.6] text-[var(--text-secondary)]">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CandidateProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ github?: string; repos?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/profile")}`);

  const params = await searchParams;
  const [hub, passport, shares] = await Promise.all([
    getProfileHub(user.id, user.email.split("@")[0]),
    getOwnerPassport(user.id),
    listShares(user.id),
  ]);

  const initialRepos = (params.repos ?? "").split(",").filter((r) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(r)).slice(0, 3);
  const initialLogin = /^[A-Za-z0-9-]{1,39}$/.test(params.github ?? "") ? (params.github as string) : (passport?.githubLogin ?? "");

  // Data-presence completeness: what the engineer has actually added, never a
  // quality score. The anchors below must match the Section ids further down.
  const presence: PresenceItem[] = [
    {
      key: "identity",
      label: "Identity",
      present: hub.profile.displayName.trim().length > 0,
      anchor: "#profile-identity",
    },
    {
      key: "github",
      label: "GitHub evidence",
      present: hub.hasGithubEvidence,
      anchor: "#profile-passport",
    },
    {
      key: "simulation",
      label: "Simulation result",
      present: hub.timeline.some((item) => item.kind === "simulation"),
      // Results come from invitations on the candidate home, not from an
      // in-page section, so a missing item links out instead of anchoring.
      anchor: "/app/candidate",
    },
    {
      key: "editor",
      label: "Editor history",
      present: hub.editorImports.length > 0,
      anchor: "#profile-editor",
    },
  ];

  return (
    <CandidateShell width="wide" current="profile">
      <div className="reveal">
        <p className="text-app-meta font-medium text-[var(--text-secondary)]">Engineering Profile</p>
        <div className="mt-3">
          <ProfileHeader profile={hub.profile} />
        </div>
        <p className="mt-3 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
          One profile for everything: who you are, the accounts you connect, and the evidence your work leaves behind. Simulations you complete, repositories you analyze, and editor history you choose to import.
        </p>
      </div>

      <div className="mt-7">
        <ProfileCompleteness items={presence} />
      </div>

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section id="profile-timeline" title="Evidence timeline" hint="Every source, newest first. Provenance is labeled on each entry. Observed work, repository observations, and self-supplied imports are never mixed.">
            <EvidenceTimeline items={hub.timeline} />
          </Section>

          <Section
            id="profile-passport"
            title="Engineering passport"
            hint="Analyze public GitHub repositories. Fydell cites what the code demonstrates, line by line. The passport lives here now, as a section of your profile."
          >
            <PassportConnectSection initialLogin={initialLogin} initialRepos={initialRepos} />
            {passport && passport.projects.length ? (
              <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
                <PassportView passport={passport} mode="owner" />
              </div>
            ) : null}
          </Section>

          <Section
            id="profile-editor"
            title="Editor history"
            hint="Import work summaries from VS Code or Cursor running on your own machine. Only the summary is stored; the file is discarded after parsing."
          >
            <EditorImport />
          </Section>

          <Section
            id="profile-questions"
            title="Employer questions"
            hint="Follow-up questions from hiring teams reviewing your shared work. Respond here; your answer goes back to the employer attached to the requirement."
          >
            <CandidateQuestions />
          </Section>
        </div>

        <div className="space-y-6">
          <Section id="profile-identity" title="Identity" hint="How you appear to employers.">
            <ProfileIdentityForm initial={hub.profile} />
          </Section>

          <Section title="Connected accounts" hint="Where your evidence comes from.">
            <ConnectedAccounts initial={hub.accounts} />
          </Section>

          {passport && passport.projects.length ? (
            <SharePanel initialShares={shares} />
          ) : (
            <p className="rounded-[10px] border border-dashed border-[var(--border-default)] p-5 text-app-body leading-[1.6] text-[var(--text-secondary)]">
              Sharing becomes available once your passport has at least one analyzed project.
            </p>
          )}
        </div>
      </div>
    </CandidateShell>
  );
}
