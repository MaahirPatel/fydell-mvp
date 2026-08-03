import { SIMULATION_BY_SLUG } from "../src/lib/simulations/content";
import { microToV2, validateV2, toV2CandidateView } from "../src/lib/simulations/v2";

const slugs = [
  "missing-delays",
  "one-renewal-rate",
  "promise-or-product-fit",
  "launch-day-import",
  "green-status-page",
  "executive-queue",
];

let failed = 0;
for (const s of slugs) {
  const m = SIMULATION_BY_SLUG[s];
  if (!m) {
    console.error("MISSING", s);
    failed++;
    continue;
  }
  const d = microToV2(m);
  const e = validateV2(d);
  const v = toV2CandidateView(d);
  const leak = /"answer"\s*:|"concepts"\s*:/.test(JSON.stringify(v));
  const kinds = [...new Set(v.modules.map((x) => x.kind))].join(",");
  if (e.length || leak) {
    console.error("FAIL", s, e.join(";"), leak ? "LEAK" : "");
    failed++;
  } else {
    console.log("ok", s, kinds);
  }
}
if (failed) process.exit(1);
console.log("FLAGSHIPS_OK");
