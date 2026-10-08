import SignupView, { type SignupAudience, type SignupDemo } from "@/components/auth/SignupView";
import type { SignupPath } from "@/components/auth/SignupForm";
import { partnerSignupEnabled } from "@/lib/auth/flags";
import { isCandidateDestination, isEmployerDestination, safeNext } from "@/lib/auth/safe-next";

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

  // The demo workspace is offered only on open sign-up, never to someone arriving with an invitation or application.
  const demo: SignupDemo = audience !== "open" ? "none" : one(params.intent) === "demo" ? "first" : "offer";

  return <SignupView audience={audience} initialPath={initialPath} next={next} partnerEnabled={partnerSignupEnabled()} demo={demo} />;
}
