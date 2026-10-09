/**
 * Runs every simulation template through the real authoring checks and
 * records the outcome, keyed by package hash, in
 * src/lib/eng/exemplars/validation.generated.json. The creator offers a
 * template only while its current hash matches a passing record made on the
 * isolated sandbox.
 *
 * The checks prove, per package: the environment sets up and the public tests
 * load; the starter fails the requirement tests; the reference passes every
 * test, twice with identical results; at least two distinct wrong solutions
 * are caught; and no reference line, protected test, rubric note or
 * wrong-solution description appears in the candidate payload, a teammate's
 * context or the coding assistant's context.
 *
 * Run (sandbox, the default; needs FYDELL_EXECUTION_SNAPSHOT_ID and a fresh
 * VERCEL_OIDC_TOKEN in the process environment):
 *   npx tsx --conditions react-server scripts/validate-exemplars.ts [key ...]
 * Add --runner local to use the local development runner (recorded as not
 * isolated, so the template stays unavailable), or --check to fail without
 * writing when any record is stale, failing or not isolated.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validatePackage, type CheckResult } from "../src/lib/eng/authoring/checks";
import { localRunner, sandboxRunner, type Runner } from "../src/lib/eng/authoring/runner";
import { EXEMPLARS, buildExemplar, type ValidationRecord } from "../src/lib/eng/exemplars/registry";
import { isTrackId, taskFamilyOf } from "../src/lib/eng/tracks";

const FILE = join(process.cwd(), "src/lib/eng/exemplars/validation.generated.json");

function tokenFresh(): boolean {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 10 * 60_000;
  } catch {
    return false;
  }
}

function pickRunner(kind: string): Runner {
  if (kind === "local") return localRunner();
  const snapshotId = process.env.FYDELL_EXECUTION_SNAPSHOT_ID?.trim();
  if (!snapshotId) throw new Error("FYDELL_EXECUTION_SNAPSHOT_ID is not set, so the isolated sandbox cannot run. Use --runner local for a non-isolated development run.");
  if (!tokenFresh() && !process.env.VERCEL_TOKEN) throw new Error("No fresh Vercel credentials in the process environment (VERCEL_OIDC_TOKEN). Pull one with `vercel env pull` into a temporary file and pass it as an environment variable.");
  return sandboxRunner(snapshotId);
}

function summarize(checks: CheckResult[], incorrectTotal: number): ValidationRecord["summary"] {
  const byId = new Map(checks.map((c) => [c.id, c]));
  const baseline = byId.get("baseline")?.evidence[0];
  const reference = byId.get("reference")?.evidence[0];
  const incorrect = byId.get("incorrect")?.evidence ?? [];
  const broken = (t: { outcome: string }) => t.outcome === "failed" || t.outcome === "error";
  return {
    starter: { failing: baseline?.tests.filter(broken).length ?? 0, total: baseline?.tests.length ?? 0 },
    reference: { passed: reference?.tests.filter((t) => t.outcome === "passed").length ?? 0, total: reference?.tests.length ?? 0 },
    incorrect: { caught: incorrect.filter((e) => e.outcome === "timeout" || e.tests.some(broken)).length, total: incorrectTotal },
    leakage: byId.get("leakage")?.status === "passed" ? "passed" : "failed",
    leakageDetail: byId.get("leakage")?.detail ?? "",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const runnerArg = args[args.indexOf("--runner") + 1];
  const runnerKind = args.includes("--runner") && runnerArg ? runnerArg : "sandbox";
  const only = new Set(args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--runner"));
  const existing = (JSON.parse(readFileSync(FILE, "utf8")) as { records: ValidationRecord[] }).records;
  const records = new Map(existing.map((r) => [r.key, r]));
  let failed = 0;
  const runner = checkOnly ? null : pickRunner(runnerKind);
  if (runner) console.log(`runner: ${runner.info.label} (${runner.info.version})`);

  const keys = new Set<string>();
  for (const ex of EXEMPLARS) {
    if (keys.has(ex.key)) throw new Error(`duplicate exemplar key ${ex.key}`);
    keys.add(ex.key);
    if (!isTrackId(ex.track) || !taskFamilyOf(ex.track, ex.taskFamily)) throw new Error(`${ex.key}: ${ex.track}/${ex.taskFamily} is not a task family in tracks.ts`);
    const built = buildExemplar(ex.key)!;

    if (checkOnly || !runner) {
      const rec = records.get(ex.key);
      const ok = rec?.sha256 === built.sha && rec.status === "passed" && rec.isolated === true;
      const why = !rec ? "never validated" : rec.sha256 !== built.sha ? "changed since validation" : rec.status !== "passed" ? "last run failed" : "validated only on the local runner";
      console.log(`${ok ? "ok  " : "FAIL"} ${ex.key} ${ok ? "validated on the isolated sandbox" : why}`);
      if (!ok) failed++;
      continue;
    }
    if (only.size && !only.has(ex.key)) continue;

    const started = Date.now();
    const record = await validatePackage(built.pkg, built.prot, runner, null);
    const passed = record.status === "passed" && record.checks.every((c) => c.status === "passed");
    const summary = summarize(record.checks, built.prot.incorrectSolutions.length);
    console.log(
      `\n${passed ? "ok  " : "FAIL"} ${ex.key} (${((Date.now() - started) / 1000).toFixed(1)} s, ${record.runner?.label ?? "no runner"}) ` +
        `starter fails ${summary.starter.failing}/${summary.starter.total}, reference passes ${summary.reference.passed}/${summary.reference.total}, ` +
        `wrong solutions caught ${summary.incorrect.caught}/${summary.incorrect.total}, leakage ${summary.leakage}`,
    );
    for (const c of record.checks) if (c.status !== "passed") console.log(`     ${c.status.padEnd(7)} ${c.id.padEnd(22)} ${c.detail}`);
    if (!passed) failed++;
    records.set(ex.key, {
      key: ex.key,
      version: ex.version,
      sha256: built.sha,
      status: passed ? "passed" : "failed",
      checkedAt: new Date().toISOString(),
      runner: record.runner?.label ?? "none",
      runnerVersion: record.runner?.version ?? "none",
      isolated: record.runner?.isolated ?? false,
      summary,
      checks: record.checks.map((c) => ({ id: c.id, status: c.status })),
    });
  }

  if (!checkOnly && runner) {
    const out = [...records.values()].filter((r) => keys.has(r.key)).sort((a, b) => a.key.localeCompare(b.key));
    writeFileSync(FILE, `${JSON.stringify({ records: out }, null, 2)}\n`);
    console.log(`\nrecorded ${out.length} exemplar validation record(s)`);
  }
  if (failed) {
    console.error(`${failed} exemplar(s) not validated`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
