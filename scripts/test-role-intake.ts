/**
 * Pure checks for engineering role intake: job description extraction,
 * save validation, requirement versioning and work sample invite input.
 * No database, no network.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-role-intake.ts
 */
import { extractJobDescription } from "@/lib/hiring/jd-extract";
import { parseRoleIntake, specializationNote } from "@/lib/hiring/intake-contract";
import {
  criteriaFrom,
  nextRequirementVersion,
  parseRequirements,
  requirementsChanged,
  requirementsFromLists,
  savableRequirementsProblem,
  type RoleRequirement,
} from "@/lib/hiring/requirements";
import { deadlineProblem, parseWorkSampleInvite, zonedTimeToUtc } from "@/lib/hiring/evidence-gap";

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passes++;
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

const JD = `Senior Backend Engineer, Payments

Location: London, UK
Hybrid, three days a week in the office.
Salary: £85,000 - £105,000

What you'll do:
- Design and run the services that move money between ledgers
- Own on-call for the payments API and lead incident reviews
- Work with product on retry and reconciliation behaviour

Requirements:
- 6+ years building production backend services
- Strong experience with Go or Python and PostgreSQL
- Experience designing idempotent APIs and webhook delivery
- Kafka experience is a plus

Nice to have:
- Experience with Kubernetes and Terraform
- Familiarity with card network settlement

About us:
We are a small team building payments infrastructure.`;

console.log("Job description extraction");
{
  const d = extractJobDescription(JD);
  check("title from first line", d.title === "Senior Backend Engineer, Payments", d.title);
  check("level from title", d.level === "senior", d.level);
  check("family from title", d.family === "backend_api_engineer" && d.specialization === "general", [d.family, d.specialization]);
  check("remote policy hybrid wins over office", d.remotePolicy === "hybrid", d.remotePolicy);
  check("location label", d.location === "London, UK", d.location);
  check("compensation label", d.compensation === "£85,000 - £105,000", d.compensation);
  check("three responsibilities", d.responsibilities.length === 3, d.responsibilities);
  check("every requirement is an unconfirmed suggestion", d.requirements.length > 0 && d.requirements.every((r) => r.source === "suggested" && r.confirmed === false));
  const required = d.requirements.filter((r) => r.kind === "required").map((r) => r.text);
  const preferred = d.requirements.filter((r) => r.kind === "preferred").map((r) => r.text);
  check("required split", required.length === 3 && required[0].startsWith("6+ years"), required);
  check("'is a plus' moves to preferred", preferred.includes("Kafka experience is a plus"), preferred);
  check("nice-to-have section is preferred", preferred.includes("Experience with Kubernetes and Terraform") && preferred.length === 3, preferred);
  check("about-us text is not a requirement", !d.requirements.some((r) => /small team/.test(r.text)));
  for (const lang of ["Go", "Python", "PostgreSQL", "Kafka", "Kubernetes", "Terraform"]) {
    check(`language ${lang}`, d.languages.includes(lang), d.languages);
  }
  check("no false Java from JavaScript-free text", !d.languages.includes("Java"), d.languages);
  check("ids are unique", new Set(d.requirements.map((r) => r.id)).size === d.requirements.length);
  check("deterministic text", JSON.stringify(extractJobDescription(JD).requirements.map((r) => r.text)) === JSON.stringify(d.requirements.map((r) => r.text)));
}
{
  const d = extractJobDescription(`Frontend Developer\nFully remote within EU time zones.\n- 2 years of experience with React and TypeScript\n- Build accessible UI components\n- Familiar with Next.js, a plus`);
  check("frontend specialization", d.family === "software_engineer" && d.specialization === "frontend", [d.family, d.specialization]);
  check("remote", d.remotePolicy === "remote", d.remotePolicy);
  check("level from years when title has none", d.level === "junior", d.level);
  check("keyword fallback finds requirements", d.requirements.some((r) => r.kind === "required" && r.text.includes("React")), d.requirements);
  check("keyword fallback marks preferred", d.requirements.some((r) => r.kind === "preferred" && r.text.includes("Next.js")), d.requirements);
  check("keyword fallback keeps work as responsibility", d.responsibilities.includes("Build accessible UI components"), d.responsibilities);
  check("languages", ["React", "TypeScript", "Next.js"].every((l) => d.languages.includes(l)) && !d.languages.includes("Java"), d.languages);
}
{
  const d = extractJobDescription("Staff Platform Engineer\nOn-site in Berlin.\n");
  check("staff level", d.level === "staff", d.level);
  check("platform specialization", d.specialization === "platform_infrastructure", d.specialization);
  check("onsite", d.remotePolicy === "onsite", d.remotePolicy);
  check("empty description gives empty lists", d.requirements.length === 0 && d.responsibilities.length === 0);
}

console.log("Save validation");
const base = {
  title: "Backend Engineer",
  description: "",
  family: "backend_api_engineer",
  specialization: "general",
  level: "mid",
  acceptedEvidence: ["public_repository"],
};
const confirmed: RoleRequirement = { id: "r_a", text: "Designs idempotent APIs", kind: "required", source: "employer", confirmed: true };
const suggested: RoleRequirement = { id: "r_b", text: "Kafka experience", kind: "preferred", source: "suggested", confirmed: false };
{
  const bad = parseRoleIntake({ ...base, requirements: [confirmed, suggested, { ...suggested, id: "r_c", text: "Go in production" }] });
  check("rejects unconfirmed suggestions", bad.ok === false && /2 suggested requirements still need review/.test(bad.error), bad);
  const good = parseRoleIntake({ ...base, requirements: [confirmed, { ...suggested, confirmed: true }] });
  check("accepts reviewed suggestions", good.ok === true, good);
  if (good.ok) {
    check("defaults work sample policy to when_evidence_gap", good.value.workSamplePolicy === "when_evidence_gap");
    check("defaults visibility to private", good.value.visibility === "private");
  }
  check("removing the suggestion also saves", parseRoleIntake({ ...base, requirements: [confirmed] }).ok === true);
  check("savableRequirementsProblem singular", savableRequirementsProblem([suggested]) === "1 suggested requirement still needs review. Confirm, make preferred, or remove each one before saving.", savableRequirementsProblem([suggested]));
  check("rejects no accepted evidence", parseRoleIntake({ ...base, acceptedEvidence: [] }).ok === false);
  check("rejects unknown family", parseRoleIntake({ ...base, family: "fpa_analyst" }).ok === false);
  check("rejects long title", parseRoleIntake({ ...base, title: "x".repeat(121) }).ok === false);
  check("rejects reviewer that is not a member id", parseRoleIntake({ ...base, reviewerIds: ["not-a-uuid"] }).ok === false);
  check("rejects duplicate requirement ids", parseRequirements([confirmed, { ...confirmed, text: "Other text" }]).ok === false);
  check("rejects bad requirement kind", parseRequirements([{ ...confirmed, kind: "must" }]).ok === false);
  check("atypical specialization is allowed with a note", specializationNote("backend_api_engineer", "frontend") !== null && parseRoleIntake({ ...base, specialization: "frontend" }).ok === true);
  check("typical specialization has no note", specializationNote("software_engineer", "frontend") === null);
  const crit = criteriaFrom([confirmed, suggested, { ...suggested, id: "r_d", text: "Terraform", confirmed: true }]);
  check("criteria only from confirmed", JSON.stringify(crit) === JSON.stringify({ required: ["Designs idempotent APIs"], preferred: ["Terraform"] }), crit);
}

console.log("Requirement versions");
{
  const before = [confirmed, { ...suggested, confirmed: true }];
  check("no change keeps the version", nextRequirementVersion({ requirementVersion: 3, legacyVersion: 3 }, requirementsChanged(before, before.map((r) => ({ ...r })))) === null);
  check("unconfirmed edits do not count", !requirementsChanged(before, [...before, { ...suggested, id: "r_z", text: "Draft" }]));
  check("text change bumps", nextRequirementVersion({ requirementVersion: 3, legacyVersion: 3 }, requirementsChanged(before, [{ ...confirmed, text: "Designs idempotent HTTP APIs" }, before[1]])) === 4);
  check("kind change bumps", requirementsChanged(before, [{ ...confirmed, kind: "preferred" }, before[1]]));
  check("reorder bumps", requirementsChanged(before, [before[1], before[0]]));
  check("removal bumps", requirementsChanged(before, [before[0]]));
  check("legacy rubric version is respected", nextRequirementVersion({ requirementVersion: 1, legacyVersion: 5 }, true) === 6);
  const rebuilt = requirementsFromLists(["Designs idempotent APIs", "New thing"], ["Kafka experience"], before);
  check("lists reuse ids for matching text", rebuilt[0].id === "r_a" && rebuilt[2].id === "r_b" && rebuilt[1].id !== "r_a", rebuilt);
}

console.log("Work sample invite input");
{
  const now = new Date("2026-10-07T12:00:00Z");
  const utc = zonedTimeToUtc("2026-10-14T17:00", "Europe/London");
  check("London BST deadline converts", utc?.toISOString() === "2026-10-14T16:00:00.000Z", utc?.toISOString());
  const ny = zonedTimeToUtc("2026-12-01T09:00", "America/New_York");
  check("New York EST deadline converts", ny?.toISOString() === "2026-12-01T14:00:00.000Z", ny?.toISOString());
  check("bad zone rejected", zonedTimeToUtc("2026-10-14T17:00", "Mars/Olympus") === null);
  check("deadline too soon", deadlineProblem(new Date("2026-10-08T00:00:00Z"), now) !== null);
  check("deadline too far", deadlineProblem(new Date("2026-12-01T00:00:00Z"), now) !== null);
  check("deadline in window", deadlineProblem(new Date("2026-10-14T16:00:00Z"), now) === null);
  const valid = {
    scenarioVersionId: "a24ca01d-6df6-4683-8688-e18e76e5a2c0",
    requirementId: "r_a",
    uncertainCapability: "Whether they handle duplicate webhook deliveries safely.",
    whyItMatters: "The role owns payment webhooks where duplicates move money twice.",
    observableWork: "Fixing a retry bug in a webhook consumer and explaining the trade-offs.",
    deadlineLocal: "2026-10-14T17:00",
    timeZone: "Europe/London",
  };
  check("valid invite parses", parseWorkSampleInvite(valid).ok === true, parseWorkSampleInvite(valid));
  for (const field of ["uncertainCapability", "whyItMatters", "observableWork"] as const) {
    check(`missing ${field} rejected`, parseWorkSampleInvite({ ...valid, [field]: "short" }).ok === false);
  }
  check("bad scenario id rejected", parseWorkSampleInvite({ ...valid, scenarioVersionId: "x" }).ok === false);
  check("bad time zone rejected", parseWorkSampleInvite({ ...valid, timeZone: "Nowhere" }).ok === false);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
