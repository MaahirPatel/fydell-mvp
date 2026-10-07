/**
 * Demo data adapters (DEMO-04).
 *
 * Demo and product MUST use the same report/passport/thread components with
 * separate data adapters - no conflicting second product. These adapters map
 * deterministic demo fixtures onto the real component data contracts:
 *
 *  - PassportView  <- PassportData (src/lib/passport/view.ts)
 *  - ReportInspector-style report claims <- NorthlineClaim (src/lib/fixtures/northline.ts)
 *  - Message thread <- ThreadProps contract below (the thread component's
 *    documented prop shape; the same component renders live threads)
 *
 * Adapters are total: every required field of the target contract is filled
 * from fixture data, and no fictional field is invented that the real
 * component does not already render.
 */

import type { PassportData, PassportEvidence, PassportProject } from "@/lib/passport/view";
import type { NorthlineClaim } from "@/lib/fixtures/northline";
import type { Citation } from "@/components/fydell/CitationLink";
import {
  DEMO_CANDIDATE,
  DEMO_FINDING,
  DEMO_TESTS,
  DEMO_THREAD,
  SAMPLE_DATA_LABEL,
  type DemoEvidence,
  type DemoThread,
} from "./fixtures";

/** Thread component contract: the same component renders live threads. */
export interface ThreadMessageProps {
  id: string;
  author: string;
  role: "candidate" | "teammate";
  body: string;
  at: string;
}

export interface ThreadProps {
  title: string;
  messages: ThreadMessageProps[];
  /** Shown when rendering fixture data so visitors know it is an example. */
  banner: string | null;
}

function demoProjectFor(evidence: DemoEvidence): PassportProject {
  const passportEvidence: PassportEvidence = {
    id: evidence.id,
    repo: "example-org/example-webhooks",
    detector: "demo-fixture",
    category: evidence.kind,
    finding: evidence.finding,
    basis: "repository_observation",
    path: evidence.citation.path,
    startLine: evidence.citation.startLine,
    endLine: evidence.citation.endLine,
    excerpt: evidence.citation.excerpt,
    sourceUrl: "#demo-source",
    limitations: [...evidence.limitations, SAMPLE_DATA_LABEL],
  };
  return {
    repoFullName: "example-org/example-webhooks",
    htmlUrl: "#demo-source",
    commitSha: "demo00000000000000000000000000000000000000",
    primaryLanguage: "Python",
    isFork: false,
    evidence: [passportEvidence],
  } as PassportProject;
}

/**
 * Adapt the demo finding/candidate into the real PassportView data contract.
 * The sample-data label is carried in the headline so the component renders
 * it without any demo-specific branch.
 */
export function adaptDemoPassport(): PassportData {
  return {
    displayName: DEMO_CANDIDATE.displayName,
    headline: `${DEMO_CANDIDATE.headline} · ${SAMPLE_DATA_LABEL}`,
    githubLogin: null,
    projects: [demoProjectFor(DEMO_FINDING)],
    roleSuggestions: [],
    capabilities: {
      source: "rules",
      capabilities: [],
      notShown: [],
      note: SAMPLE_DATA_LABEL,
    },
    updatedAt: null,
  };
}

/**
 * Adapt demo evidence + test results into the real report-claim contract.
 * Passing/failing tests become claims with tone, so the same report
 * component renders both.
 */
export function adaptDemoReportClaims(): NorthlineClaim[] {
  const citation: Citation = {
    index: 0,
    source: DEMO_FINDING.citation.path,
    locator: `lines ${DEMO_FINDING.citation.startLine}-${DEMO_FINDING.citation.endLine}`,
    tone: "source",
  };
  const findingClaim: NorthlineClaim = {
    id: DEMO_FINDING.id,
    text: DEMO_FINDING.finding,
    action: "Fictional candidate inspected the cited source lines in the demo workspace.",
    citations: [citation],
    limitation: `${SAMPLE_DATA_LABEL}. Not a live repository analysis.`,
    tone: "risk",
  };
  const testClaims: NorthlineClaim[] = DEMO_TESTS.map((t) => ({
    id: t.id,
    text: `${t.name}: ${t.status}`,
    action: `Demo test run output: ${t.output}`,
    citations: [],
    limitation: SAMPLE_DATA_LABEL,
    tone: t.status === "failing" ? "risk" : "neutral",
  }));
  return [findingClaim, ...testClaims];
}

/** Adapt the demo thread into the real thread component contract. */
export function adaptDemoThread(thread: DemoThread = DEMO_THREAD): ThreadProps {
  return {
    title: thread.title,
    messages: thread.messages.map((m) => ({
      id: m.id,
      author: m.author,
      role: m.role,
      body: m.body,
      at: m.at,
    })),
    banner: SAMPLE_DATA_LABEL,
  };
}

/**
 * Completeness check: every required field of the target contracts is
 * populated by the adapters above. Returns errors (empty = complete).
 */
export function assertAdaptersComplete(): string[] {
  const errors: string[] = [];
  const passport = adaptDemoPassport();
  if (!passport.displayName) errors.push("passport adapter: missing displayName");
  if (!passport.projects.length) errors.push("passport adapter: no projects");
  if (!passport.projects[0]?.evidence?.length) errors.push("passport adapter: project has no evidence");
  const claims = adaptDemoReportClaims();
  if (!claims.length) errors.push("report adapter: no claims");
  for (const c of claims) {
    if (!c.text) errors.push(`report adapter: claim ${c.id} missing text`);
    if (!c.action) errors.push(`report adapter: claim ${c.id} missing action`);
    if (!c.limitation) errors.push(`report adapter: claim ${c.id} missing limitation`);
  }
  const thread = adaptDemoThread();
  if (!thread.messages.length) errors.push("thread adapter: no messages");
  if (!thread.banner) errors.push("thread adapter: missing sample-data banner");
  return errors;
}
