import type { PassportEvidence, PassportProject } from "@/lib/passport/view";
import type { ProjectPresentation } from "@/lib/passport/presentation";
import type { EngineerProfile } from "@/lib/profile/types";
import { SAMPLE_PASSPORT, SAMPLE_ROLE } from "@/lib/marketing/sample-passport";

/**
 * The one example dataset every public product view renders. A fictional
 * engineer and fictional projects; every finding matches its excerpt line for
 * line and states what was not checked. Shown with an "Example data" label.
 */

export const EXAMPLE_LABEL = "Example data";

/** The product's own category keys (see record-states CATEGORY_LABEL). */
const RELAY_CATEGORY: Record<string, string> = { "sample-retry-cap": "backend", "sample-dedupe": "backend", "sample-test-400": "testing" };
const RELAY = {
  ...SAMPLE_PASSPORT.projects[0],
  evidence: SAMPLE_PASSPORT.projects[0].evidence.map((e) => ({ ...e, category: RELAY_CATEGORY[e.id] ?? e.category })),
};

const LEDGER_REPO = "uploads/ledger-export";
const LEDGER_EVIDENCE: PassportEvidence[] = [
  {
    id: "sample-ledger-batches",
    repo: LEDGER_REPO,
    detector: "performance",
    category: "performance",
    finding: "The export reads ledger rows in batches of 1,000 and writes each batch before reading the next, so memory use does not grow with the size of the ledger.",
    basis: "repository_observation",
    path: "export/stream.py",
    startLine: 18,
    endLine: 26,
    excerpt: [
      "BATCH_SIZE = 1000",
      "",
      "def stream_rows(conn, account_id, writer):",
      "    offset = 0",
      "    while True:",
      "        rows = fetch_page(conn, account_id, offset, BATCH_SIZE)",
      "        if not rows:",
      "            return",
      "        writer.writerows(rows); offset += len(rows)",
    ],
    sourceUrl: "",
    limitations: ["Read from the uploaded source; it was not run.", "Offset paging can skip or repeat rows if the ledger changes during an export. Whether that can happen here was not assessed."],
  },
  {
    id: "sample-ledger-escape",
    repo: LEDGER_REPO,
    detector: "security",
    category: "security",
    finding: "Cell values that start with =, +, - or @ are prefixed with a single quote before they are written, so a spreadsheet does not run them as formulas.",
    basis: "repository_observation",
    path: "export/cells.py",
    startLine: 4,
    endLine: 9,
    excerpt: [
      "FORMULA_PREFIXES = (\"=\", \"+\", \"-\", \"@\")",
      "",
      "def safe_cell(value):",
      "    text = \"\" if value is None else str(value)",
      "    if text.startswith(FORMULA_PREFIXES):",
      "        return \"'\" + text",
    ],
    sourceUrl: "",
    limitations: ["Tab and carriage-return prefixes are not handled in this function.", "Tests for this function were not among the analyzed files."],
  },
];

export const EXAMPLE_PROJECTS: PassportProject[] = [
  { ...RELAY, id: "example-relay", sourceKind: "github" },
  {
    id: "example-ledger",
    repoFullName: LEDGER_REPO,
    sourceKind: "upload",
    htmlUrl: "",
    commitSha: "upload-9c41e2",
    revisionRef: null,
    primaryLanguage: "Python",
    isFork: false,
    contributionStatement: "I designed the batched export and the cell escaping. The CLI wrapper was written by a teammate.",
    status: "complete",
    coverage: { totalFiles: 21, analyzedFiles: 19, skippedFiles: 2, languages: ["Python"], skipReasons: { binary: 2 }, treeTruncated: false },
    analyzedAt: "2026-09-30T10:05:00.000Z",
    notices: [],
    evidence: LEDGER_EVIDENCE,
  },
];

export const EXAMPLE_PRESENTATIONS: ProjectPresentation[] = [
  {
    id: "p-relay",
    projectKey: RELAY.repoFullName,
    sourceKind: "github",
    title: "Webhook relay",
    summary: "A small service that delivers payment events to partner endpoints, with bounded retries and duplicate protection.",
    purpose: "Partners were receiving the same event several times after timeouts.",
    intendedUsers: "",
    contribution: "",
    teamContext: "solo",
    projectState: "maintained",
    outcomes: "",
    technologies: ["TypeScript", "Postgres", "Vitest"],
    links: [],
    startedOn: "2026-03",
    endedOn: null,
    featured: true,
    sortOrder: 1,
    visibility: "shareable",
    image: null,
    fieldSources: {},
    confirmedAt: "2026-09-28T15:30:00.000Z",
    version: 2,
    updatedAt: "2026-09-28T15:30:00.000Z",
  },
  {
    id: "p-ledger",
    projectKey: LEDGER_REPO,
    sourceKind: "upload",
    title: "Ledger export",
    summary: "Exports an account's ledger to CSV for finance teams without loading the whole ledger into memory.",
    purpose: "Large accounts were timing out on export.",
    intendedUsers: "",
    contribution: "",
    teamContext: "employment",
    projectState: "shipped",
    outcomes: "",
    technologies: ["Python", "PostgreSQL"],
    links: [],
    startedOn: "2025-11",
    endedOn: "2026-02",
    featured: true,
    sortOrder: 2,
    visibility: "shareable",
    image: null,
    fieldSources: {},
    confirmedAt: "2026-09-30T10:10:00.000Z",
    version: 1,
    updatedAt: "2026-09-30T10:10:00.000Z",
  },
  {
    id: "p-runbook",
    projectKey: "manual:runbook",
    sourceKind: "manual",
    title: "On-call runbook automation",
    summary: "Scripts that collect logs and recent deploys when an alert fires, so the on-call engineer starts with context.",
    purpose: "",
    intendedUsers: "",
    contribution: "I wrote the collectors for logs and deploy history and the summary posted to the incident channel.",
    teamContext: "team",
    projectState: "shipped",
    outcomes: "On-call engineers stopped gathering the same logs by hand at the start of each incident.",
    technologies: ["Bash", "Python"],
    links: [],
    startedOn: "2025-06",
    endedOn: "2025-09",
    featured: false,
    sortOrder: 3,
    visibility: "shareable",
    image: null,
    fieldSources: {},
    confirmedAt: "2026-09-29T09:00:00.000Z",
    version: 1,
    updatedAt: "2026-09-29T09:00:00.000Z",
  },
];

/** A private project only the owner sees. Never part of a share link. */
export const EXAMPLE_PRIVATE_PROJECT = { title: "Payments sandbox", origin: "Uploaded source, analyzed", findings: 2 } as const;

export const EXAMPLE_PROFILE: EngineerProfile = {
  displayName: "Sample engineer",
  handle: "sample",
  headline: "Backend engineer working on event delivery and data exports. Example data, not a real person.",
  role: "Backend engineer",
  bio: "",
  location: "Remote",
  website: "",
  links: [],
  openTo: "full_time",
  avatarUrl: "",
  social: { linkedin: "", x: "", instagram: "" },
  howIBuild: null,
  updatedAt: "2026-09-30T10:10:00.000Z",
};

export const EXAMPLE_ROLE = {
  title: SAMPLE_ROLE,
  requirements: [
    { text: "Handles failures in calls to external services", outcome: "Supporting evidence", tone: "positive", evidence: "sample-retry-cap" },
    { text: "Designs for duplicate and out-of-order events", outcome: "Relevant but not yet sufficient", tone: "attention", evidence: "sample-dedupe" },
    { text: "Writes tests for failure paths", outcome: "Supporting evidence", tone: "positive", evidence: "sample-test-400" },
    { text: "Works with large datasets safely", outcome: "Supporting evidence", tone: "positive", evidence: "sample-ledger-batches" },
    { text: "Has operated a service in production", outcome: "No evidence supplied", tone: "neutral", evidence: null },
  ],
} as const;

/** Applicants are numbered, never named. Stages use the product's own labels. */
export const EXAMPLE_APPLICANTS = [
  { id: "a1", name: "Applicant 01", projects: 2, stage: "In review", next: "Record a decision" },
  { id: "a2", name: "Applicant 02", projects: 3, stage: "New", next: "Review evidence" },
  { id: "a3", name: "Applicant 03", projects: 1, stage: "Waiting on applicant", next: "Question sent" },
  { id: "a4", name: "Applicant 04", projects: 2, stage: "New", next: "Review evidence" },
] as const;

export function exampleEvidence(id: string): PassportEvidence | undefined {
  for (const p of EXAMPLE_PROJECTS) {
    const e = p.evidence.find((x) => x.id === id);
    if (e) return e;
  }
  return undefined;
}
