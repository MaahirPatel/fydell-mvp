import { headers } from "next/headers";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { candidateSectionFor } from "@/components/candidate/section";
import { ButtonLink } from "@/components/ui/Button";

export default async function CandidateNotFound() {
  const section = candidateSectionFor((await headers()).get("x-pathname"));
  const applications = section === "applications";

  return (
    <CandidateShell current={section}>
      <div className="max-w-[62ch] py-6">
        <h1 className="text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">
          {applications ? "This application is not on your account" : "This page is not on your account"}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[var(--text-secondary)]">
          {applications
            ? "It may have been withdrawn, or it was sent from a different account. Your applications list shows every one you can open."
            : "The project may have been removed, or the link points to a different account. Your Passport lists every project you can open."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href={applications ? "/app/candidate/applications" : "/app/candidate/work-record"} variant="primary" size="md">
            {applications ? "View applications" : "Open your Passport"}
          </ButtonLink>
          <ButtonLink href="/app/candidate" variant="secondary" size="md">
            Back to evaluations
          </ButtonLink>
        </div>
      </div>
    </CandidateShell>
  );
}
