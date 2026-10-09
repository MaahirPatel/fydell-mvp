import { createHash } from "node:crypto";
import type { PackageFile } from "../authoring/package";
import type { AuthoredHandoff } from "../types";
import { filesFingerprint } from "./archive";

/**
 * The frozen record of one authored submission: exactly which files (by
 * content hash), which simulation version, which recorded events, which
 * handoff and which declared assistance. Stored with the submission, hashed,
 * and referenced by the analysis job, so analysis and the receipt can be tied
 * to this exact snapshot. Pure: no I/O.
 */
export const MANIFEST_SCHEMA = "fydell.authored-submission/1";

export type SeqRange = { count: number; firstSeq: number | null; lastSeq: number | null };

export type SubmissionManifest = {
  schema: typeof MANIFEST_SCHEMA;
  clientSubmissionId: string;
  attemptId: string;
  scenario: { versionId: string; key: string; version: number; harnessSha256: string; aiPolicy: string };
  files: Array<{ path: string; bytes: number; sha256: string }>;
  filesSha256: string;
  archive: { sha256: string; bytes: number };
  handoff: { sha256: string; prompts: number; answered: number };
  assistance: { declared: boolean; declarationSha256: string; builtInAssistantRequests: number };
  events: SeqRange;
  teamMessages: SeqRange;
  assistantInteractions: SeqRange;
  late: boolean;
};

const CLIENT_ID = /^[A-Za-z0-9_-]{8,80}$/;

export function isClientSubmissionId(v: unknown): v is string {
  return typeof v === "string" && CLIENT_ID.test(v);
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function seqRange(seqs: number[]): SeqRange {
  if (seqs.length === 0) return { count: 0, firstSeq: null, lastSeq: null };
  return { count: seqs.length, firstSeq: Math.min(...seqs), lastSeq: Math.max(...seqs) };
}

export function buildManifest(input: {
  clientSubmissionId: string;
  attemptId: string;
  scenario: SubmissionManifest["scenario"];
  files: PackageFile[];
  archive: { sha256: string; bytes: number };
  handoff: AuthoredHandoff;
  aiDisclosure: string;
  builtInAssistantRequests: number;
  events: SeqRange;
  teamMessages: SeqRange;
  assistantInteractions: SeqRange;
  late: boolean;
}): SubmissionManifest {
  const files = [...input.files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => ({ path: f.path, bytes: Buffer.byteLength(f.content, "utf8"), sha256: sha256(f.content) }));
  return {
    schema: MANIFEST_SCHEMA,
    clientSubmissionId: input.clientSubmissionId,
    attemptId: input.attemptId,
    scenario: input.scenario,
    files,
    filesSha256: filesFingerprint(input.files),
    archive: input.archive,
    handoff: { sha256: sha256(stable(input.handoff.authored)), prompts: input.handoff.authored.length, answered: input.handoff.authored.filter((a) => a.answer.trim()).length },
    assistance: { declared: input.aiDisclosure.trim().length > 0, declarationSha256: sha256(input.aiDisclosure.trim()), builtInAssistantRequests: input.builtInAssistantRequests },
    events: input.events,
    teamMessages: input.teamMessages,
    assistantInteractions: input.assistantInteractions,
    late: input.late,
  };
}

export function manifestSha256(manifest: SubmissionManifest): string {
  return sha256(stable(manifest));
}

/** Files read back from storage match the manifest exactly: same paths, same content hashes. */
export function filesMatchManifest(files: PackageFile[], manifest: Pick<SubmissionManifest, "files">): boolean {
  if (files.length !== manifest.files.length) return false;
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  return manifest.files.every((m) => byPath.has(m.path) && sha256(byPath.get(m.path)!) === m.sha256);
}

export function asManifest(v: unknown): SubmissionManifest | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Partial<SubmissionManifest>;
  return o.schema === MANIFEST_SCHEMA && Array.isArray(o.files) && typeof o.filesSha256 === "string" ? (v as SubmissionManifest) : null;
}

/**
 * What a receipt establishes, and what it does not. Shown wherever the
 * receipt is, next to the submission time, so the time is not repeated here.
 */
export function receiptStatements(manifest: Pick<SubmissionManifest, "files" | "scenario"> | null): { proves: string[]; doesNotProve: string[] } {
  const proves = manifest
    ? [
        `Fydell received ${manifest.files.length} ${manifest.files.length === 1 ? "file" : "files"} and your handoff at the time shown, with the content hashes listed in this receipt.`,
        "The submission is stored unchanged. Analysis runs on exactly these files, and any later change would not match these hashes.",
        `The submission is pinned to version ${manifest.scenario.version} of the simulation.`,
      ]
    : ["Fydell received your files and handoff at the time shown, sealed in the archive whose hash is listed in this receipt."];
  return {
    proves,
    doesNotProve: [
      "That you wrote every line yourself or worked without outside help. Declared assistance is recorded as you stated it.",
      "That the code is correct. That is what the analysis checks, and its results come separately.",
      "Anything about work done outside this workspace.",
    ],
  };
}
