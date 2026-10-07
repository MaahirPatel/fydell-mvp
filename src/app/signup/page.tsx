import SignupView, { type SignupAudience } from "@/components/auth/SignupView";
import { EmployerAside, EngineerAside } from "@/components/auth/SignupAside";
import type { SignupPath } from "@/components/auth/SignupForm";
import { partnerSignupEnabled } from "@/lib/auth/flags";
import { isCandidateDestination, isEmployerDestination, safeNext } from "@/lib/auth/safe-next";
import { CURRENT_SCENARIO } from "@/lib/eng/scenarios";

function one(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(one(params.next));
  const as = one(params.as);

  const candidate = isCandidateDestination(next);
  const audience: SignupAudience = candidate ? (next?.startsWith("/jobs/") ? "applicant" : "invited") : "open";

  const initialPath: SignupPath | null = candidate
    ? "fde"
    : isEmployerDestination(next) || as === "employer"
      ? "employer"
      : as === "developer" || as === "engineer"
        ? "fde"
        : null;

  const task = {
    scenarioKey: CURRENT_SCENARIO.key,
    version: CURRENT_SCENARIO.version,
    title: CURRENT_SCENARIO.title,
    summary: CURRENT_SCENARIO.summary,
    targetMinutes: CURRENT_SCENARIO.targetMinutes,
    allowedMinutes: CURRENT_SCENARIO.defaultAllowedMinutes,
    stack: CURRENT_SCENARIO.stack,
  };

  return (
    <SignupView
      audience={audience}
      initialPath={initialPath}
      next={next}
      partnerEnabled={partnerSignupEnabled()}
      engineerAside={<EngineerAside />}
      employerAside={<EmployerAside task={task} />}
    />
  );
}
