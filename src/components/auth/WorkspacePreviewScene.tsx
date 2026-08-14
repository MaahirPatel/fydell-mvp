import HeroEvidenceScene from "@/components/marketing/home/HeroEvidenceScene";

/**
 * What sits beside the signup and login forms.
 *
 * The visual is the same evidence report the homepage uses, so the promise
 * made at the door is the product the buyer actually receives. Signup adds
 * the three workspace steps above that scene.
 */

const STEPS = [
  {
    n: "01",
    title: "Create your workspace",
    detail: "Name the company. You are the owner.",
  },
  {
    n: "02",
    title: "Invite a candidate",
    detail: "One email. They get a private link to the evaluation.",
  },
  {
    n: "03",
    title: "Review the evidence",
    detail: "Open the conclusion, then open the claims behind it.",
  },
];

export default function WorkspacePreviewScene({
  /** Someone signing in already has a workspace, so the setup steps would be
      stale advice. They see the evaluation on its own. */
  variant = "signup",
}: {
  variant?: "signup" | "login";
}) {
  return (
    <div className="space-y-6">
      {variant === "signup" ? (
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="min-w-0">
              <p className="text-[11.5px] tabular-nums text-[var(--text-tertiary)]">
                {step.n}
              </p>
              <p className="mt-1.5 text-[13.5px] font-medium text-[var(--text-primary)]">
                {step.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[12.5px] text-[var(--text-tertiary)]">
          The report a completed evaluation produces.
        </p>
      )}

      <HeroEvidenceScene />

      {variant === "signup" ? (
        <p className="text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
          No candidate data exists until you invite someone.
        </p>
      ) : null}
    </div>
  );
}
