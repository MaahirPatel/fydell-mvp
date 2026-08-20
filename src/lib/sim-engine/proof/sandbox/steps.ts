export const SANDBOX_STEPS = [
  "invited",
  "active",
  "initial_work_submitted",
  "pass_a_processing",
  "defense_ready",
  "defense_in_progress",
  "defense_submitted",
  "pass_b_processing",
  "review_pending",
  "finalized",
] as const;

export type SandboxStep = (typeof SANDBOX_STEPS)[number];

const ALLOWED: Record<SandboxStep, SandboxStep[]> = {
  invited: ["active"],
  active: ["initial_work_submitted"],
  initial_work_submitted: ["pass_a_processing"],
  pass_a_processing: ["defense_ready"],
  defense_ready: ["defense_in_progress"],
  defense_in_progress: ["defense_submitted"],
  defense_submitted: ["pass_b_processing"],
  pass_b_processing: ["review_pending"],
  review_pending: ["finalized"],
  finalized: [],
};

export function isSandboxStep(value: string): value is SandboxStep {
  return (SANDBOX_STEPS as readonly string[]).includes(value);
}

export function canTransition(from: SandboxStep, to: SandboxStep): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: SandboxStep, to: SandboxStep): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal sandbox transition: ${from} → ${to}`);
  }
}

export function proofStageFor(step: SandboxStep): string {
  if (step === "invited" || step === "active") return "DISCOVERY";
  if (step === "initial_work_submitted" || step === "pass_a_processing") return "FINAL_SUBMITTED";
  if (step === "defense_ready" || step === "defense_in_progress" || step === "defense_submitted") return "DEFENSE";
  return "COMPLETE";
}

export function proofStatusFor(step: SandboxStep): string {
  if (step === "finalized") return "ready";
  if (step === "review_pending" || step === "pass_b_processing") return "awaiting_review";
  if (
    step === "defense_ready" ||
    step === "defense_in_progress" ||
    step === "defense_submitted" ||
    step === "pass_a_processing"
  ) {
    return "awaiting_defense";
  }
  return "in_progress";
}

export const CANDIDATE_MUTATION_STEPS: SandboxStep[] = [
  "active",
  "defense_ready",
  "defense_in_progress",
];
