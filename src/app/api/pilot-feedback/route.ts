import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ROLE_KEYS = new Set([
  "data_analyst",
  "bi_analyst",
  "solutions_engineer",
  "implementation_consultant",
  "technical_support_engineer",
  "business_systems_analyst",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRating(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function asText(value: unknown, max = 4000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Yes -> 5, Partially -> 3, No -> 1, so trust can be averaged like ratings. */
function trustToRating(trust: string | null): number | null {
  if (trust === "Yes") return 5;
  if (trust === "Partially") return 3;
  if (trust === "No") return 1;
  return null;
}

type Payload = {
  sessionId?: unknown;
  templateSlug?: unknown;
  roleKey?: unknown;
  simulationTitle?: unknown;
  profile?: {
    perspective?: unknown;
    familiarity?: unknown;
    name?: unknown;
    email?: unknown;
    organization?: unknown;
  };
  ratings?: {
    clarity?: unknown;
    taskEase?: unknown;
    realism?: unknown;
    resultAccuracy?: unknown;
  };
  completedWithoutHelp?: unknown;
  durationOpinion?: unknown;
  trustScore?: unknown;
  interviewValue?: unknown;
  candidatePilotInterest?: unknown;
  contactOk?: unknown;
  text?: Record<string, unknown>;
  evidence?: { mostUseful?: unknown; leastUseful?: unknown; scorePreference?: unknown };
  roleAnswers?: unknown;
};

/** POST: store one pilot tester feedback submission. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Feedback storage is not configured on this deployment. Please try again later." },
      { status: 503 }
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clarity = asRating(body.ratings?.clarity);
  const taskEase = asRating(body.ratings?.taskEase);
  const realism = asRating(body.ratings?.realism);
  const resultAccuracy = asRating(body.ratings?.resultAccuracy);

  const completedWithoutHelp = asText(body.completedWithoutHelp, 20);
  const durationOpinion = asText(body.durationOpinion, 20);
  const trustScore = asText(body.trustScore, 20);
  const interviewValue = asText(body.interviewValue, 40);
  const candidatePilotInterest = asText(body.candidatePilotInterest, 20);
  const contactChoice = asText(body.contactOk, 10);
  const contactOk = contactChoice === "Yes" ? true : contactChoice === "No" ? false : null;

  const textBlock = body.text && typeof body.text === "object" ? body.text : {};
  const freeText: Record<string, string> = {};
  for (const [key, raw] of Object.entries(textBlock)) {
    const v = asText(raw);
    if (v) freeText[key] = v;
  }

  const evidence = {
    mostUseful: asText(body.evidence?.mostUseful, 60),
    leastUseful: asText(body.evidence?.leastUseful, 60),
    scorePreference: asText(body.evidence?.scorePreference, 80),
  };

  const roleAnswers = Array.isArray(body.roleAnswers)
    ? body.roleAnswers
        .map((qa) => {
          if (!qa || typeof qa !== "object") return null;
          const item = qa as { question?: unknown; answer?: unknown };
          const question = asText(item.question, 300);
          const answer = asText(item.answer);
          return question && answer ? { question, answer } : null;
        })
        .filter((qa): qa is { question: string; answer: string } => qa !== null)
        .slice(0, 8)
    : [];

  const hasAnswer =
    clarity !== null ||
    taskEase !== null ||
    realism !== null ||
    resultAccuracy !== null ||
    completedWithoutHelp !== null ||
    durationOpinion !== null ||
    trustScore !== null ||
    interviewValue !== null ||
    candidatePilotInterest !== null ||
    contactOk !== null ||
    evidence.mostUseful !== null ||
    evidence.leastUseful !== null ||
    evidence.scorePreference !== null ||
    Object.keys(freeText).length > 0 ||
    roleAnswers.length > 0;

  if (!hasAnswer) {
    return NextResponse.json(
      { error: "Please answer at least one question before submitting." },
      { status: 400 }
    );
  }

  const email = asText(body.profile?.email, 320);
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "The email address does not look valid. Fix it or remove it, then retry." },
      { status: 400 }
    );
  }

  const roleKeyRaw = asText(body.roleKey, 60);
  const roleKey = roleKeyRaw && ROLE_KEYS.has(roleKeyRaw) ? roleKeyRaw : null;
  const sessionIdRaw = asText(body.sessionId, 40);
  const sessionId = sessionIdRaw && UUID_RE.test(sessionIdRaw) ? sessionIdRaw : null;

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("pilot_feedback").insert({
    session_id: sessionId,
    template_slug: asText(body.templateSlug, 120),
    role_key: roleKey,
    tester_name: asText(body.profile?.name, 200),
    tester_email: email,
    organization: asText(body.profile?.organization, 200),
    tester_perspective: asText(body.profile?.perspective, 80),
    role_familiarity: asText(body.profile?.familiarity, 120),
    clarity_rating: clarity,
    realism_rating: realism,
    report_trust_rating: trustToRating(trustScore),
    task_ease_rating: taskEase,
    result_accuracy_rating: resultAccuracy,
    completed_without_help: completedWithoutHelp,
    duration_opinion: durationOpinion,
    trust_score: trustScore,
    interview_value: interviewValue,
    candidate_pilot_interest: candidatePilotInterest,
    contact_ok: contactOk,
    issue_severity: freeText.controlIssues ? "reported" : null,
    responses: {
      simulationTitle: asText(body.simulationTitle, 200),
      text: freeText,
      evidence,
      roleAnswers,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save your feedback. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
