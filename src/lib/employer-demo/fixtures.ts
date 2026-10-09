import { demoScenario } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { SOLUTIONS, type SolutionId } from "@/lib/sandbox-demo/scenario";
import type { Handoff } from "@/lib/sandbox-demo/state";

/**
 * The fictional hiring loop every demo workspace starts from. These values are
 * read-only templates: each user's workspace copies them into its own rows at
 * seed time, so nothing one person does in the demo changes another's.
 */

export const DEMO_SEED_VERSION = "2026-10-09.1";
export const DEMO_SCENARIO_KEY = "event-inbox";
export const DEMO_WORKSPACE_NAME = "Demo workspace";
export const DEMO_HOME = "/app/employer/demo";
export const DEMO_TASK_PATH = "/app/demo/task";
/** The applicant row the employer's own run of the sample task is saved under. */
export const SAMPLE_APPLICANT_KEY = "your-sample";
/** The public entry: sends visitors through sign-in or sign-up and into the demo workspace. */
export const DEMO_ENTRY = "/demo";

/** A destination inside the demo workspace, safe to carry through sign-in. */
export function isDemoDestination(path: string | null | undefined): path is string {
  if (!path || path.includes("//") || path.includes("\\") || path.includes("..")) return false;
  const pathOnly = path.split(/[?#]/)[0];
  return pathOnly === DEMO_HOME || pathOnly.startsWith(`${DEMO_HOME}/`) || pathOnly === DEMO_TASK_PATH;
}

export function demoScenarioOrThrow(): DemoScenario {
  const scenario = demoScenario(DEMO_SCENARIO_KEY);
  if (!scenario) throw new Error(`Demo scenario ${DEMO_SCENARIO_KEY} is missing from the catalog.`);
  return scenario;
}

export const DEMO_ROLE = {
  title: "Backend Engineer, Payments Reliability",
  company: "Lumen Ledger",
  companyNote: "A fictional payments ledger for small merchants.",
  location: "Remote, Europe time zones",
  level: "Mid-level",
  summary:
    "Own the event pipeline that turns provider webhooks into ledger entries. The first project is the inbox that drops events after a handler timeout.",
} as const;

export type DemoProject = { name: string; summary: string; stack: string; evidence: string };

export type DemoApplicantFixture = {
  key: string;
  name: string;
  headline: string;
  solution: SolutionId;
  handoff: Handoff;
  projects: DemoProject[];
  /** Seeded follow-up thread: the reviewer's question and the applicant's reply, both fictional. */
  thread: { author: "reviewer" | "applicant"; requirementId: string | null; body: string }[];
};

export const DEMO_APPLICANTS: readonly DemoApplicantFixture[] = [
  {
    key: "amara-osei",
    name: "Amara Osei",
    headline: "Backend engineer, four years on payment integrations",
    solution: "reference",
    handoff: {
      changed: "The inbox now marks an event as seen only after the handler succeeds, and a failed event is removed from the seen store so a later redelivery is processed.",
      checked: "Ran the public tests, then added a quick script that redelivers an event after three failures to confirm it is processed.",
      unresolved: "If the process crashes between the handler and store.add, the event is handled twice. That needs an idempotency key on the ledger write.",
    },
    projects: [
      { name: "Webhook relay for a bookings platform", summary: "Queued provider webhooks with retries and a dead letter table.", stack: "TypeScript, Postgres", evidence: "Repository with tests and a design note" },
      { name: "Ledger reconciliation job", summary: "Nightly job that matched card settlements to ledger entries and flagged gaps.", stack: "Go", evidence: "Code sample and run logs" },
    ],
    thread: [
      { author: "reviewer", requirementId: "R4", body: "Your handoff mentions a crash between the handler and store.add. How would you make the ledger write safe to repeat?" },
      { author: "applicant", requirementId: "R4", body: "I would key the ledger insert on source and event id with a unique constraint, so a repeated write becomes a no-op rather than a second entry." },
    ],
  },
  {
    key: "jonas-weber",
    name: "Jonas Weber",
    headline: "Full-stack engineer moving into platform work",
    solution: "incorrect",
    handoff: {
      changed: "Retries skip the duplicate check so a failed event can be attempted again.",
      checked: "All public tests pass.",
      unresolved: "",
    },
    projects: [
      { name: "Order status notifications", summary: "Sent shipping updates from a queue with per-customer rate limits.", stack: "Node.js, Redis", evidence: "Repository without tests" },
    ],
    thread: [],
  },
  {
    key: "lena-park",
    name: "Lena Park",
    headline: "Site reliability engineer, on-call lead",
    solution: "starter",
    handoff: {
      changed: "",
      checked: "",
      unresolved: "Ran out of time after reproducing the lost event. I did not change the inbox.",
    },
    projects: [
      { name: "Incident timeline tool", summary: "Collected alerts and chat messages into one timeline for postmortems.", stack: "Python", evidence: "Screenshots and a short write-up" },
    ],
    thread: [],
  },
];

export function fixtureFiles(solution: SolutionId): Record<string, string> {
  return { ...SOLUTIONS[solution].files };
}

export function applicantFixture(key: string): DemoApplicantFixture | null {
  return DEMO_APPLICANTS.find((a) => a.key === key) ?? null;
}