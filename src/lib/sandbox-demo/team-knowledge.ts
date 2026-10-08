import type { DemoTeammateId } from "./team";

/**
 * What each simulated teammate knows in the demo scenario. Fact ids are
 * stable: replies cite them, and validation rejects any id a teammate does
 * not own. Protected tests and the reference fix are deliberately absent;
 * they never reach the model, so no prompt has to keep them secret.
 */

export type TeamFact = { id: string; text: string };

export type TeammateProfile = {
  id: DemoTeammateId;
  name: string;
  firstName: string;
  title: string;
  role: string;
  /** Whether this teammate can see the candidate's diff and test results. */
  seesWorkspace: boolean;
  boundary: string;
  facts: TeamFact[];
};

export const TEAMMATES: Record<DemoTeammateId, TeammateProfile> = {
  dana: {
    id: "dana",
    name: "Dana Okafor",
    firstName: "Dana",
    title: "Engineering lead",
    role: "Leads the payments platform team and owns the inbox's public contract. Reviews changes before they ship.",
    seesWorkspace: true,
    boundary:
      "Dana clarifies requirements, constraints and priorities and can react to the candidate's test results and approach. Dana does not diagnose the bug, does not say which line is wrong, and does not describe or write the fix.",
    facts: [
      {
        id: "dana.contract",
        text: "drain() returns one entry per delivery with id, source and status, where status is processed, duplicate or failed. error is present only when status is failed. Two other services read these results, so the names and the shape must stay the same.",
      },
      {
        id: "dana.exhausted",
        text: "An event that fails every attempt is reported as failed with the last error message. The provider redelivers it later, and that redelivery has to be processed, not reported as a duplicate.",
      },
      {
        id: "dana.source",
        text: "Two of the providers reuse ids, so evt_9 from one provider has nothing to do with evt_9 from the other. That is why the source is part of the event key. That part works today and should stay.",
      },
      {
        id: "dana.infra",
        text: "No new infrastructure for this change: no locks, queues or new tables. In production the seen store is a table with a unique key; in the task it is an in-memory set with the same has, add and remove methods. Work within those.",
      },
      {
        id: "dana.attempts",
        text: "maxAttempts defaults to 3 and counts every call to the handler, including the first one.",
      },
      {
        id: "dana.priority",
        text: "The priority is not losing payments. Handling an event twice is also bad, because it can double an entry in a merchant's ledger, so both directions matter.",
      },
      {
        id: "dana.scope",
        text: "The change is limited to the inbox. The handler and the providers are out of scope.",
      },
      {
        id: "dana.handoff",
        text: "Before review Dana wants a short note: what changed, how it was checked, and anything still unresolved or risky.",
      },
      {
        id: "dana.ai",
        text: "AI assistants are allowed on this task. The submission should say what they were used for.",
      },
    ],
  },
  theo: {
    id: "theo",
    name: "Theo Lindqvist",
    firstName: "Theo",
    title: "Support engineer",
    role: "Handles merchant tickets and traced the missing payments. Not an engineer on the payments team and does not work in the code.",
    seesWorkspace: false,
    boundary:
      "Theo shares what support saw in tickets, dashboards and logs. Theo cannot speak to the code, the tests or how to fix anything, and says so plainly.",
    facts: [
      {
        id: "theo.reports",
        text: "Three merchants reported payments missing from their ledgers last week. Support matched every one of them to a delivery where the provider timed out the first time.",
      },
      {
        id: "theo.pattern",
        text: "Every missing event had the same pattern: the first delivery timed out, then the event never showed up in the merchant's ledger. Events that worked the first time were fine.",
      },
      {
        id: "theo.logs",
        text: "In the inbox logs for those events, the first attempt shows the timeout, and the very next entry for the same event says duplicate. There is no processed entry after that.",
      },
      {
        id: "theo.redelivery",
        text: "The provider dashboards show they redelivered some of those events hours later. Those redeliveries were also logged as duplicate.",
      },
      {
        id: "theo.sources",
        text: "The merchants who reported problems use both providers, so it is not tied to one provider.",
      },
    ],
  },
};

/** What every teammate may assume the candidate can already read: the brief and README. */
export const PUBLIC_BRIEF = [
  "Company: Lumen Ledger (fictional) records payments for small merchants. Payment events arrive from two providers and pass through an inbox that hands each event to a handler, which writes it to the merchant's ledger.",
  "Providers redeliver events they are not sure were received, so the inbox skips duplicates. Several merchants reported missing payments; support traced each one to a delivery where the handler timed out the first time.",
  "Task: find out why those events were lost, fix the inbox, keep everything else about it working. Suggested time 45 minutes.",
  "Acceptance criteria in the brief: R1 each event is processed at most once, even when the provider sends it again. R2 events from different sources that share an id are separate events. R3 a temporary handler failure is retried, up to maxAttempts attempts in total. R4 an event that fails every attempt is reported as failed with the last error, and a later redelivery of it is processed. R5 the public API and the result shape stay the same.",
  "Constraints: keep the public API and result shape in README.md; no new infrastructure, use the seen store's has, add and remove; plain JavaScript, no dependencies.",
  "Files: src/inbox.js (the inbox), src/event-key.js (how two deliveries are recognised as the same event), src/seen-store.js (remembers handled events), test/inbox.test.js (public tests, read only).",
].join("\n");
