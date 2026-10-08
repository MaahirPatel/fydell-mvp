import type { ScenarioPackage } from "../authoring/package";
import { ENVIRONMENTS } from "../authoring/registry";
import type { CandidateTask } from "./types";

/**
 * The candidate-facing task, built field by field from the published package.
 * An allowlist rather than a copy-and-delete: protected materials live in a
 * separate table and are never passed in, and package fields a candidate has
 * no reason to read (provenance, generator model, coworker tone and topics)
 * are left out so a future package field is private until added here.
 */
export function buildAuthoredCandidatePayload(pkg: ScenarioPackage, opts: { publicTestCommand: string }): CandidateTask {
  const env = ENVIRONMENTS[pkg.environment.id];
  return {
    title: pkg.brief.title,
    summary: pkg.brief.summary,
    context: pkg.brief.context,
    task: pkg.brief.task,
    outcomes: [...pkg.brief.outcomes],
    constraints: [...pkg.brief.constraints],
    outOfScope: [...pkg.brief.outOfScope],
    optionalExtensions: [...pkg.brief.optionalExtensions],
    interface: pkg.brief.interface,
    acceptanceCriteria: pkg.acceptanceCriteria.map((a) => ({ id: a.id, text: a.text })),
    environment: {
      label: env.label,
      runtime: env.runtime === "python" ? "python" : "node",
      language: pkg.environment.language,
      setupCommands: [...pkg.environment.setupCommands],
      testCommand: pkg.environment.testCommand,
      publicTestCommand: opts.publicTestCommand,
      setupMinutes: pkg.environment.setupMinutes,
      taskMinutes: pkg.environment.taskMinutes,
    },
    setupInstructions: [...pkg.setupInstructions],
    starterFiles: pkg.starterFiles.map((f) => ({ path: f.path, content: f.content })),
    publicTests: pkg.publicTests.map((t) => ({ name: t.name, file: t.file, criterionIds: [...t.criterionIds] })),
    coworkers: pkg.coworkers.map((c) => ({ name: c.name, title: c.title, responsibilities: c.responsibilities })),
    aiPolicy: pkg.aiPolicy.candidateText,
    submission: {
      requirements: [...pkg.submission.requirements],
      handoffPrompts: pkg.submission.handoffPrompts.map((p) => ({ id: p.id, label: p.label, help: p.help })),
    },
    accommodations: [...pkg.accommodations],
    interruptionPolicy: pkg.interruptionPolicy,
    feedbackPolicy: pkg.feedbackPolicy,
    howReviewed: pkg.rubric.map((r) => ({ label: r.label, explanation: r.candidateExplanation, judgedBy: r.judgedBy })),
  };
}
