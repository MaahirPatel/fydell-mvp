import Link from "next/link";
import { resolveShare } from "@/lib/passport/store";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import PassportView from "@/components/passport/PassportView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared Engineering Passport", robots: { index: false, follow: false } };

export default async function SharedPassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await resolveShare(token);

  if (shared.status !== "ok") {
    return (
      <CandidateShell width="narrow">
        <h1 className="display-serif text-[34px] leading-tight">
          {shared.status === "revoked" ? "This link was revoked." : "This passport link is not valid."}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[var(--text-secondary)]">
          {shared.status === "revoked"
            ? "The developer stopped sharing this passport. Ask them for a new link if you still need it."
            : "Check that the full link was copied. Links stop working when the developer revokes them."}
        </p>
        <Link href="/" className="mt-6 inline-flex text-[14px] font-medium underline underline-offset-4">Go to Fydell</Link>
      </CandidateShell>
    );
  }

  return (
    <CandidateShell width="wide">
      <div className="reveal">
        <PassportView passport={shared.passport} mode="shared" />
      </div>
      <p className="mt-6 text-center text-[13px] text-[var(--text-tertiary)]">
        Hiring? <Link href="/signup?as=employer" className="underline underline-offset-4">Create a workspace</Link> to review shared passports with your team.
      </p>
    </CandidateShell>
  );
}
