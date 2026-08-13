/**
 * Open-redirect protection tests for the single `?next=` validator.
 * Run via `npm run test:unit`.
 */
import {
  safeNext,
  safeNextOr,
  isCandidateDestination,
  isEmployerDestination,
  withNext,
  DEFAULT_APP_DESTINATION,
} from "../src/lib/auth/safe-next";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`,
  );
}

console.log("\nrejects external and malformed destinations");

const MUST_REJECT = [
  "https://evil.com",
  "http://evil.com",
  "//evil.com",
  "///evil.com",
  "/\\evil.com",
  "\\\\evil.com",
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "//evil.com/app/employer",
  "/%2f%2fevil.com",
  "/%2F/evil.com",
  "%2f%2fevil.com",
  "%252f%252fevil.com",
  "/app/employer\\@evil.com",
  "/\tapp/employer",
  "/\napp/employer",
  "app/employer",
  "",
  "/admin/overview",
  "/login",
  "/signup",
  "/some/unknown/path",
  "/appfoo/bar",
];

for (const value of MUST_REJECT) {
  check(`rejects ${JSON.stringify(value)}`, safeNext(value), null);
}

check("rejects null", safeNext(null), null);
check("rejects undefined", safeNext(undefined), null);

console.log("\naccepts internal application destinations");

const MUST_ACCEPT = [
  "/app",
  "/app/employer",
  "/app/employer/candidates",
  "/app/candidate",
  "/app/simulations/new",
  "/invite/abc123",
  "/sim/session-1",
  "/sim/session-1/result",
  "/simulations",
  "/simulations/start/ops-yield-investigation",
  "/onboarding/employer",
  "/record/tok",
  "/results/tok",
  "/account/setup-required",
  "/app/employer/reports?review=needs",
];

for (const value of MUST_ACCEPT) {
  check(`accepts ${JSON.stringify(value)}`, safeNext(value), value);
}

console.log("\nencoded but safe values decode to the same path");
check(
  "percent-encoded employer path",
  safeNext("%2Fapp%2Femployer"),
  null, // does not start with "/" before decoding, so it is rejected
);
check(
  "query string preserved",
  safeNext("/app/employer/reports?review=needs"),
  "/app/employer/reports?review=needs",
);

console.log("\nfallback behaviour");
check("falls back on reject", safeNextOr("https://evil.com"), DEFAULT_APP_DESTINATION);
check("falls back to custom", safeNextOr(null, "/app/candidate"), "/app/candidate");
check("passes through on accept", safeNextOr("/app/employer/reports"), "/app/employer/reports");

console.log("\ndestination classification");
check("invite is candidate", isCandidateDestination("/invite/abc"), true);
check("sim is candidate", isCandidateDestination("/sim/1"), true);
check("candidate home is candidate", isCandidateDestination("/app/candidate"), true);
check("employer is not candidate", isCandidateDestination("/app/employer"), false);
check("employer is employer", isEmployerDestination("/app/employer/reports"), true);
check("builder is employer", isEmployerDestination("/app/simulations/new"), true);
check("invite is not employer", isEmployerDestination("/invite/abc"), false);
check("external is neither", isCandidateDestination("https://evil.com"), false);

console.log("\nnext threading");
check("appends safe next", withNext("/login", "/invite/abc"), "/login?next=%2Finvite%2Fabc");
check("drops unsafe next", withNext("/login", "https://evil.com"), "/login");
check("drops null next", withNext("/login", null), "/login");
check(
  "respects existing query",
  withNext("/login?reset=1", "/app/employer"),
  "/login?reset=1&next=%2Fapp%2Femployer",
);

if (failures > 0) {
  console.error(`\n${failures} safe-next check(s) failed.`);
  process.exit(1);
}

console.log("\nAll safe-next checks passed.");
