import type { Citation, Finding, ProbeResult, ReportBrief } from "./types";

export interface EvidenceIndex {
  /** path -> line count */
  files: Map<string, number>;
  probes: Map<string, ProbeResult["outcome"]>;
  messageIds: Set<string>;
  handoffFields: Set<string>;
}

const DIMENSIONS = new Set(["correctness", "engineering_judgment", "requirement_response", "work_communication"]);
const LEVELS = new Set(["strong", "adequate", "weak", "insufficient_evidence"]);
const CATEGORIES = new Set(["coding_result", "interpretation", "communication"]);
const KINDS = new Set(["strength", "gap", "observation"]);
const BASES = new Set(["observed", "hypothesis"]);

function isString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

function stringList(value: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: string[] = [];
  for (const item of value) {
    if (!isString(item, 1, maxLen)) return null;
    out.push(item.trim());
  }
  return out;
}

export function parseBrief(value: unknown): { ok: true; brief: ReportBrief } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "The brief is missing." };
  const v = value as Record<string, unknown>;
  if (!isString(v.summary, 1, 1200)) return { ok: false, error: "Write a summary of up to 1,200 characters." };
  const strengths = stringList(v.strengths, 8, 400);
  const gaps = stringList(v.gaps, 8, 400);
  const limitations = stringList(v.limitations, 8, 400);
  const followUps = stringList(v.followUps, 8, 400);
  if (!strengths || !gaps || !limitations || !followUps) return { ok: false, error: "Each list holds up to 8 items of up to 400 characters." };
  if (!Array.isArray(v.dimensions)) return { ok: false, error: "Rate each rubric dimension." };
  const dimensions: ReportBrief["dimensions"] = [];
  for (const d of v.dimensions) {
    const row = d as Record<string, unknown>;
    if (!DIMENSIONS.has(row?.key as string) || !LEVELS.has(row?.level as string) || !isString(row?.rationale, 1, 600)) {
      return { ok: false, error: "Each dimension needs a level and a rationale of up to 600 characters." };
    }
    dimensions.push({ key: row.key as ReportBrief["dimensions"][number]["key"], level: row.level as ReportBrief["dimensions"][number]["level"], rationale: (row.rationale as string).trim() });
  }
  return { ok: true, brief: { summary: (v.summary as string).trim(), strengths, gaps, limitations, followUps, dimensions } };
}

export function parseFindings(value: unknown): { ok: true; findings: Finding[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > 30) return { ok: false, error: "Up to 30 findings are allowed." };
  const findings: Finding[] = [];
  const ids = new Set<string>();
  for (const raw of value) {
    const f = raw as Record<string, unknown>;
    if (!isString(f?.id, 1, 40) || ids.has(f.id as string)) return { ok: false, error: "Each finding needs a unique id." };
    ids.add(f.id as string);
    if (!DIMENSIONS.has(f.dimension as string) || !CATEGORIES.has(f.category as string) || !KINDS.has(f.kind as string) || !BASES.has(f.basis as string)) {
      return { ok: false, error: `Finding ${f.id}: choose a dimension, category, kind and basis.` };
    }
    if (!isString(f.statement, 1, 600)) return { ok: false, error: `Finding ${f.id}: the statement must be 1 to 600 characters.` };
    if (!Array.isArray(f.citations) || f.citations.length > 10) return { ok: false, error: `Finding ${f.id}: up to 10 citations.` };
    const citations: Citation[] = [];
    for (const c of f.citations as Record<string, unknown>[]) {
      if (!["file", "test", "message", "handoff"].includes(c?.kind as string) || !isString(c?.ref, 1, 260)) {
        return { ok: false, error: `Finding ${f.id}: each citation needs a kind and a reference.` };
      }
      const citation: Citation = { kind: c.kind as Citation["kind"], ref: (c.ref as string).trim() };
      if (c.lineStart !== undefined && c.lineStart !== null) citation.lineStart = Number(c.lineStart);
      if (c.lineEnd !== undefined && c.lineEnd !== null) citation.lineEnd = Number(c.lineEnd);
      citations.push(citation);
    }
    findings.push({
      id: (f.id as string).trim(),
      dimension: f.dimension as Finding["dimension"],
      category: f.category as Finding["category"],
      kind: f.kind as Finding["kind"],
      basis: f.basis as Finding["basis"],
      statement: (f.statement as string).trim(),
      citations,
    });
  }
  return { ok: true, findings };
}

export function citationProblem(citation: Citation, index: EvidenceIndex): string | null {
  switch (citation.kind) {
    case "file": {
      const lines = index.files.get(citation.ref);
      if (lines === undefined) return `file ${citation.ref} is not in the submitted snapshot`;
      if (citation.lineStart === undefined) return `file ${citation.ref} needs a line range`;
      const end = citation.lineEnd ?? citation.lineStart;
      if (!Number.isInteger(citation.lineStart) || !Number.isInteger(end) || citation.lineStart < 1 || end < citation.lineStart || end > lines) {
        return `lines ${citation.lineStart}-${end} are outside ${citation.ref} (1-${lines})`;
      }
      return null;
    }
    case "test":
      return index.probes.has(citation.ref) ? null : `test ${citation.ref} is not in this evaluation run`;
    case "message":
      return index.messageIds.has(citation.ref) ? null : `message ${citation.ref} is not in this attempt's thread`;
    case "handoff":
      return index.handoffFields.has(citation.ref) ? null : `handoff field ${citation.ref} is empty or unknown`;
  }
}

/**
 * Release gate. Every material finding must be grounded, coding results must
 * rest on the executed tests (a reviewer cannot mark code as working by reading
 * it), and an observed defect must point at a test that actually failed;
 * anything else has to be labelled a hypothesis.
 */
export function validateForRelease(brief: ReportBrief, findings: Finding[], index: EvidenceIndex): string[] {
  const problems: string[] = [];
  const keys = new Set(brief.dimensions.map((d) => d.key));
  for (const key of DIMENSIONS) if (!keys.has(key as ReportBrief["dimensions"][number]["key"])) problems.push(`Rate the ${key.replace(/_/g, " ")} dimension.`);
  if (brief.limitations.length === 0) problems.push("State at least one limitation of the evidence.");
  if (brief.followUps.length === 0) problems.push("Suggest at least one interview follow-up.");
  if (findings.length === 0) problems.push("Add at least one cited finding.");
  for (const finding of findings) {
    const label = `Finding ${finding.id}`;
    if (finding.kind !== "observation" && finding.citations.length === 0) problems.push(`${label} needs at least one citation.`);
    for (const citation of finding.citations) {
      const problem = citationProblem(citation, index);
      if (problem) problems.push(`${label}: ${problem}.`);
    }
    if (finding.category === "coding_result" && finding.basis === "observed") {
      const tests = finding.citations.filter((c) => c.kind === "test");
      if (tests.length === 0) problems.push(`${label}: an observed coding result must cite an executed test, or be marked a hypothesis.`);
      if (finding.kind === "gap" && tests.length > 0 && tests.every((c) => index.probes.get(c.ref) === "passed")) {
        problems.push(`${label}: an observed gap must cite at least one test that did not pass.`);
      }
      if (finding.kind === "strength" && tests.some((c) => index.probes.get(c.ref) !== "passed")) {
        problems.push(`${label}: an observed strength cannot cite a test that did not pass.`);
      }
    }
    if (finding.category === "communication" && !finding.citations.some((c) => c.kind === "message" || c.kind === "handoff")) {
      problems.push(`${label}: a communication finding must cite a message or the handoff.`);
    }
  }
  return problems;
}

export function lineCount(bytes: Uint8Array): number {
  let lines = 1;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] === 10) lines++;
  if (bytes.length > 0 && bytes[bytes.length - 1] === 10) lines--;
  return Math.max(lines, bytes.length === 0 ? 0 : 1);
}
