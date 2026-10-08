import type { ProtectedMaterials, ScenarioPackage, SectionKey } from "../types";

export type Draft = { pkg: ScenarioPackage; prot: ProtectedMaterials };
export type Edit = (section: SectionKey, update: (d: Draft) => Draft) => void;

const lines = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

/** Next free id of the form `${prefix}${n}`, keeping within the server's id patterns. */
export function nextId(prefix: string, taken: string[], max = 99): string {
  for (let n = 1; n <= max; n += 1) if (!taken.includes(`${prefix}${n}`)) return `${prefix}${n}`;
  return `${prefix}${max}`;
}

/**
 * The PATCH body for one section, built from the local draft. Incomplete new
 * items (an empty fact, an unnamed criterion) are left out until they are
 * filled in, so autosave does not fail while someone is still typing.
 */
export function changesFor(section: SectionKey, { pkg, prot }: Draft): { changes: Record<string, unknown> } | { invalid: string } {
  switch (section) {
    case "brief": {
      const acs = pkg.acceptanceCriteria.filter((a) => a.text.trim().length >= 3).map((a) => ({ ...a, text: a.text.trim() }));
      if (acs.length === 0) return { invalid: "Keep at least one acceptance criterion with text." };
      if (pkg.brief.title.trim().length < 2) return { invalid: "Give the work sample a title." };
      return {
        changes: {
          brief: {
            ...pkg.brief,
            title: pkg.brief.title.trim(),
            outcomes: lines(pkg.brief.outcomes),
            constraints: lines(pkg.brief.constraints),
            outOfScope: lines(pkg.brief.outOfScope),
            optionalExtensions: lines(pkg.brief.optionalExtensions),
          },
          acceptanceCriteria: acs,
          setupInstructions: lines(pkg.setupInstructions),
        },
      };
    }
    case "files":
      return {
        changes: {
          starterFiles: pkg.starterFiles,
          reference: { files: prot.reference.files, approaches: lines(prot.reference.approaches) },
          incorrectSolutions: prot.incorrectSolutions.filter((s) => s.description.trim().length >= 3 && s.files.length > 0),
        },
      };
    case "tests":
      return {
        changes: {
          starterFiles: pkg.starterFiles,
          publicTests: pkg.publicTests.filter((t) => t.name.trim() && t.file.trim()),
          protectedTests: prot.protectedTests,
          protectedTestRefs: prot.protectedTestRefs.filter((t) => t.name.trim() && t.file.trim()),
        },
      };
    case "criteria":
      return {
        changes: {
          rubric: pkg.rubric.filter((r) => r.label.trim().length >= 2),
          rubricNotes: Object.fromEntries(Object.entries(prot.rubricNotes).filter(([, v]) => v.trim())),
        },
      };
    case "coworkers":
      return {
        changes: {
          coworkers: pkg.coworkers.map((c) => ({ ...c, topics: lines(c.topics) })),
          coworkerFacts: Object.fromEntries(
            pkg.coworkers.map((c) => [
              c.id,
              (prot.coworkerFacts[c.id] ?? []).filter((f) => f.text.trim().length >= 3).map((f) => ({ ...f, text: f.text.trim(), topics: lines(f.topics ?? []) })),
            ]),
          ),
          reviewQuestion:
            pkg.reviewQuestion && pkg.reviewQuestion.text.trim() && pkg.coworkers.some((c) => c.id === pkg.reviewQuestion?.coworkerId)
              ? { coworkerId: pkg.reviewQuestion.coworkerId, text: pkg.reviewQuestion.text.trim() }
              : null,
        },
      };
    case "policy": {
      if (pkg.aiPolicy.candidateText.trim().length < 10) return { invalid: "Write the AI policy as candidates will read it (at least 10 characters)." };
      return {
        changes: {
          aiPolicy: { ...pkg.aiPolicy, candidateText: pkg.aiPolicy.candidateText.trim() },
          submission: {
            requirements: lines(pkg.submission.requirements),
            handoffPrompts: pkg.submission.handoffPrompts.filter((h) => h.label.trim().length >= 2),
          },
          feedbackPolicy: pkg.feedbackPolicy,
          accommodations: lines(pkg.accommodations),
          interruptionPolicy: pkg.interruptionPolicy,
        },
      };
    }
    case "timing": {
      const { taskMinutes, setupMinutes } = pkg.environment;
      if (!Number.isInteger(taskMinutes) || taskMinutes < 30 || taskMinutes > 180) return { invalid: "Task time must be 30 to 180 minutes." };
      if (!Number.isInteger(setupMinutes) || setupMinutes < 5 || setupMinutes > 30) return { invalid: "Setup time must be 5 to 30 minutes." };
      return { changes: { taskMinutes, setupMinutes } };
    }
  }
}
