/**
 * Deterministic, labeled demo fixtures (DEMO-02, DEMO-03).
 *
 * The public demo runs on fictional fixtures. Every fixture carries:
 *  - `fixture: true` marker,
 *  - the visible sample-data label (SAMPLE_DATA_LABEL),
 *  - a deterministic Candidate01-style identity.
 *
 * Rule (DEMO-03): demo scan/processing is NEVER represented as a live
 * repository analysis. Copy describing the demo scan must use
 * demoScanDisclaimer(); any string claiming a live scan is rejected by
 * assertDemoCopyHonest().
 */

export const SAMPLE_DATA_LABEL = "Sample data — fictional candidate";
export const DEMO_CANDIDATE_ID = "candidate01";
export const DEMO_CANDIDATE_NAME = "Candidate 01";

export interface DemoFixtureMeta {
  fixture: true;
  label: typeof SAMPLE_DATA_LABEL;
  candidateId: string;
}

export function makeFixtureMeta(candidateId: string = DEMO_CANDIDATE_ID): DemoFixtureMeta {
  return { fixture: true, label: SAMPLE_DATA_LABEL, candidateId };
}

/** Copy rule: the demo scan is an example, never a live analysis. */
export function demoScanDisclaimer(): string {
  return (
    "This is a fictional example scan for demonstration only. " +
    "It is not a live repository analysis and no real code was scanned."
  );
}

/**
 * Rejects copy that misrepresents the demo as live work. Case-insensitive
 * match against phrasing that implies a real scan/analysis happened.
 */
export function assertDemoCopyHonest(copy: string): string[] {
  const violations: string[] = [];
  const banned = [
    /we scanned your repositor/i,
    /live repository analysis/i,
    /real[- ]time scan of/i,
    /analyzed your (code|github)/i,
    /your actual commit/i,
  ];
  for (const pattern of banned) {
    if (pattern.test(copy)) violations.push(`Demo copy misrepresents fiction as live work: ${pattern}`);
  }
  return violations;
}

export interface DemoCandidate {
  id: string;
  displayName: string;
  headline: string;
  meta: DemoFixtureMeta;
}

export type DemoEvidenceKind = "code" | "test" | "message";

export interface DemoCitation {
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string[];
}

export interface DemoEvidence {
  id: string;
  kind: DemoEvidenceKind;
  title: string;
  finding: string;
  citation: DemoCitation;
  limitations: string[];
  meta: DemoFixtureMeta;
}

export interface DemoTestResult {
  id: string;
  name: string;
  status: "passing" | "failing";
  output: string;
  meta: DemoFixtureMeta;
}

export interface DemoMessage {
  id: string;
  author: string;
  role: "candidate" | "teammate";
  body: string;
  at: string;
  meta: DemoFixtureMeta;
}

export interface DemoThread {
  id: string;
  title: string;
  messages: DemoMessage[];
  meta: DemoFixtureMeta;
}

export type DemoShareField = "projects" | "evidence" | "roles" | "capabilities";

export interface DemoSharingPreview {
  /** Fields the previewed share link would reveal. */
  fields: DemoShareField[];
  linkLabel: string;
  meta: DemoFixtureMeta;
}

/** The deterministic demo candidate. */
export const DEMO_CANDIDATE: DemoCandidate = {
  id: DEMO_CANDIDATE_ID,
  displayName: DEMO_CANDIDATE_NAME,
  headline: "Fictional backend engineer — example profile",
  meta: makeFixtureMeta(),
};

/** One example GitHub finding with an openable source citation (DEMO-02). */
export const DEMO_FINDING: DemoEvidence = {
  id: "demo-evidence-01",
  kind: "code",
  title: "Retry with exponential backoff on webhook delivery",
  finding:
    "Webhook delivery retries immediately on failure instead of backing off, risking thundering-herd load on the receiver.",
  citation: {
    path: "src/webhooks/deliver.py",
    startLine: 42,
    endLine: 58,
    excerpt: [
      "def deliver(url, payload):",
      "    for attempt in range(MAX_RETRIES):",
      "        try:",
      "            return post(url, payload, timeout=5)",
      "        except DeliveryError:",
      "            continue  # no backoff between attempts",
    ],
  },
  limitations: ["Example only — no real repository was scanned."],
  meta: makeFixtureMeta(),
};

/** Passing and failing tests a visitor can inspect (DEMO-02). */
export const DEMO_TESTS: DemoTestResult[] = [
  {
    id: "demo-test-01",
    name: "test_deliver_retries_on_failure",
    status: "passing",
    output: "1 passed in 0.42s",
    meta: makeFixtureMeta(),
  },
  {
    id: "demo-test-02",
    name: "test_deliver_backs_off_between_retries",
    status: "failing",
    output: "FAILED — expected sleep(2), sleep(4); observed no delay between attempts",
    meta: makeFixtureMeta(),
  },
];

/** A readable message thread (DEMO-02). */
export const DEMO_THREAD: DemoThread = {
  id: "demo-thread-01",
  title: "Webhook retry incident — teammate thread",
  messages: [
    {
      id: "demo-msg-01",
      author: DEMO_CANDIDATE_NAME,
      role: "candidate",
      body: "Repro shows the receiver getting hammered on deploy — retries fire with no delay. Adding backoff now.",
      at: "2026-01-14T10:02:00Z",
      meta: makeFixtureMeta(),
    },
    {
      id: "demo-msg-02",
      author: "Teammate 02",
      role: "teammate",
      body: "Good catch. Keep the max delay under the webhook timeout so we don't trade one failure for another.",
      at: "2026-01-14T10:09:00Z",
      meta: makeFixtureMeta(),
    },
  ],
  meta: makeFixtureMeta(),
};

/** Sharing preview fixture (DEMO-02). */
export const DEMO_SHARING: DemoSharingPreview = {
  fields: ["projects", "evidence", "roles", "capabilities"],
  linkLabel: "Preview — this is what a share link reveals",
  meta: makeFixtureMeta(),
};

/**
 * Verify every fixture in a list carries the sample-data label and the
 * fixture marker. Returns human-readable errors (empty = all labeled).
 */
export function assertAllFixturesLabeled(
  fixtures: readonly { meta?: DemoFixtureMeta }[]
): string[] {
  const errors: string[] = [];
  fixtures.forEach((f, i) => {
    if (!f.meta || f.meta.fixture !== true) errors.push(`Fixture ${i} missing fixture marker`);
    else if (f.meta.label !== SAMPLE_DATA_LABEL)
      errors.push(`Fixture ${i} missing sample-data label`);
    if (f.meta && !f.meta.candidateId) errors.push(`Fixture ${i} missing candidate identity`);
  });
  return errors;
}

/** All fixtures in one list for label auditing. */
export function allDemoFixtures(): readonly { meta?: DemoFixtureMeta }[] {
  return [
    DEMO_CANDIDATE,
    DEMO_FINDING,
    ...DEMO_TESTS,
    DEMO_THREAD,
    ...DEMO_THREAD.messages,
    DEMO_SHARING,
  ];
}
