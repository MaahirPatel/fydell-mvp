/**
 * Local smoke: Missing Delays → V2 workbench → score → no key leak.
 *   npx tsx --conditions react-server scripts/smoke-vertical-slice.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { SIMULATION_BY_SLUG } from "../src/lib/simulations/content";
import { microToV2, toV2CandidateView, scoreV2Attempt, validateV2 } from "../src/lib/simulations/v2";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  loadEnvLocal();
  const micro = SIMULATION_BY_SLUG["missing-delays"];
  assert(micro, "missing-delays content registered");

  const def = microToV2(micro);
  const lint = validateV2(def);
  assert(lint.length === 0, `validateV2 failed: ${lint.join("; ")}`);

  const view = toV2CandidateView(def);
  const leaked = JSON.stringify(view);
  assert(!/"answer"\s*:/.test(leaked), "candidate view leaked answer");
  assert(!/"concepts"\s*:/.test(leaked), "candidate view leaked concepts");
  assert(!/"weight"\s*:/.test(leaked), "candidate view leaked weight");
  assert(view.modules.some((m) => m.kind === "data_workbench"), "data_workbench module missing");

  const decisions: Record<string, string | number | string[]> = {};
  const written: Record<string, string> = {};
  for (const m of def.modules) {
    if (m.kind === "structured_decision" && m.answer) {
      decisions[m.id] = m.decisionKind === "multi_select" ? [...m.answer.map(String)] : m.answer[0];
    }
    if (m.kind === "written_deliverable" && m.concepts) {
      written[m.id] = m.concepts.flatMap((c) => c.keywords).join(" ");
    }
  }

  const score = scoreV2Attempt(def, {
    events: [],
    decisions,
    written,
    evidenceIds: Object.values(decisions)
      .filter(Array.isArray)
      .flat()
      .map(String),
    stakeholderRuleIds: [],
  });

  assert(score.engineVersion === "v2", "engineVersion");
  assert(typeof score.performance === "number", "performance number");
  assert(score.coverage > 0.4, `coverage too low: ${score.coverage}`);
  assert(score.citations.length > 0, "expected citations");
  console.log("content/scoring ok", {
    performance: score.performance,
    coverage: score.coverage,
    confidence: score.confidence,
    band: score.band,
    citations: score.citations.length,
    modules: view.modules.map((m) => m.kind),
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("skip db smoke (no supabase env)");
    return;
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tmpl, error: tErr } = await admin
    .from("sim_templates")
    .select("id, slug, status, current_version_id")
    .eq("slug", "missing-delays")
    .maybeSingle();
  if (tErr) throw tErr;
  assert(tmpl, "missing-delays template in DB");
  assert(tmpl!.status === "published", `template status ${tmpl!.status}`);
  assert(tmpl!.current_version_id, "current_version_id set");

  const { data: ver } = await admin
    .from("sim_template_versions")
    .select("id, version, content")
    .eq("id", tmpl!.current_version_id)
    .maybeSingle();
  assert(ver?.content, "version content present");
  const dbDef = microToV2(ver!.content as typeof micro);
  assert(validateV2(dbDef).length === 0, "DB content validates as v2");

  console.log("db template ok", { templateId: tmpl!.id, versionId: ver!.id });
  console.log("SMOKE_OK");
}

main().catch((err) => {
  console.error("SMOKE_FAIL", err instanceof Error ? err.message : err);
  process.exit(1);
});
