/**
 * Employer grind — role definition, assessment preview, customization bounds
 * (EMP-01/02/04).
 *
 * EMP-01: role captures family, stack, responsibilities, evaluation criteria;
 * bounded fields, no giant configuration form.
 * EMP-02: employer previews candidate instructions, tools, effort, rubric,
 * scope and an example report before sending.
 * EMP-04: company context/instructions editable within safe limits;
 * substantive changes need validated tests/rubric before release.
 * In-process with fakes.
 */

import { defineRole } from "../src/lib/employer/roles";
import { assembleAssessmentPreview } from "../src/lib/employer/preview";
import { classifyCustomization } from "../src/lib/employer/customization";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

/* EMP-01 --------------------------------------------------------------------------- */

section("EMP-01: create a useful role — bounded, job-relevant definition");

{
  const r = defineRole("org-1", "u-employer", {
    title: "Backend Engineer",
    family: "Engineering",
    stack: ["Node.js", "PostgreSQL", "TypeScript"],
    responsibilities: [
      "Own webhook delivery reliability for partner integrations.",
      "Investigate production incidents and write clear handoffs.",
    ],
    evaluationCriteria: [
      "Correctly isolates the defect from logs and code.",
      "Adds a regression test for the fixed behavior.",
      "Communicates the fix and remaining risk clearly.",
    ],
  });
  ok("role defines cleanly", r.ok);
  if (!r.ok) throw new Error("setup failed");
  ok("role carries family + stack + responsibilities + criteria",
    r.value.family === "Engineering" &&
    r.value.stack.length === 3 &&
    r.value.responsibilities.length === 2 &&
    r.value.evaluationCriteria.length === 3
  );

  const empty = defineRole("org-1", "u-employer", {
    title: "  ",
    family: "Engineering",
    stack: ["Node.js"],
    responsibilities: ["Do work."],
    evaluationCriteria: ["Be good."],
  });
  ok("blank title rejected", !empty.ok);

  const giant = defineRole("org-1", "u-employer", {
    title: "Backend Engineer",
    family: "Engineering",
    stack: Array.from({ length: 30 }, (_, i) => `tool-${i}`),
    responsibilities: ["Do work."],
    evaluationCriteria: ["Be good."],
  });
  ok("giant stack list rejected (no giant config form)", !giant.ok);

  const noCriteria = defineRole("org-1", "u-employer", {
    title: "Backend Engineer",
    family: "Engineering",
    stack: ["Node.js"],
    responsibilities: ["Do work."],
    evaluationCriteria: [],
  });
  ok("role without evaluation criteria rejected", !noCriteria.ok);
}

/* EMP-02 --------------------------------------------------------------------------- */

section("EMP-02: preview the assessment before sending");

{
  const preview = assembleAssessmentPreview({
    scenario: {
      title: "Webhook retry incident",
      mission: "Partner webhooks are being delivered twice. Find the defect, fix it, add a regression test, and hand off.",
      durationMinutes: 90,
      requiredTools: ["Desktop app (macOS/Windows/Linux)", "Node.js 20 (bundled)", "No Docker or Git setup required"],
      resources: [
        { title: "Incident brief", kind: "brief" },
        { title: "Service logs", kind: "logs" },
        { title: "Public tests", kind: "tests" },
      ],
      questions: [{ prompt: "Fix the defect and add a regression test.", kind: "task", points: 100 }],
      aiPolicy: "AI assistants are permitted; usage is self-reported and observed interactions are recorded separately.",
      versionLabel: "v1.0.0",
    },
    rubric: {
      versionLabel: "v1.0.0",
      dimensions: [
        { label: "Correctness", description: "Defect isolated and fixed correctly.", weight: 40 },
        { label: "Engineering judgment", description: "Sound trade-offs under incident pressure.", weight: 30 },
        { label: "Response to requirements", description: "Follows the updated brief.", weight: 15 },
        { label: "Work communication", description: "Clear handoff.", weight: 15 },
      ],
    },
    exampleReportId: "rep-example-1",
  });

  ok("preview shows candidate instructions", preview.candidateInstructions.includes("delivered twice"));
  ok("preview shows required tools", preview.requiredTools.length === 3);
  ok("preview states expected effort", preview.expectedEffort.includes("90 minutes"));
  ok("preview exposes the rubric with dimensions", preview.rubricDimensions.length === 4);
  ok("preview shows supported scope", preview.supportedScope.length === 3);
  ok("preview links an example report (labeled sample data)", preview.exampleReport?.note.includes("sample data") === true);
  ok("preview states the AI policy", preview.aiPolicy.includes("permitted"));
  ok("preview describes the evaluation flow", preview.evaluationFlow.length === 5);
  ok("preview pins scenario + rubric versions", preview.scenarioVersion === "v1.0.0" && preview.rubricVersion === "v1.0.0");
}

/* EMP-04 --------------------------------------------------------------------------- */

section("EMP-04: customization bounded; substantive edits need revalidation");

{
  const cosmetic = classifyCustomization({
    field: "companyContext",
    previous: "We are a payments company.",
    proposed: "We are a payments company based in Austin.",
  });
  ok("cosmetic edit is contextual", cosmetic.kind === "contextual");
  ok("cosmetic edit not blocked from release", cosmetic.blockedFromReleaseUntilRevalidated === false);

  const substantive = classifyCustomization({
    field: "candidateInstructions",
    previous: "Fix the defect.",
    proposed: "Fix the defect. Deliverable: add a regression test. Success criteria: the retry backoff must be covered by public tests.",
  });
  ok("substantive edit detected", substantive.kind === "substantive");
  ok("substantive edit blocked until revalidated", substantive.blockedFromReleaseUntilRevalidated === true);
  ok("block reason is explicit", substantive.reasons.length > 0);

  const oversized = classifyCustomization({
    field: "logistics",
    previous: "Remote.",
    proposed: "x".repeat(5000),
  });
  ok("oversized edit exceeds safe limits", oversized.withinLimits === false);
}

/* Summary ------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All employer role/preview/customization checks passed.");
