import "server-only";
/**
 * Synthetic candidate fixtures for UI preview mode (see ./preview.ts for the
 * safety rules: never in production, opt-in by env, visibly synthetic names).
 *
 *   FYDELL_UI_PREVIEW_STATE=empty   a brand-new candidate: nothing built yet
 *   (default)                       a passport, one waiting task, one sent
 */
import type { CandidateOverview, WorkItem } from "@/lib/candidate/overview";
import type { PassportData, PassportEvidence, PassportProject } from "@/lib/passport/view";
import { PREVIEW_USER, previewState } from "./preview";

const DAY = 86_400_000;
const T0 = Date.now();
const iso = (offsetDays: number) => new Date(T0 + offsetDays * DAY).toISOString();
const day = (offsetDays: number) => new Date(T0 + offsetDays * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function evidence(repo: string, id: string, finding: string, path: string, start: number, lines: string[]): PassportEvidence {
  return {
    id,
    repo,
    detector: "preview",
    category: "testing",
    finding,
    basis: "repository_observation",
    path,
    startLine: start,
    endLine: start + lines.length - 1,
    excerpt: lines,
    sourceUrl: `https://github.com/${repo}/blob/0000000/${path}#L${start}`,
    limitations: ["Read at one commit. The code was not run."],
  };
}

function project(repo: string, language: string, ev: PassportEvidence[], skipped = 0): PassportProject {
  return {
    repoFullName: repo,
    htmlUrl: `https://github.com/${repo}`,
    commitSha: "0000000preview",
    primaryLanguage: language,
    isFork: false,
    contributionStatement: repo.endsWith("payments-api") ? "I wrote the API and all of its tests." : "",
    status: "complete",
    coverage: { totalFiles: 48 + skipped, analyzedFiles: 48, skippedFiles: skipped, languages: [language], skipReasons: skipped ? { too_large: skipped } : {}, treeTruncated: false },
    analyzedAt: iso(-1),
    notices: [],
    evidence: ev,
  };
}

const PAY = "sample-candidate/payments-api";
const HABIT = "sample-candidate/habit-tracker";

const PASSPORT: PassportData = {
  displayName: "Sample Candidate",
  headline: "",
  githubLogin: "sample-candidate",
  projects: [
    project(
      PAY,
      "Python",
      [
        evidence(PAY, "e1", "Writes tests for a refused card and a repeated payment", "tests/test_charges.py", 12, [
          "def test_refused_card_returns_402(client):",
          "    res = client.post('/charges', json=REFUSED)",
          "    assert res.status_code == 402",
        ]),
        evidence(PAY, "e2", "Retries once when the payment service times out, then returns a clear error", "app/client.py", 30, [
          "try:",
          "    return self._post(path, body, timeout=5)",
          "except Timeout:",
          "    return self._post(path, body, timeout=10)",
        ]),
      ],
      2,
    ),
    project(HABIT, "TypeScript", [
      evidence(HABIT, "e3", "Keeps data in sync when the phone goes offline", "src/sync/queue.ts", 8, [
        "export function enqueue(change: Change) {",
        "  pending.push({ ...change, at: Date.now() });",
        "  persist(pending);",
        "}",
      ]),
    ]),
  ],
  roleSuggestions: [],
  capabilities: {
    source: "rules",
    capabilities: [
      { statement: "Writes tests for their own code", evidenceIds: ["e1"] },
      { statement: "Handles errors instead of crashing", evidenceIds: ["e2"] },
      { statement: "Keeps data safe when the network drops", evidenceIds: ["e3"] },
    ],
    notShown: [],
  },
  updatedAt: iso(-1),
};

const OPEN: WorkItem[] = [
  {
    id: "eng-preview-1",
    title: "Webhook retry incident",
    from: "Sample Hiring Co.",
    about: "A payment company's alerts are sent too many times. Find why, fix it, and tell the team what you changed.",
    runner: "desktop",
    minutes: 60,
    status: "Invitation waiting",
    tone: "ready",
    when: `Open until ${day(6)}`,
    action: { href: "/assess/invitations/preview", label: "Read the invitation" },
    note: null,
    receipt: null,
  },
];

const DONE: WorkItem[] = [
  {
    id: "sim-preview-2",
    title: "Data pipeline check",
    from: "Sample Hiring Co.",
    about: null,
    runner: "browser",
    minutes: null,
    status: "Sent to the hiring team",
    tone: "waiting",
    when: `Sent ${day(-2)}`,
    action: { href: "/app/candidate/simulations", label: "Check progress" },
    note: null,
    receipt: "FYD-PREVIEW-0001",
  },
];

export function previewCandidate(): CandidateOverview {
  if (previewState() === "empty") {
    return { name: "Sample Candidate", email: PREVIEW_USER.email, passport: null, shares: [], open: [], done: [] };
  }
  return {
    name: "Sample Candidate",
    email: PREVIEW_USER.email,
    passport: PASSPORT,
    shares: [
      {
        id: "share-preview-1",
        label: "Sample Hiring Co.",
        fields: ["projects", "evidence", "roles", "capabilities"],
        createdAt: iso(-3),
        expiresAt: iso(27),
        revokedAt: null,
        lastAccessedAt: iso(-1),
      },
    ],
    open: OPEN,
    done: DONE,
  };
}
