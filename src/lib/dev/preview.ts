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
import { invitationTruth } from "@/lib/contracts/lifecycle";
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
    delivery: "failed",
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
    statusLabel: invitationTruth({
      status: seed.status,
      emailDelivery: seed.delivery,
    }).label,
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

/**
 * The employer evidence report, in the shape `/api/sim/sessions/[id]/report`
 * returns it. Built from the same Northline fixture the marketing scenes use,
 * so the screen a buyer is shown and the screen they get are the same story.
 */
export function previewReport(sessionId: string) {
  const seed = SEEDS.find((s) => `sess-${s.id}` === sessionId);
  if (!seed || !(seed.session === "analyzed" || seed.session === "report_ready")) {
    return null;
  }

  const submittedAt = hoursAgo(seed.submittedHoursAgo ?? seed.createdHoursAgo);
  const startedAt = hoursAgo((seed.submittedHoursAgo ?? 0) + 0.4);

  return {
    ready: true,
    candidate: {
      email: `${seed.name.split(" ")[0].toLowerCase()}@example.com`,
      name: seed.name,
    },
    simulation: {
      title: EVALUATION,
      roleKey: ROLE_KEY,
      durationMinutes: 20,
      deliverableFields: [
        { key: "claim", label: "What happened to yield" },
        { key: "evidence", label: "The evidence behind it" },
        { key: "caveat", label: "What this does not establish" },
        { key: "recommendation", label: "What to do before the next shift" },
      ],
    },
    session: {
      startedAt,
      submittedAt,
      curveballPresentedAt: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.2),
      curveballAcknowledgedAt: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.18),
    },
    analysis: {
      recommendation: seed.score && seed.score >= 70 ? "advance" : "review",
      cappedByCritical: null,
      aiUse: {
        promptCount: 0,
        insertedCount: 0,
        editedAfterInsertCount: 0,
        externalAiDisclosed: false,
        trackingNote:
          "Fydell records use of the assistant inside the workbench. It cannot see tools outside it and does not claim to.",
        scoringMode: "deterministic",
      },
      interviewQuestions: [
        "You stopped short of naming a cause for the L2 Day loss. What would you have needed to see in order to name one?",
        "The start date of the reclassification moved partway through. Walk through what you recalculated and what you left alone.",
      ],
      engineVersion: "preview",
      performance: seed.score ?? null,
      coverage: 0.82,
      confidence: 0.74,
      band: seed.score && seed.score >= 70 ? "strong" : "developing",
      bandLabel: seed.band ?? null,
      competencies: [
        {
          key: "metric_judgment",
          label: "Metric and data-quality judgment",
          band: "strong",
          bandLabel: "Strong evidence",
          confidence: 0.81,
          coverage: 0.9,
          critical: true,
          summary:
            "Checked the yield definition before trusting the number and identified that the two periods are not comparable as reported.",
        },
        {
          key: "investigation",
          label: "Investigation and evidence use",
          band: "established",
          bandLabel: "Clear evidence",
          confidence: 0.76,
          coverage: 0.85,
          critical: false,
          summary:
            "Tied each claim to specific rows rather than asserting a conclusion and describing it afterwards.",
        },
        {
          key: "adaptation",
          label: "Adaptation under new information",
          band: seed.score && seed.score >= 70 ? "established" : "developing",
          bandLabel:
            seed.score && seed.score >= 70 ? "Clear evidence" : "Some evidence",
          confidence: 0.64,
          coverage: 0.7,
          critical: false,
          summary:
            "Recalculated after the reclassification start date changed, and said which part of the earlier conclusion no longer held.",
        },
        {
          key: "communication",
          label: "Communication with uncertainty",
          band: "established",
          bandLabel: "Clear evidence",
          confidence: 0.7,
          coverage: 0.75,
          critical: false,
          summary:
            "Named what the data does not establish and proposed a concrete next validation step.",
        },
      ],
      evidence: [
        {
          competencyKey: "metric_judgment",
          indicator: "Read the metric definition before drawing a conclusion",
          // `source` is the scoring method, not the document. Real values are
          // deterministic, ai_rubric, or an authored rule id.
          source: "deterministic",
          quality: 0.9,
          excerpts: [
            "Metric dictionary: completed_good excludes any unit that leaves good output, including HOLD_RECLASS",
          ],
          counterevidence: null,
          explanation:
            "Opened the definition early in the session and cited it in the first claim.",
        },
        {
          competencyKey: "investigation",
          indicator: "Isolated the reclassification events by period",
          source: "deterministic",
          quality: 0.85,
          excerpts: [
            "quality_events.csv: Q-303,current,L1,HOLD_RECLASS,42",
            "quality_events.csv: Q-304,current,L2,HOLD_RECLASS,58",
          ],
          counterevidence: null,
          explanation:
            "Filtered to the current period and found the code absent from the prior one.",
        },
        {
          competencyKey: "communication",
          indicator: "Separated residual operational loss from the reporting change",
          source: "ai_rubric",
          quality: 0.72,
          excerpts: ["production_runs.csv: current,L2,Day,820,90"],
          counterevidence:
            "Cause of the L2 Day loss is not established by the data provided.",
          explanation:
            "Flagged the remaining loss as real and said plainly what it does not explain.",
        },
      ],
    },
    submission: {
      snapshot: {
        deliverable: {
          claim:
            "Reported yield fell 3.2 points, but roughly two thirds of that is a mid-period reporting change.",
          evidence:
            "HOLD_RECLASS appears only in the current period (Q-303, Q-304) and the metric definition excludes those units from completed_good. Prior periods were never restated.",
          caveat:
            "Cause of the remaining L2 Day loss is not established. The data shows the loss but not why it happened.",
          recommendation:
            "Restate the prior period on the current definition, then check L2 Day tooling before the next shift.",
        },
        notes: "",
      },
      externalAiDisclosed: false,
      submittedAt,
    },
    timeline: [
      { type: "session.started", actor: "candidate", resourceId: null, at: startedAt },
      {
        type: "resource.opened",
        actor: "candidate",
        resourceId: "quality_events.csv",
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.36),
      },
      {
        type: "resource.opened",
        actor: "candidate",
        resourceId: "metric_dictionary",
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.3),
      },
      {
        type: "stakeholder.asked",
        actor: "candidate",
        resourceId: "jordan-hale",
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.26),
      },
      {
        type: "curveball.presented",
        actor: "system",
        resourceId: null,
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.2),
      },
      {
        type: "curveball.acknowledged",
        actor: "candidate",
        resourceId: null,
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.18),
      },
      { type: "session.submitted", actor: "candidate", resourceId: null, at: submittedAt },
    ],
    messages: [
      {
        thread: "stakeholder",
        stakeholderId: "jordan-hale",
        sender: "candidate",
        body: "Did anything change in how disposition events were coded during this period?",
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.26),
      },
      {
        thread: "stakeholder",
        stakeholderId: "jordan-hale",
        sender: "stakeholder",
        body: "We introduced a hold-and-reclassify code partway through. I would have to check the exact date.",
        at: hoursAgo((seed.submittedHoursAgo ?? 0) + 0.25),
      },
    ],
    decisions: seed.decided
      ? [
          {
            id: "dec-1",
            decision: "advance",
            notes:
              "Correction holds. Taking the L2 Day question into the follow-up conversation.",
            created_at: hoursAgo((seed.submittedHoursAgo ?? 0) - 4),
          },
        ]
      : [],
    credential: { credential_number: "FYD-PREVIEW-0001" },
  };
}

/**
 * The candidate's view of their own result, in the shape
 * `/api/sim/results/[sessionId]` returns. Same session as the employer report,
 * so the two sides of one attempt can be compared while auditing.
 */
export function previewCandidateResult(sessionId: string) {
  const report = previewReport(sessionId);
  if (!report) return null;

  return {
    ready: true,
    completedAt: report.session.submittedAt,
    credential: { credential_number: "FYD-PREVIEW-0001", issued_at: report.session.submittedAt },
    result: {
      format: "v2" as const,
      engineVersion: "v2" as const,
      simulationTitle: EVALUATION,
      roleKey: ROLE_KEY,
      slug: "ops-yield-investigation",
      performance: 74,
      coverage: 0.82,
      confidence: 0.74,
      band: "established" as const,
      bandLabel: "Clear evidence",
      completionSeconds: 1180,
      competencies: report.analysis.competencies.map((c) => ({
        key: c.key,
        label: c.label,
        performance: Math.round((c.confidence || 0) * 100),
        coverage: c.coverage,
        confidence: c.confidence,
        band: c.band as "strong" | "established" | "developing",
        bandLabel: c.bandLabel,
      })),
      citations: report.analysis.evidence.map((e) => ({
        claim: e.indicator,
        eventOrArtifactId: e.excerpts[0] || "",
        detail: e.explanation,
      })),
      strengths: [
        "Checked the definition of the metric before trusting the number it produced.",
        "Tied each claim to specific rows rather than asserting a conclusion first.",
      ],
      improvements: [
        "The cause of the residual L2 Day loss was left open. Naming what evidence would settle it would have made the recommendation stronger.",
      ],
      disclaimer:
        "This is a record of one piece of work under time pressure. It is not a prediction of job performance.",
    },
  };
}

/** One live share and one revoked one, so both states of the row are visible. */
export function previewReceiptShares(sessionId: string) {
  if (!previewReport(sessionId)) return [];
  return [
    {
      id: "share-live",
      audienceLabel: "Hiring manager at Aldenmoor",
      allowedFields: [
        "role_title",
        "evaluation_title",
        "completion_date",
        "evidence_summaries",
        "limitations",
      ],
      expiresAt: new Date(Date.now() + 21 * 86400000).toISOString(),
      createdAt: hoursAgo(30),
      revoked: false,
      expired: false,
      openedCount: 2,
    },
    {
      id: "share-revoked",
      audienceLabel: "Recruiter, first conversation",
      allowedFields: ["role_title", "evaluation_title", "completion_date"],
      expiresAt: new Date(Date.now() + 40 * 86400000).toISOString(),
      createdAt: hoursAgo(52),
      revoked: true,
      expired: false,
      openedCount: 1,
    },
  ];
}

/**
 * The oral defense set for a previewed report. The questions are tied to
 * limitations the candidate wrote, which is the whole point of the feature.
 */
export function previewDefense(sessionId: string) {
  if (!previewReport(sessionId)) return null;
  return {
    set: { id: "defense-set-preview" },
    questions: [
      {
        id: "q1",
        question_text:
          "You stopped short of naming a cause for the L2 Day loss. What would you have needed to see in order to name one, and what would have changed your mind?",
        purpose:
          "Tests whether the limitation was a considered boundary or a gap they did not notice.",
      },
      {
        id: "q2",
        question_text:
          "The reclassification start date moved partway through. Walk through what you recalculated and what you deliberately left alone.",
        purpose:
          "Tests whether the revision was reasoned or a blanket redo of the earlier answer.",
      },
    ],
    responses: [] as { question_id: string; response_text: string }[],
  };
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
