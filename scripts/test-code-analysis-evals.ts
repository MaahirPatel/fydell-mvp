/**
 * Eval for the deterministic code-analysis prototype.
 *
 * Runs the analyzer over (a) a synthetic buggy fixture with planted defects,
 * (b) a synthetic clean fixture with fixed counterparts, and (c) the real
 * Northbeam scenario sources. Scores precision/recall over bug+security
 * findings only — risks and notes are reported but not scored, since they are
 * explicitly uncertain by design.
 *
 * Run: npx tsx scripts/test-code-analysis-evals.ts
 */
import { readFile } from "fs/promises";
import { join } from "path";
import { analyzeSource } from "../src/lib/code-analysis/analyzer";
import type { AnalysisReport } from "../src/lib/code-analysis/types";

const BUGGY_FIXTURE = `"""Synthetic fixture: planted defects for analyzer evaluation."""
import subprocess

API_KEY = "sk-live-9f8e7d6c5b4a0123456789abcdef"


def naive_merge(users, events):
    """Exact-match partition of events into matched/dropped."""
    known = {u["id"] for u in users}
    matched = [e for e in events if e["user_id"] in known]
    dropped = [e for e in events if e["user_id"] not in known]
    return matched, dropped


def normalize_id(value):
    return str(value).strip().lower()


def robust_merge(users, events):
    """Normalized merge - the correct implementation."""
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    return matched, []


def summarize(users, events, merge_fn=naive_merge):
    matched, dropped = merge_fn(users, events)
    return {"matched": len(matched), "dropped": len(dropped)}


def get_config(key, cache={}):
    return cache.get(key)


def load_state(path):
    try:
        with open(path) as fh:
            return fh.read()
    except:
        pass


def run_plugin(code):
    return eval(code)


def backup(dest):
    subprocess.run("tar czf " + dest + " data/", shell=True)


def complex_report(rows, strict=True):
    total = 0
    for r in rows:
        if r["kind"] == "a" and strict or r["flag"]:
            if r["x"] > 1:
                if r["y"] > 2:
                    if r["z"] > 3 or r["w"] < 0:
                        total += 1
                    elif r["w"]:
                        total -= 1
                elif r["q"]:
                    total += 2
                else:
                    total += 3
            elif r["m"]:
                total += 4
            else:
                total += 5
        elif r["kind"] == "b":
            total += 6
        elif r["kind"] == "c" and r["n"]:
            total += 7
        else:
            total += 8
    return total
`;

const CLEAN_FIXTURE = `"""Synthetic fixture: fixed counterparts - expect zero bug/security findings."""


def normalize_id(value):
    return str(value).strip().lower()


def merge(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched


def summarize(users, events, merge_fn=merge):
    matched, unmatched = merge_fn(users, events)
    if unmatched:
        raise ValueError(f"{len(unmatched)} events could not be matched")
    return {"matched": len(matched)}
`;

interface Expectation {
  code: string;
  file: string; // basename suffix match
  severity: "bug" | "security";
}

interface Fixture {
  name: string;
  files: { path: string; content: string }[];
  expected: Expectation[];
}

async function northbeamFixture(): Promise<Fixture> {
  const root = join(process.cwd(), "scenarios", "project-relay");
  const rels = [
    "src/join.py",
    "src/report.py",
    "src/reconcile.py",
    "src/metrics.py",
    "src/load.py",
    "tests/test_reconcile.py",
  ];
  const files = await Promise.all(
    rels.map(async (rel) => ({
      path: `northbeam/${rel}`,
      content: await readFile(join(root, rel), "utf8"),
    })),
  );
  return {
    name: "northbeam (real scenario)",
    files,
    expected: [
      { code: "SILENT_DROP", file: "northbeam/src/join.py", severity: "bug" },
      { code: "FRAGILE_ID_JOIN", file: "northbeam/src/join.py", severity: "bug" },
      { code: "LOSSY_DEFAULT_WIRING", file: "northbeam/src/report.py", severity: "bug" },
    ],
  };
}

const FIXTURES: Fixture[] = [
  {
    name: "buggy fixture (planted defects)",
    files: [{ path: "buggy.py", content: BUGGY_FIXTURE }],
    expected: [
      { code: "SILENT_DROP", file: "buggy.py", severity: "bug" },
      { code: "FRAGILE_ID_JOIN", file: "buggy.py", severity: "bug" },
      { code: "LOSSY_DEFAULT_WIRING", file: "buggy.py", severity: "bug" },
      { code: "MUTABLE_DEFAULT_ARG", file: "buggy.py", severity: "bug" },
      { code: "DANGEROUS_EVAL_EXEC", file: "buggy.py", severity: "security" },
      { code: "SUBPROCESS_SHELL", file: "buggy.py", severity: "security" },
      { code: "POSSIBLE_SECRET", file: "buggy.py", severity: "security" },
    ],
  },
  {
    name: "clean fixture (fixed counterparts)",
    files: [{ path: "clean.py", content: CLEAN_FIXTURE }],
    expected: [],
  },
];

async function main(): Promise<void> {
  FIXTURES.push(await northbeamFixture());
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;
  let failed = false;

  for (const fixture of FIXTURES) {
    const report: AnalysisReport = await analyzeSource({ files: fixture.files });
    const scored = report.findings.filter(
      (f) => f.severity === "bug" || f.severity === "security",
    );
    const matchedExpected = new Set<number>();
    const fps: string[] = [];
    for (const f of scored) {
      const idx = fixture.expected.findIndex(
        (e, i) =>
          !matchedExpected.has(i) &&
          e.code === f.code &&
          f.file.endsWith(e.file) &&
          e.severity === f.severity,
      );
      if (idx >= 0) matchedExpected.add(idx);
      else fps.push(`${f.code} @ ${f.file}:${f.line} [${f.severity}]`);
    }
    const fns = fixture.expected.filter((_, i) => !matchedExpected.has(i));
    const tp = matchedExpected.size;
    const fp = fps.length;
    const fn = fns.length;
    totalTp += tp;
    totalFp += fp;
    totalFn += fn;
    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

    console.log(`\n=== ${fixture.name} ===`);
    console.log(`expected bug/security: ${fixture.expected.length}, found: ${scored.length}`);
    console.log(`TP=${tp} FP=${fp} FN=${fn}  precision=${precision.toFixed(2)} recall=${recall.toFixed(2)}`);
    for (const m of fns) console.log(`  MISS: ${m.code} @ ${m.file} [${m.severity}]`);
    for (const m of fps) console.log(`  FALSE POSITIVE: ${m}`);
    const risks = report.findings.filter((f) => f.severity === "risk").length;
    const notes = report.findings.filter((f) => f.severity === "note").length;
    console.log(`  (risks: ${risks}, notes: ${notes} — reported, not scored)`);
    if (report.errors.length > 0) {
      console.log(`  ERRORS: ${JSON.stringify(report.errors)}`);
      failed = true;
    }
    if (fp > 0 || fn > 0) failed = true;
  }

  const p = totalTp + totalFp === 0 ? 1 : totalTp / (totalTp + totalFp);
  const r = totalTp + totalFn === 0 ? 1 : totalTp / (totalTp + totalFn);
  console.log(`\n=== OVERALL (bug+security) ===`);
  console.log(`TP=${totalTp} FP=${totalFp} FN=${totalFn}  precision=${p.toFixed(2)} recall=${r.toFixed(2)}`);
  if (failed) {
    console.log("EVAL FAILED");
    process.exit(1);
  }
  console.log("EVAL PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
