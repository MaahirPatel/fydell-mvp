import Link from "next/link";
import { getPublicProfile } from "@/lib/profile/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportView from "@/components/passport/PassportView";
import ProfileHeader from "@/components/profile/ProfileHeader";
import EvidenceTimeline, { ProvenanceBadge } from "@/components/profile/EvidenceTimeline";
import { PROVIDER_LABELS } from "@/lib/profile/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Engineering Profile", robots: { index: false, follow: false } };

/**
 * Public engineering profile behind a passport share link. Reuses the share
 * mechanics (token, revocation, field projection); the profile layer adds
 * identity, connected-account labels, and a privacy-filtered evidence
 * timeline above the shared passport section.
 */
export default async function SharedProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getPublicProfile(token);

  if (shared.status !== "ok") {
    return (
      <CandidateShell width="narrow">
        <h1 className="display-serif stat-value leading-tight">
          {shared.status === "revoked" ? "This link was revoked." : "This profile link is not valid."}
        </h1>
        <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          {shared.status === "revoked"
            ? "The developer stopped sharing this profile. Ask them for a new link if you still need it."
            : "Check that the full link was copied. Links stop working when the developer revokes them."}
        </p>
        <Link href="/" className="mt-6 inline-flex text-app-body font-medium underline underline-offset-4">Go to Fydell</Link>
      </CandidateShell>
    );
  }

  const { profile, accounts, timeline, passport } = shared.public;

  return (
    <CandidateShell width="wide">
      <div className="reveal">
        <p className="text-app-meta font-medium text-[var(--text-secondary)]">Engineering Profile</p>
        <div className="mt-3">
          <ProfileHeader profile={profile} />
        </div>
        {accounts.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {accounts.map((a) => (
              <span key={`${a.provider}-${a.label}`} className="badge badge-neutral">
                {PROVIDER_LABELS[a.provider]} · {a.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {timeline.length ? (
        <section className="mt-8">
          <h2 className="text-app-section font-semibold tracking-[-0.012em]">Evidence</h2>
          <p className="mt-1 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
            Newest first. Each entry is labeled with where it came from —{" "}
            <ProvenanceBadge provenance="observed-simulation" /> work verified inside Fydell simulations,{" "}
            <ProvenanceBadge provenance="repository-observation" /> code read from connected repositories,{" "}
            <ProvenanceBadge provenance="local-import" /> history the engineer supplied themselves.
          </p>
          <div className="mt-5">
            <EvidenceTimeline items={timeline} />
          </div>
        </section>
      ) : null}

      <section className="mt-10 border-t border-[var(--border-subtle)] pt-8">
        <PassportView passport={passport} mode="shared" />
      </section>

      <p className="mt-6 text-center text-app-meta text-[var(--text-tertiary)]">
        Hiring? <Link href="/signup?as=employer" className="underline underline-offset-4">Create a workspace</Link> to review shared profiles with your team.
      </p>
    </CandidateShell>
  );
}
