import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_ITEMS,
  WORKSPACE_SETTINGS_ITEM,
  groupContainsPath,
  workspaceSection,
} from "../src/lib/workspace/navigation";

let failures = 0;

function ok(name: string, condition: boolean) {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}`);
    failures += 1;
  }
}

const labels = WORKSPACE_NAV_ITEMS.map((item) => item.label);
const expected = [
  "Overview",
  "Roles",
  "Assessments",
  "Candidates",
  "Reviews",
  "Work samples",
  "Team",
  "Task library",
  "Work",
  "Evidence",
  "Work Receipts",
  "Outcomes",
  "Settings",
];

const routes = [
  "/app/employer",
  "/app/employer/passports",
  "/app/employer/openings",
  "/app/employer/candidates",
  "/app/employer/engineering",
  "/app/employer/work-samples",
  "/app/employer/roles",
  "/app/employer/work",
  "/app/employer/evidence",
  "/app/employer/receipts",
  "/app/employer/outcomes",
  "/app/employer/team",
  "/app/employer/settings",
];

const visibleByDefault = WORKSPACE_NAV_GROUPS.filter((group) => group.kind !== "collapsible").flatMap(
  (group) => group.items,
);
const more = WORKSPACE_NAV_GROUPS.find((group) => group.kind === "collapsible");

console.log("\nWorkspace navigation");
ok("canonical hierarchy is exact", labels.join(",") === expected.join(","));
ok(
  "every existing employer route is still a destination",
  routes.every((href) => WORKSPACE_NAV_ITEMS.some((item) => item.href === href)),
);
ok("labels and routes are unique", new Set(labels).size === labels.length && new Set(WORKSPACE_NAV_ITEMS.map((i) => i.href)).size === labels.length);
ok(
  "implementation mechanisms are not global destinations",
  !labels.some((label) => ["Simulations", "Reports", "Shortlist", "Evaluations", "Messages"].includes(label)),
);
ok("settings is the final persistent item", labels.at(-1) === WORKSPACE_SETTINGS_ITEM.label);
ok(
  "groups run primary, then a collapsible More",
  WORKSPACE_NAV_GROUPS.map((group) => (group.kind === "primary" ? "primary" : `${group.kind}:${group.label}`)).join(",") ===
    "primary,collapsible:More",
);
ok(
  "the hiring destinations are visible before More",
  visibleByDefault.map((item) => item.label).join(",") === "Overview,Roles,Assessments,Candidates,Reviews,Work samples,Team",
);
ok(
  "More holds the lower-traffic records",
  more?.items.map((item) => item.label).join(",") === "Task library,Work,Evidence,Work Receipts,Outcomes",
);
ok(
  "More opens itself on its own pages and not elsewhere",
  more !== undefined &&
    groupContainsPath(more, "/app/employer/receipts/abc") &&
    !groupContainsPath(more, "/app/employer/candidates"),
);
ok(
  "Roles opens the employer's role pages, not the task library",
  WORKSPACE_NAV_ITEMS.find((item) => item.label === "Roles")?.href === "/app/employer/openings",
);
ok(
  "breadcrumb section resolves nested pages and keeps Overview exact",
  workspaceSection("/app/employer/openings/123").label === "Roles" &&
    workspaceSection("/app/employer").label === "Overview" &&
    workspaceSection("/app/employer/team").label === "Team",
);

if (failures) process.exit(1);
console.log("\nworkspace navigation contract passed");
