/**
 * Wave 1 contract tests.
 *
 * Agents may not invent local statuses, routes, or analysis fallbacks.
 * These assertions pin the canonical contract the rest of the slice consumes.
 */

import {
  ALL_ACTORS,
  can,
  DA01_ANALYSIS_ENGINE,
  DA01_CONTENT_VERSION,
  DA01_SLUG,
  EMPLOYER_ROUTES,
  invitationTruth,
  mayUseKeywordFallback,
  PUBLIC_ROUTES,
  WAVE1_BREAKPOINTS,
  WAVE1_CONTROL_STATES,
  WAVE1_EVALUATION_SLUG,
  WAVE1_ICON,
  WAVE1_NAV,
  WAVE1_PERMISSIONS,
  WAVE1_PRIMARY_CTA,
  WAVE1_ROUTE_OWNERSHIP,
  WAVE1_TYPE,
  WAVE1_WORKING_ROLE,
} from "../src/lib/contracts";

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

section("Routes are absolute and owned");
ok("public home is /", PUBLIC_ROUTES[0] === "/");
ok(
  "employer assessments is /app/employer/assessments",
  EMPLOYER_ROUTES.includes("/app/employer/assessments"),
);
ok(
  "no relative employer /assessments",
  !EMPLOYER_ROUTES.some((r) => r === "/assessments"),
);
ok("every public route has ownership", PUBLIC_ROUTES.every((r) => r in WAVE1_ROUTE_OWNERSHIP));
ok("every employer route has ownership", EMPLOYER_ROUTES.every((r) => r in WAVE1_ROUTE_OWNERSHIP));
ok("primary CTA is Request a pilot", WAVE1_PRIMARY_CTA.href === "/request-pilot");
ok("nav has no operational buttons", WAVE1_NAV.every((item) => item.href !== "/signup"));

section("DA-01 fixture and analysis pin");
ok("working role is data analyst", WAVE1_WORKING_ROLE === "data_analyst");
ok("slug is ops-yield-investigation", WAVE1_EVALUATION_SLUG === "ops-yield-investigation");
ok("DA-01 slug matches", DA01_SLUG === WAVE1_EVALUATION_SLUG);
ok("engine is v2", DA01_ANALYSIS_ENGINE === "v2");
ok("content version is pinned", DA01_CONTENT_VERSION === "northline-ops-yield@3.0.0");
ok("DA-01 cannot use keyword fallback", mayUseKeywordFallback(DA01_SLUG) === false);
ok("other slugs may still fall back", mayUseKeywordFallback("green-status-page") === true);

section("Invitation truthfulness");
ok(
  "copyable link is not delivered",
  invitationTruth({ status: "sent", emailDelivery: "not_configured" }).label.includes(
    "not configured",
  ) && invitationTruth({ status: "sent", emailDelivery: "not_configured" }).emailed === false,
);
ok(
  "failed email stays copyable",
  invitationTruth({ status: "sent", emailDelivery: "failed" }).copyable === true &&
    invitationTruth({ status: "sent", emailDelivery: "failed" }).emailed === false,
);
ok(
  "sent is emailed, not delivered",
  invitationTruth({ status: "sent", emailDelivery: "sent" }).emailed === true &&
    invitationTruth({ status: "sent", emailDelivery: "sent" }).label === "Email sent",
);
ok(
  "revoked wins over delivery",
  invitationTruth({ status: "revoked", emailDelivery: "sent" }).label === "Invitation revoked",
);
ok(
  "expired wins over delivery",
  invitationTruth({ status: "expired", emailDelivery: "delivered" }).label === "Invitation expired",
);
ok(
  "accepted is not copyable",
  invitationTruth({ status: "accepted", emailDelivery: "sent" }).copyable === false,
);

section("Permissions");
ok("owner can invite", can("owner", "invite_candidate"));
ok("reviewer cannot invite", can("reviewer", "invite_candidate") === false);
ok("viewer can view report", can("viewer", "view_report"));
ok("viewer cannot record decision", can("viewer", "record_decision") === false);
ok("candidate cannot view employer report", can("candidate", "view_report") === false);
ok("candidate can submit", can("candidate", "submit_attempt"));
ok("all five actors exist", ALL_ACTORS.length === 5);
ok("invite is owner/admin only", WAVE1_PERMISSIONS.invite_candidate.join(",") === "owner,admin");

section("Design contract");
ok("display type is Linear-scale", WAVE1_TYPE.display.includes("3.75rem"));
ok("icon stroke is 1.5", WAVE1_ICON.stroke === 1.5);
ok("control states include error and loading", WAVE1_CONTROL_STATES.includes("error") && WAVE1_CONTROL_STATES.includes("loading"));
ok("desktop breakpoint is 1280", WAVE1_BREAKPOINTS.desktop === 1280);
ok("wide breakpoint is 1440", WAVE1_BREAKPOINTS.wide === 1440);

if (failures) {
  console.log(`\n${failures} Wave 1 contract failure(s)`);
  process.exit(1);
}
console.log("\nWave 1 contract passed");
