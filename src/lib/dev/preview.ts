import "server-only";
/**
 * Deterministic synthetic fixtures for designing and auditing the signed-in
 * application.
 *
 * There is no local Supabase in this environment (Docker is not installed) and
 * the only configured project is the live one, so the employer screens cannot
 * otherwise be seen in a populated state. This module renders the real
 * components against real record types without touching any database.
 *
 * Safety:
 *
 *   - `NODE_ENV === "production"` disables it unconditionally. The flag alone
 *     is not enough.
 *   - It is opt-in via `FYDELL_UI_PREVIEW=1`, so a normal `npm run dev` against
 *     a real Supabase behaves exactly as before.
 *   - Every fixture name is visibly synthetic, so a screenshot can never be
 *     mistaken for customer activity.
 *
 * Usage:
 *
 *   FYDELL_UI_PREVIEW=1 npm run dev                      populated workspace
 *   FYDELL_UI_PREVIEW=1 FYDELL_UI_PREVIEW_STATE=empty …  brand-new workspace
 */
import type {
  InvitationRecord,
  OverviewMetrics,
  ReportRecord,
} from "@/app/app/employer/_lib/data";
import { INVITATION_STATUS_LABEL } from "@/app/app/employer/_lib/data";
import type { OrgContext } from "@/lib/simulations/auth";

export function isPreviewMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.FYDELL_UI_PREVIEW === "1";
}

/** A brand-new workspace, or one that has been running for a while. */
export function previewState(): "empty" | "active" {
  return process.env.FYDELL_UI_PREVIEW_STATE === "empty" ? "empty" : "active";
}

export const PREVIEW_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "owner@example.com",
};

export const PREVIEW_ORG: OrgContext = {
  userId: PREVIEW_USER.id,
  organizationId: "00000000-0000-4000-8000-0000000000a1",
  organizationName: "Example Manufacturing",
};

const EVALUATION = "Operations performance investigation";
const ROLE_KEY = "data-analyst";
const ROLE_TITLE = "Data Analyst";

/**
 * Stands in for the row `sim_templates` would hold for the released evaluation.
 * Without a template id the catalog treats it as an unpublished draft and hides
 * it, so preview would show an empty Evaluations screen.
 */
export const PREVIEW_TEMPLATE = {
  slug: "ops-yield-investigation",
  id: "00000000-0000-4000-8000-0000000000b1",
};

/** Fixed offsets from a fixed instant, so screenshots do not change run to run. */
const T0 = Date.UTC(2026, 7, 10, 9, 0, 0);
const hoursAgo = (h: number) => new Date(T0 - h * 3_600_000).toISOString();

type Seed = {
  id: string;
  name: string;
  /** One of the real `sim_invitations.status` values. */
  status: keyof typeof INVITATION_STATUS_LABEL;
  /** One of the real `sim_sessions.status` values, or null when never started. */
  session: "accepted" | "active" | "submitted" | "analyzed" | "report_ready" | null;
  score?: number;
  band?: string;
  createdHoursAgo: number;
  submittedHoursAgo?: number;
  /** Real `sim_invitations.email_delivery` value. */
  delivery: string | null;
  /** Whether a reviewer has recorded a decision. Drives "needs review". */
  decided?: boolean;
};

/**
 * Covers the status model end to end: invited but untouched, opened, consented
 * and idle, mid-task, submitted and scoring, report awaiting review, report
 * reviewed, plus the two failure states a real workspace accumulates.
 */
const SEEDS: Seed[] = [
  {
    id: "s1",
    name: "Avery Sample",
    status: "sent",
    session: null,
    createdHoursAgo: 3,
    delivery: "delivered",
  },
  {
    id: "s2",
    name: "Blair Example",
    status: "opened",
    session: null,
    createdHoursAgo: 20,
    delivery: "delivered",
  },
  {
    id: "s3",
    name: "Casey Placeholder",
    status: "accepted",
    session: "accepted",
    createdHoursAgo: 26,
    delivery: "delivered",
  },
  {
    id: "s4",
    name: "Devon Testcase",
    status: "started",
    session: "active",
    createdHoursAgo: 30,
    delivery: "delivered",
  },
  {
    id: "s5",
    name: "Emerson Fixture",
    status: "completed",
    session: "submitted",
    createdHoursAgo: 52,
    submittedHoursAgo: 2,
    delivery: "delivered",
  },
  {
    id: "s6",
    name: "Frankie Synthetic",
    status: "completed",
    session: "report_ready",
    score: 78,
    band: "Strong evidence",
    createdHoursAgo: 74,
    submittedHoursAgo: 26,
    delivery: "delivered",
  },
  {
    id: "s7",
    name: "Gray Specimen",
    status: "completed",
    session: "analyzed",
    score: 61,
    band: "Mixed evidence",
    createdHoursAgo: 98,
    submittedHoursAgo: 50,
    delivery: "delivered",
    decided: true,
  },
  {
    id: "s8",
    name: "Harper Dummy",
    status: "expired",
    session: null,
    createdHoursAgo: 400,
    delivery: "delivered",
  },
  {
    id: "s9",
    name: "Indigo Mock",
    status: "sent",
    session: null,
    createdHoursAgo: 6,
    delivery: "bounced",
  },
];

const PROGRESS: Record<string, string> = {
  accepted: "Not started",
  active: "In progress",
  submitted: "Scoring",
  analyzed: "Report ready",
  report_ready: "Report ready",
};

function resultLabel(seed: Seed): string | null {
  if (seed.score === undefined || !seed.band) return null;
  return `${seed.band} · ${seed.score}/100`;
}

export function previewInvitations(limit = 200): InvitationRecord[] {
  if (previewState() === "empty") return [];
  return SEEDS.slice(0, limit).map((seed) => ({
    invitationId: seed.id,
    name: seed.name,
    email: `${seed.name.split(" ")[0].toLowerCase()}@example.com`,
    roleKey: ROLE_KEY,
    roleTitle: ROLE_TITLE,
    simulation: EVALUATION,
    status: seed.status,
    statusLabel: INVITATION_STATUS_LABEL[seed.status] || seed.status,
    progress: seed.session ? PROGRESS[seed.session] : "Not started",
    result: resultLabel(seed),
    sessionId: seed.session ? `sess-${seed.id}` : null,
    reportReady: seed.session === "analyzed" || seed.session === "report_ready",
    canResend: ["sent", "opened", "expired"].includes(seed.status),
    canRevoke: ["sent", "opened"].includes(seed.status),
    createdAt: hoursAgo(seed.createdHoursAgo),
    emailDelivery: seed.delivery,
  }));
}

export function previewReports(limit = 300): ReportRecord[] {
  if (previewState() === "empty") return [];
  return SEEDS.filter(
    (s) => s.session === "analyzed" || s.session === "report_ready"
  )
    .slice(0, limit)
    .map((seed) => ({
      sessionId: `sess-${seed.id}`,
      candidate: seed.name,
      email: `${seed.name.split(" ")[0].toLowerCase()}@example.com`,
      roleKey: ROLE_KEY,
      roleTitle: ROLE_TITLE,
      simulation: EVALUATION,
      score: seed.score ?? null,
      bandLabel: seed.band ?? null,
      completedAt: hoursAgo(seed.submittedHoursAgo ?? seed.createdHoursAgo),
      needsReview: !seed.decided,
    }));
}

export function previewNeedsReview(limit = 20): ReportRecord[] {
  return previewReports(300)
    .filter((r) => r.needsReview)
    .slice(0, limit);
}

export function previewMetrics(): OverviewMetrics {
  if (previewState() === "empty") {
    return { inProgress: 0, completed: 0, reportsReady: 0, needsReview: 0 };
  }
  const sessions = SEEDS.filter((s) => s.session);
  const ready = sessions.filter(
    (s) => s.session === "analyzed" || s.session === "report_ready"
  );
  return {
    inProgress: sessions.filter(
      (s) => s.session === "accepted" || s.session === "active"
    ).length,
    completed: sessions.filter((s) =>
      ["submitted", "analyzed", "report_ready"].includes(s.session as string)
    ).length,
    reportsReady: ready.length,
    needsReview: ready.filter((s) => !s.decided).length,
  };
}
