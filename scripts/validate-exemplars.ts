/**
 * Runs every role-model scenario through the real authoring checks on the
 * local runner and records the outcome, keyed by package hash, in
 * src/lib/eng/exemplars/validation.generated.json. The creator offers an
 * exemplar only while its current hash matches a passing record here.
 *
 * Run: npx tsx --conditions react-server scripts/validate-exemplars.ts [key ...]
 *      add --check to fail (without writing) when any record is stale or failing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { EXEMPLARS, buildExemplar } from "../src/lib/eng/exemplars/registry";
import { isTrackId, taskFamilyOf } from "../src/lib/eng/tracks";

type ValidationRecord = { key: string; version: string; sha256: string; status: "passed" | "failed"; checkedAt: string; runner: string; checks: Array<{ id: string; status: string }> };

const FILE = join(process.cwd(), "src/lib/eng/exemplars/validation.generated.json");

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  const existing = (JSON.parse(readFileSync(FILE, "utf8")) as { records: ValidationRecord[] }).records;
  const records = new Map(existing.map((r) => [r.key, r]));
  let failed = 0;

  const keys = new Set<string>();
  for (const ex of EXEMPLARS) {
    if (keys.has(ex.key)) throw new Error(`duplicate exemplar key ${ex.key}`);
    keys.add(ex.key);
    if (!isTrackId(ex.track) || !taskFamilyOf(ex.track, ex.taskFamily)) throw new Error(`${ex.key}: ${ex.track}/${ex.taskFamily} is not a task family in tracks.ts`);
    const built = buildExemplar(ex.key)!;

    if (checkOnly) {
      const rec = records.get(ex.key);
      const ok = rec?.sha256 === built.sha && rec.status === "passed";
      console.log(`${ok ? "ok  " : "FAIL"} ${ex.key} ${ok ? "validated" : rec ? (rec.sha256 !== built.sha ? "changed since validation" : "last run failed") : "never validated"}`);
      if (!ok) failed++;
      continue;
    }
    if (only.size && !only.has(ex.key)) continue;

    const started = Date.now();
    const record = await validatePackage(built.pkg, built.prot, localRunner(), null);
    const passed = record.status === "passed" && record.checks.every((c) => c.status === "passed");
    console.log(`\n${passed ? "ok  " : "FAIL"} ${ex.key} (${((Date.now() - started) / 1000).toFixed(1)} s, ${record.runner?.label ?? "no runner"})`);
    for (const c of record.checks) if (c.status !== "passed" || !passed) console.log(`     ${c.status.padEnd(7)} ${c.id.padEnd(22)} ${c.detail}`);
    if (!passed) failed++;
    records.set(ex.key, {
      key: ex.key,
      version: ex.version,
      sha256: built.sha,
      status: passed ? "passed" : "failed",
      checkedAt: new Date().toISOString(),
      runner: record.runner?.label ?? "none",
      checks: record.checks.map((c) => ({ id: c.id, status: c.status })),
    });
  }

  if (!checkOnly) {
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
  console.error(error);
  process.exit(1);
});
