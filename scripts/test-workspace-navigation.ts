import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_ITEMS,
  WORKSPACE_SETTINGS_ITEM,
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
  "Home",
  "Roles",
  "Reviews",
  "Engineering tasks",
  "Task library",
  "Candidates",
  "Work",
  "Evidence",
  "Work Receipts",
  "Outcomes",
  "Team",
  "Settings",
];

console.log("\nWorkspace navigation");
ok("canonical hierarchy is exact", labels.join(",") === expected.join(","));
ok(
  "implementation mechanisms are not global destinations",
  !labels.some((label) => ["Simulations", "Reports", "Shortlist", "Evaluations"].includes(label)),
);
ok("settings is the final persistent item", labels.at(-1) === WORKSPACE_SETTINGS_ITEM.label);
ok(
  "section labels are Hiring, Work samples and Proof",
  WORKSPACE_NAV_GROUPS.filter((group) => group.label).map((group) => group.label).join(",") ===
    "Hiring,Work samples,Proof",
);
ok(
  "Roles opens the employer's role pages, not the task library",
  WORKSPACE_NAV_ITEMS.find((item) => item.label === "Roles")?.href === "/app/employer/openings",
);

if (failures) process.exit(1);
console.log("\nworkspace navigation contract passed");
