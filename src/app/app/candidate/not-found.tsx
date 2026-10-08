import { headers } from "next/headers";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { candidateSectionFor } from "@/components/candidate/section";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CandidateNotFound() {
  const section = candidateSectionFor((await headers()).get("x-pathname"));
  const applications = section === "applications";

  return (
    <CandidateShell current={section} crumbs={[{ label: "Not found" }]}>
      <h1 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.018em] text-[var(--text-primary)]">
        {applications ? "This application is not on your account" : "This page is not on your account"}
      </h1>
      <EmptyState
        className="mt-6"
        title={applications ? "It may have been withdrawn" : "It may have been removed"}
        description={
          applications
            ? "Or it was sent from a different account. Your applications list shows every one you can open."
            : "Or the link points to a different account. Your Passport lists every project you can open."
        }
        action={
          <ButtonLink href={applications ? "/app/candidate/applications" : "/app/candidate/work-record"} variant="primary" size="sm">
            {applications ? "View applications" : "Open your Passport"}
          </ButtonLink>
        }
      />
    </CandidateShell>
  );
}
