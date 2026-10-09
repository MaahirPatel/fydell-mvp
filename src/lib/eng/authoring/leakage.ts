import type { ChatMessage } from "@/lib/ai/provider";
import { buildAuthoredCandidatePayload } from "../authored/candidate-payload";
import {
  assistantPrompt,
  eventDisclosure,
  finalHandoffMessage,
  initialContextMessage,
  teammatePrompt,
  validReviewQuestion,
} from "../authored/collaboration-core";
import type { PackageFile, ProtectedMaterials, ScenarioPackage } from "./package";

/**
 * Detects evaluator-only material (reference solution, protected tests,
 * rubric notes, known wrong solutions) in text a candidate or a simulated
 * teammate can see. Pure, so the validator, unit tests and live acceptance
 * scripts share one definition of a leak.
 */

export type PrivateFingerprints = {
  /** Distinctive code lines from the reference solution and protected tests that are not already in the starter. */
  lines: Array<{ text: string; source: "reference" | "protected_test" }>;
  /** Protected test names that do not occur anywhere in the starter project. */
  testNames: string[];
  /** Sentences from rubric notes, reference approaches and wrong-solution descriptions. */
  phrases: Array<{ text: string; source: "rubric_note" | "reference_approach" | "incorrect_solution" }>;
};

export type Leak = { context: string; source: string; excerpt: string };

const MIN_LINE_CHARS = 25;
const MIN_PHRASE_CHARS = 40;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Lines the candidate does not already have: anything found in the starter, even inside a longer line, is not private. */
function distinctiveLines(files: PackageFile[], starterText: string): string[] {
  const out = new Set<string>();
  for (const f of files) {
    for (const raw of f.content.split("\n")) {
      const line = normalize(raw);
      if (line.replace(/\s/g, "").length < MIN_LINE_CHARS || starterText.includes(line)) continue;
      out.add(line);
    }
  }
  return [...out];
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map(normalize)
    .filter((s) => s.length >= MIN_PHRASE_CHARS);
}

export function privateFingerprints(pkg: ScenarioPackage, prot: ProtectedMaterials): PrivateFingerprints {
  const starterText = normalize(pkg.starterFiles.map((f) => f.content).join("\n"));
  const lines: PrivateFingerprints["lines"] = [
    ...distinctiveLines(prot.reference.files, starterText).map((text) => ({ text, source: "reference" as const })),
    ...distinctiveLines(prot.protectedTests, starterText).map((text) => ({ text, source: "protected_test" as const })),
  ];
  const testNames = [
    ...new Set(
      prot.protectedTestRefs
        .map((r) => normalize(r.name.split(".").pop() ?? r.name))
        .filter((n) => n.length >= 12 && !starterText.includes(n)),
    ),
  ];
  const phrases: PrivateFingerprints["phrases"] = [
    ...Object.values(prot.rubricNotes).flatMap(sentences).map((text) => ({ text, source: "rubric_note" as const })),
    ...prot.reference.approaches.flatMap(sentences).map((text) => ({ text, source: "reference_approach" as const })),
    ...prot.incorrectSolutions.flatMap((s) => sentences(s.description)).map((text) => ({ text, source: "incorrect_solution" as const })),
  ];
  return { lines, testNames, phrases };
}

export function findLeaks(context: string, text: string, fp: PrivateFingerprints): Leak[] {
  const hay = normalize(text);
  const leaks: Leak[] = [];
  for (const l of fp.lines) if (hay.includes(l.text)) leaks.push({ context, source: l.source === "reference" ? "reference solution" : "protected test code", excerpt: l.text.slice(0, 80) });
  for (const n of fp.testNames) if (hay.includes(n)) leaks.push({ context, source: "protected test name", excerpt: n.slice(0, 80) });
  for (const p of fp.phrases) if (hay.includes(p.text)) leaks.push({ context, source: p.source.replace("_", " "), excerpt: p.text.slice(0, 80) });
  return leaks;
}

function promptText(messages: ChatMessage[]): string {
  return messages.map((m) => m.content).join("\n");
}

/**
 * Every text the package exposes to a candidate or feeds a simulated
 * teammate or the coding assistant, built with the same functions the
 * runtime uses. A teammate prompt is built with all of that teammate's
 * facts, the most it could ever disclose.
 */
export function candidateVisibleContexts(pkg: ScenarioPackage, prot: ProtectedMaterials, publicTestCommand: string): Array<{ context: string; text: string }> {
  const out: Array<{ context: string; text: string }> = [];
  out.push({ context: "Candidate task payload", text: JSON.stringify(buildAuthoredCandidatePayload(pkg, { publicTestCommand })) });
  out.push({ context: "Scenario event disclosure", text: eventDisclosure(pkg) });
  const intro = initialContextMessage(pkg);
  if (intro) out.push({ context: "Opening team message", text: intro.body });
  const review = validReviewQuestion(pkg);
  if (review) out.push({ context: "Review question", text: review.text });
  const handoff = finalHandoffMessage(pkg);
  if (handoff) out.push({ context: "Final handoff message", text: handoff.body });
  for (const c of pkg.coworkers) {
    const facts = prot.coworkerFacts[c.id] ?? [];
    out.push({ context: `Teammate context for ${c.name}`, text: promptText(teammatePrompt(pkg, c, facts, [], "What should I know about this task?")) });
  }
  out.push({ context: "Coding assistant context", text: promptText(assistantPrompt(pkg, "Explain the starter project.", pkg.starterFiles.map((f) => ({ path: f.path, content: f.content })))) });
  return out;
}

export function packageLeaks(pkg: ScenarioPackage, prot: ProtectedMaterials, publicTestCommand: string): { leaks: Leak[]; contexts: number; fingerprints: number } {
  const fp = privateFingerprints(pkg, prot);
  const contexts = candidateVisibleContexts(pkg, prot, publicTestCommand);
  const leaks = contexts.flatMap((c) => findLeaks(c.context, c.text, fp));
  return { leaks, contexts: contexts.length, fingerprints: fp.lines.length + fp.testNames.length + fp.phrases.length };
}
