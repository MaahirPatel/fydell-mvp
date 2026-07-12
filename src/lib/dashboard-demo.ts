/**
 * Shared display types. Production routes must not populate these with invented people.
 */
export type DemoCandidate = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "invited" | "in_progress" | "submitted" | "reviewed";
  decision: "advance" | "hold" | "reject" | "not_decided";
  score: number;
  signal: "strong" | "moderate" | "weak";
  completionMins: number;
  submittedAt: string;
  verdict: string | null;
  flags: number;
  modelEdits: number;
};

/** Legacy report renderer shape retained for ReportDetail; do not seed fake people. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DemoReport = any;

export const DEMO_CANDIDATES: DemoCandidate[] = [];
export const DEMO_REPORTS: DemoReport[] = [];
export const DEMO_STATS = {
  activeSimulations: 0,
  invitesSent: 0,
  inProgress: 0,
  reportsReady: 0,
  advanceRecommended: 0,
};
export const DEMO_SIMULATION = { id: "meridian", title: "Project Meridian" };
export const DEMO_WORKSPACE = { name: "" };
