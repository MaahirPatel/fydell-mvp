/**
 * AUTH-04: workspace role capabilities, and that the mutating hiring routes
 * actually check them (source scan: a route that forgets the check fails).
 * Run: npx tsx scripts/test-org-capabilities.ts
 */
import { readFileSync } from "node:fs";
import { ORG_ROLES, capabilityDeniedMessage, orgCan, type OrgCapability } from "../src/lib/orgs/capabilities";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failures++;
}

const expected: Record<string, OrgCapability[]> = {
  owner: ["manage_candidates", "record_decisions", "view_hiring_work", "manage_billing", "manage_members"],
  admin: ["manage_candidates", "record_decisions", "view_hiring_work", "manage_billing", "manage_members"],
  hiring_manager: ["manage_candidates", "record_decisions", "view_hiring_work"],
  reviewer: ["record_decisions", "view_hiring_work"],
  viewer: ["view_hiring_work"],
};
const all: OrgCapability[] = ["manage_candidates", "record_decisions", "view_hiring_work", "manage_billing", "manage_members"];
for (const role of ORG_ROLES) {
  for (const cap of all) {
    check(`${role} ${expected[role].includes(cap) ? "can" : "cannot"} ${cap}`, orgCan(role, cap) === expected[role].includes(cap));
  }
}
check("unknown roles get nothing", all.every((c) => !orgCan("billing", c) && !orgCan("", c) && !orgCan(null, c)));
check("denial messages name who can act", /owner|admin/.test(capabilityDeniedMessage("manage_billing")));

// Every mutating hiring route checks a capability.
const gated: Array<[string, OrgCapability]> = [
  ["src/app/api/sim/invitations/route.ts", "manage_candidates"],
  ["src/app/api/sim/invitations/manage/[id]/route.ts", "manage_candidates"],
  ["src/app/api/pilot/cohort/route.ts", "manage_candidates"],
  ["src/app/api/proof/invitations/route.ts", "manage_candidates"],
  ["src/app/api/sim/sessions/[id]/decision/route.ts", "record_decisions"],
];
for (const [file, cap] of gated) {
  const src = readFileSync(file, "utf8");
  check(`${file} checks ${cap}`, src.includes(`orgCan(`) && src.includes(`"${cap}"`));
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll capability checks passed.");
if (failures) process.exit(1);
