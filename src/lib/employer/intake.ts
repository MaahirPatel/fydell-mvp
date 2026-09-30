/**
 * Employer role intake and scenario matching.
 *
 * Asks what the employer is hiring for before any assessment is chosen,
 * screens the stated criteria, and recommends only scenarios an employer can
 * actually use today. Pure: the route persists the intake and any role
 * request (migration 039).
 *
 * Rules:
 * - Criteria naming protected characteristics or their usual proxies are
 *   rejected. Culture fit and personality are rejected: Fydell does not score
 *   them. Vague traits need clarification and are never silently converted
 *   into assessment criteria.
 * - Work practices must be observable behaviour ("explains risks before
 *   handoff"), not traits.
 * - Job description text is untrusted input. It is stored bounded and never
 *   interpreted as instructions; any AI-suggested fields need employer review.
 * - An unsupported family or stack produces a role request, not a fabricated
 *   available test.
 */
import { z } from "zod";
import {
  availabilityOf,
  CATALOG,
  roleFamilyKeySchema,
  summarize,
  type CatalogEntry,
  type CatalogSummary,
  type RoleFamilyKey,
} from "@/lib/scenario-catalog";

const item = (max: number) => z.string().trim().min(1).max(max);

export const AI_POLICIES = ["none", "documentation_only", "assistants_allowed_disclosed"] as const;

export const roleIntakeSchema = z.object({
  title: item(120),
  family: z.union([roleFamilyKeySchema, z.literal("other")]),
  customFamily: z.string().trim().max(80).optional(),
  responsibilities: z.array(item(280)).min(1).max(8),
  stack: z.array(item(40)).max(12).default([]),
  level: z.enum(["entry", "mid", "senior", "staff", "unspecified"]).default("unspecified"),
  autonomy: z.enum(["guided", "independent", "leads_others", "unspecified"]).default("unspecified"),
  jobDescription: z.string().max(20000).optional(),
  needToLearn: z.array(item(280)).min(1).max(6),
  criteria: z.array(item(200)).max(10).default([]),
  mustHaves: z.array(item(200)).max(6).default([]),
  effortLimitMinutes: z.number().int().min(15).max(240),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  aiPolicy: z.enum(AI_POLICIES),
  workPractices: z.array(item(200)).max(6).default([]),
  accommodationContact: item(200),
});
export type RoleIntakeInput = z.input<typeof roleIntakeSchema>;
export type RoleIntake = z.output<typeof roleIntakeSchema>;

export type ScreenVerdict = "accepted" | "needs_clarification" | "rejected";
export interface ScreenResult {
  text: string;
  field: "criteria" | "mustHaves" | "workPractices" | "needToLearn";
  verdict: ScreenVerdict;
  reason: string | null;
}

// Protected characteristics and common proxies. Kept narrow so ordinary
// engineering language ("race condition", "white-box tests", "single source
// of truth", "healthy test suite") is not rejected.
const PROHIBITED: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(aged \d{2}|age (limit|range|requirement)|under the age|years old|young(er)?|youthful|digital natives?|recent grad(uate)?s? only)\b/i, reason: "Age, or a common proxy for it, cannot be an assessment criterion." },
  { pattern: /\b(male|female|gender|men|women|guys|salesman)\b/i, reason: "Gender cannot be an assessment criterion." },
  { pattern: /\b(racial|ethnic(ity)?|skin colou?r)\b|\brace\b(?!\s+conditions?)/i, reason: "Race or ethnicity cannot be an assessment criterion." },
  { pattern: /\b(religio(n|us)|christian|muslim|jewish|hindu|church)\b/i, reason: "Religion cannot be an assessment criterion." },
  { pattern: /\b(pregnan\w*|maternity|married|marital status|childcare|family plans?|has kids|no kids)\b/i, reason: "Pregnancy, marital or family status cannot be an assessment criterion." },
  { pattern: /\b(nationality|native (english )?speakers?|accent|foreigners?)\b/i, reason: "Nationality, accent or native-speaker status cannot be an assessment criterion. State the language task the job requires instead." },
  { pattern: /\b(disab\w*|handicap\w*|health conditions?|mental health|neurotypical|able[- ]bodied)\b/i, reason: "Disability or health cannot be an assessment criterion; use the accommodation route." },
  { pattern: /\b(sexual orientation|gay|lesbian|lgbt\w*)\b/i, reason: "Sexual orientation cannot be an assessment criterion." },
  { pattern: /\b(culture[- ]?fit|cultural fit|personality|temperament|emotional(ly)?|likeable|vibes?)\b/i, reason: "Fydell does not score culture fit, personality or emotional state. Describe an observable work practice instead." },
];

// Traits too vague to observe; they need rewording as behaviour.
const VAGUE = /\b(rock ?star|ninja|guru|passionate|passion|team player|hustle|hungry|grit|attitude|positive|energetic|self[- ]starter|go[- ]getter|smart|brilliant|10x|a[- ]player|good fit)\b/i;

// Observable work-practice verbs.
const BEHAVIOUR = /\b(explain\w*|clarif\w*|document\w*|communicat\w*|report\w*|test\w*|ask\w*|flag\w*|review\w*|writ\w*|hand\w* off|handoff|estimat\w*|escalat\w*|summari[sz]\w*|state\w*|names?|raises?|verif\w*)\b/i;

export function screenText(text: string, field: ScreenResult["field"]): ScreenResult {
  for (const p of PROHIBITED) {
    if (p.pattern.test(text)) return { text, field, verdict: "rejected", reason: p.reason };
  }
  if (VAGUE.test(text)) {
    return {
      text,
      field,
      verdict: "needs_clarification",
      reason: "Too vague to observe. Describe what the person does, for example \"clarifies ambiguous acceptance requirements\".",
    };
  }
  if (field === "workPractices" && !BEHAVIOUR.test(text)) {
    return {
      text,
      field,
      verdict: "needs_clarification",
      reason: "Work practices must be observable behaviour, for example \"documents changes so a teammate can continue\".",
    };
  }
  return { text, field, verdict: "accepted", reason: null };
}

export function screenIntake(intake: RoleIntake): ScreenResult[] {
  return [
    ...intake.criteria.map((t) => screenText(t, "criteria")),
    ...intake.mustHaves.map((t) => screenText(t, "mustHaves")),
    ...intake.workPractices.map((t) => screenText(t, "workPractices")),
    ...intake.needToLearn.map((t) => screenText(t, "needToLearn")),
  ];
}

/** Job descriptions are untrusted: strip control characters, keep bounded. Never executed or obeyed. */
export function sanitizeJobDescription(text: string | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return cleaned ? cleaned.slice(0, 20000) : null;
}

const STOP = new Set(["the", "and", "for", "with", "our", "their", "to", "of", "a", "an", "in", "on", "we", "you", "will", "be", "is", "are", "that", "this", "it", "as", "by", "or", "from", "at"]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((w) => w.replace(/\.$/, ""))
      .filter((w) => w.length > 2 && !STOP.has(w))
  );
}

function overlaps(a: string, b: string[]): boolean {
  const aw = words(a);
  return b.some((x) => [...words(x)].some((w) => aw.has(w)));
}

export interface Recommendation extends CatalogSummary {
  matchingResponsibilities: string[];
  unmatchedResponsibilities: string[];
  stackOverlap: string[];
  fitsEffortLimit: boolean;
}

export interface RoleRequestDraft {
  family: RoleFamilyKey | "other";
  title: string;
  reason: "family_unavailable" | "custom_family" | "stack_unsupported";
  detail: string;
}

export interface MatchResult {
  recommendations: Recommendation[];
  /** The family's blueprint when it exists but cannot be used yet. */
  unavailable: CatalogSummary | null;
  roleRequest: RoleRequestDraft | null;
}

function recommend(entry: CatalogEntry, intake: RoleIntake): Recommendation {
  const s = entry.initialScenario;
  const targets = [...s.responsibilityTags, ...s.capabilitiesAssessed];
  const matching = intake.responsibilities.filter((r) => overlaps(r, targets));
  const stackWords = new Set(s.stackTags.map((t) => t.toLowerCase()));
  return {
    ...summarize(entry),
    matchingResponsibilities: matching,
    unmatchedResponsibilities: intake.responsibilities.filter((r) => !matching.includes(r)),
    stackOverlap: intake.stack.filter((t) => stackWords.has(t.toLowerCase())),
    fitsEffortLimit: s.effortMinutes <= intake.effortLimitMinutes,
  };
}

export function matchScenarios(intake: RoleIntake, catalog: CatalogEntry[] = CATALOG): MatchResult {
  if (intake.family === "other") {
    return {
      recommendations: [],
      unavailable: null,
      roleRequest: {
        family: "other",
        title: intake.title,
        reason: "custom_family",
        detail: intake.customFamily?.trim() || "Custom role family",
      },
    };
  }
  const entry = catalog.find((e) => e.family === intake.family);
  if (!entry || availabilityOf(entry) === "unavailable") {
    return {
      recommendations: [],
      unavailable: entry ? summarize(entry) : null,
      roleRequest: {
        family: intake.family,
        title: intake.title,
        reason: "family_unavailable",
        detail: entry ? entry.validation.blockers.join("; ") : "No blueprint for this family",
      },
    };
  }
  const rec = recommend(entry, intake);
  const stackUnsupported = intake.stack.length > 0 && rec.stackOverlap.length === 0;
  return {
    recommendations: [rec],
    unavailable: null,
    roleRequest: stackUnsupported
      ? {
          family: intake.family,
          title: intake.title,
          reason: "stack_unsupported",
          detail: `Requested stack (${intake.stack.join(", ")}) is not covered; the scenario uses ${entry.initialScenario.stackTags.join(", ")}.`,
        }
      : null,
  };
}

export type IntakeOutcome =
  | { ok: true; intake: RoleIntake; screening: ScreenResult[]; match: MatchResult }
  | { ok: false; code: "validation_failed"; issues: string[] }
  | { ok: false; code: "criteria_rejected"; screening: ScreenResult[] };

export function processIntake(raw: unknown): IntakeOutcome {
  const parsed = roleIntakeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "validation_failed", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const intake = { ...parsed.data, jobDescription: sanitizeJobDescription(parsed.data.jobDescription) ?? undefined };
  const screening = screenIntake(intake);
  if (screening.some((s) => s.verdict === "rejected")) {
    return { ok: false, code: "criteria_rejected", screening };
  }
  return { ok: true, intake, screening, match: matchScenarios(intake) };
}
