import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getReview, type ReviewDecision } from "@/lib/passport/store";
import type { PassportData, PassportEvidence } from "@/lib/passport/view";
import { authorizeReviewScope, listMappings, listQuestions, type Assessment, type EvidenceMapping, type MappingStatus } from "./review";

/**
 * A decision brief for one shared passport reviewed against one role.
 *
 * Assembled on request from stored records: the role's requirements, the
 * evidence reviewers mapped to each, the engineer's own context, questions
 * and answers, and the recorded decision. The reviewer's private note is
 * never read here, so it cannot leak into the page or an export.
 */

export type BriefRequirement = {
  text: string;
  outcome: "supported" | "insufficient" | "no_evidence" | "concern";
  outcomeLabel: string;
  items: Array<{
    status: MappingStatus;
    finding: PassportEvidence | null;
    reviewerNote: string;
    noteBy: string | null;
  }>;
};

export type DecisionBrief = {
  candidateName: string;
  organizationName: string;
  role: { id: string; title: string };
  otherRoles: Array<{ id: string; title: string }>;
  generatedAt: string;
  projects: Array<{ repo: string; commit: string; analyzedAt: string; coverage: string; partial: boolean }>;
  versionPolicy: "pinned" | "follow" | null;
  requirements: BriefRequirement[];
  contributions: NonNullable<PassportData["contributions"]>;
  openQuestions: Array<{ question: string; askedBy: string | null; askedAt: string }>;
  answered: Array<{ question: string; response: string; askedBy: string | null; answeredAt: string | null }>;
  decision: { value: ReviewDecision; label: string; decidedAt: string | null; decidedBy: string | null };
  limitations: string[];
};

export type BriefResult =
  | { status: "ok"; brief: DecisionBrief }
  | { status: "missing" }
  | { status: "revoked" }
  | { status: "no_role" };

const DECISION_LABEL: Record<ReviewDecision, string> = {
  none: "No decision recorded",
  advance: "Advance",
  hold: "Hold",
  decline: "Decline",
};

const OUTCOME_LABEL: Record<BriefRequirement["outcome"], string> = {
  supported: "Supporting evidence",
  insufficient: "Relevant but not yet sufficient",
  no_evidence: "Not observed in the shared work",
  concern: "Concern",
};

const FROM_ASSESSMENT: Record<Assessment, BriefRequirement["outcome"]> = {
  supports: "supported",
  insufficient: "insufficient",
  not_observed: "no_evidence",
  concern: "concern",
};

/** The reviewer's recorded assessment wins; without one, linked evidence supports and anything else is unsettled. */
function outcomeFor(rows: EvidenceMapping[]): BriefRequirement["outcome"] {
  const assessed = rows.find((m) => m.assessment);
  if (assessed?.assessment) return FROM_ASSESSMENT[assessed.assessment];
  if (rows.length === 0) return "no_evidence";
  if (rows.some((m) => m.status === "accepted" || m.status === "corrected")) return "supported";
  return "insufficient";
}

async function emailsFor(userIds: string[]): Promise<Map<string, string>> {
  const db = createAdminSupabaseClient();
  const unique = [...new Set(userIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const { data } = await db.auth.admin.getUserById(id);
      return [id, data.user?.email ?? "A teammate"] as const;
    }),
  );
  return new Map(entries);
}

export async function buildDecisionBrief(organizationId: string, reviewId: string, requestedRoleId: string | null): Promise<BriefResult> {
  const review = await getReview(organizationId, reviewId);
  if (!review) return { status: "missing" };
  if (!review.passport) return { status: "revoked" };
  const passport = review.passport;
  const db = createAdminSupabaseClient();

  const [{ data: roles }, { data: mapped }, { data: org }, { data: decidedRow }] = await Promise.all([
    db.from("hiring_roles").select("id,title").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100),
    db.from("requirement_evidence_mappings").select("role_id").eq("organization_id", organizationId).eq("share_id", review.shareId),
    db.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    db.from("employer_passport_reviews").select("decided_by").eq("id", review.id).maybeSingle(),
  ]);
  const roleList = ((roles ?? []) as Array<{ id: string; title: string }>).map((r) => ({ id: r.id, title: r.title }));
  if (roleList.length === 0) return { status: "no_role" };
  const reviewedRoleIds = new Set(((mapped ?? []) as Array<{ role_id: string }>).map((m) => m.role_id));
  const role =
    roleList.find((r) => r.id === requestedRoleId) ?? roleList.find((r) => reviewedRoleIds.has(r.id)) ?? roleList[0];

  const scope = await authorizeReviewScope(organizationId, role.id, review.shareId);
  if (!scope) return { status: "revoked" };
  const [mappings, questions] = await Promise.all([
    listMappings(organizationId, role.id, review.shareId),
    listQuestions(organizationId, role.id, review.shareId),
  ]);

  const decidedBy = (decidedRow as { decided_by: string | null } | null)?.decided_by ?? null;
  const people = await emailsFor([
    ...mappings.map((m) => m.createdBy ?? ""),
    ...questions.map((q) => q.askedBy ?? ""),
    decidedBy ?? "",
  ]);
  const evidenceById = new Map(passport.projects.flatMap((p) => p.evidence).map((e) => [e.id, e] as const));

  const requirements: BriefRequirement[] = scope.requirements.map((text, index) => {
    const rows = mappings.filter((m) => m.requirementIndex === index);
    const outcome = outcomeFor(rows);
    return {
      text,
      outcome,
      outcomeLabel: OUTCOME_LABEL[outcome],
      items: rows.map((m) => ({
        status: m.status,
        finding: m.evidenceId ? (evidenceById.get(m.evidenceId) ?? null) : null,
        reviewerNote: m.reviewerNote,
        noteBy: m.createdBy ? (people.get(m.createdBy) ?? null) : null,
      })),
    };
  });

  return {
    status: "ok",
    brief: {
      candidateName: passport.displayName || passport.githubLogin || "Candidate",
      organizationName: (org as { name: string } | null)?.name ?? "Your workspace",
      role,
      otherRoles: roleList.filter((r) => r.id !== role.id),
      generatedAt: new Date().toISOString(),
      projects: passport.projects
        .filter((p) => p.status !== "stale")
        .map((p) => ({
          repo: p.repoFullName,
          commit: p.commitSha.slice(0, 7),
          analyzedAt: p.analyzedAt,
          coverage: `${p.coverage.analyzedFiles} of ${p.coverage.totalFiles} files analyzed`,
          partial: p.status === "partial",
        })),
      versionPolicy: passport.shareScope?.versionPolicy ?? null,
      requirements,
      contributions: passport.contributions ?? [],
      openQuestions: questions
        .filter((q) => q.status === "open")
        .map((q) => ({ question: q.question, askedBy: q.askedBy ? (people.get(q.askedBy) ?? null) : null, askedAt: q.createdAt })),
      answered: questions
        .filter((q) => q.response.trim().length > 0)
        .map((q) => ({ question: q.question, response: q.response, askedBy: q.askedBy ? (people.get(q.askedBy) ?? null) : null, answeredAt: q.answeredAt })),
      decision: {
        value: review.decision,
        label: DECISION_LABEL[review.decision],
        decidedAt: review.decidedAt,
        decidedBy: decidedBy ? (people.get(decidedBy) ?? null) : null,
      },
      limitations: [
        "Findings come from reading the code at the listed versions. The code was not run, so runtime behavior was not assessed.",
        "Fydell does not verify who wrote each line. Contribution context is the engineer's own statement.",
        "Requirements with no mapped evidence say nothing either way about the engineer's ability; they were not covered by the shared work.",
      ],
    },
  };
}

function lines(start: number, end: number): string {
  return end > start ? `${start}-${end}` : `${start}`;
}

/** Plain Markdown export of the same brief. Contains no private notes. */
export function briefToMarkdown(b: DecisionBrief): string {
  const out: string[] = [];
  out.push(`# Decision brief: ${b.candidateName}`);
  out.push("");
  out.push(`Role: ${b.role.title}  `);
  out.push(`Prepared for ${b.organizationName} on ${new Date(b.generatedAt).toUTCString()}  `);
  out.push(`Decision: ${b.decision.label}${b.decision.decidedBy ? ` (recorded by ${b.decision.decidedBy})` : ""}`);
  out.push("");
  out.push("## Work reviewed");
  for (const p of b.projects) out.push(`- ${p.repo} at ${p.commit}, ${p.coverage}${p.partial ? ", partial analysis" : ""}`);
  if (b.versionPolicy) out.push(`- Link shows ${b.versionPolicy === "pinned" ? "fixed versions" : "the newest analysis"}`);
  out.push("");
  out.push("## Requirements");
  for (const r of b.requirements) {
    out.push(`### ${r.text}`);
    out.push(`${r.outcomeLabel}`);
    for (const i of r.items) {
      if (i.finding) out.push(`- ${i.finding.finding} (${i.finding.repo}: ${i.finding.path} lines ${lines(i.finding.startLine, i.finding.endLine)})`);
      if (i.finding?.limitations.length) out.push(`  - Limits: ${i.finding.limitations.join(" ")}`);
      if (i.reviewerNote) out.push(`  - Note from ${i.noteBy ?? "a reviewer"}: ${i.reviewerNote}`);
    }
    out.push("");
  }
  if (b.contributions.length) {
    out.push("## Contribution context (engineer's statements, not verified)");
    for (const c of b.contributions) {
      out.push(`### ${c.repoFullName}`);
      if (c.workedOn) out.push(`- Worked on: ${c.workedOn}`);
      if (c.inherited) out.push(`- Inherited: ${c.inherited}`);
      if (c.constraintsFaced) out.push(`- Constraints: ${c.constraintsFaced}`);
      if (c.results) out.push(`- Results: ${c.results}`);
    }
    out.push("");
  }
  out.push("## Open questions");
  if (b.openQuestions.length === 0) out.push("None.");
  for (const q of b.openQuestions) out.push(`- ${q.question}${q.askedBy ? ` (asked by ${q.askedBy})` : ""}`);
  out.push("");
  if (b.answered.length) {
    out.push("## Answered questions");
    for (const q of b.answered) out.push(`- Q: ${q.question}\n  A: ${q.response}`);
    out.push("");
  }
  out.push("## Limitations");
  for (const l of b.limitations) out.push(`- ${l}`);
  out.push("");
  out.push("Private reviewer notes are not included in this brief.");
  return out.join("\n");
}
