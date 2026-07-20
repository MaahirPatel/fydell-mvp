import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, relative } from "path";
import { spawnSync } from "child_process";
import type {
  CommandResult,
  ExecutionProvider,
  FileMap,
  Snapshot,
} from "./execution-provider";
import { parseAllowlistedCommand } from "./execution-provider";

/**
 * Node-side provider for CI / spike acceptance only (RELAY_EXECUTION=node_test).
 * Production browser sessions use the Pyodide worker provider — never raw host shell
 * for arbitrary candidate code.
 */
export class NodeTestExecutionProvider implements ExecutionProvider {
  private root: string;
  private workDir: string;

  constructor(scenarioRoot: string, workDir: string) {
    this.root = scenarioRoot;
    this.workDir = workDir;
  }

  async initializeSession(seedFiles: FileMap): Promise<void> {
    mkdirSync(this.workDir, { recursive: true });
    for (const [path, content] of Object.entries(seedFiles)) {
      const full = join(this.workDir, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content, "utf8");
    }
  }

  async listFiles(): Promise<string[]> {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else out.push(relative(this.workDir, full).replace(/\\/g, "/"));
      }
    };
    if (existsSync(this.workDir)) walk(this.workDir);
    return out.sort();
  }

  async readFile(path: string): Promise<string> {
    return readFileSync(join(this.workDir, path), "utf8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    const full = join(this.workDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  }

  private runPython(args: string[]): CommandResult {
    const started = Date.now();
    const command = `python ${args.join(" ")}`;
    const result = spawnSync("python", args, {
      cwd: this.workDir,
      encoding: "utf8",
      env: { ...process.env, PYTHONPATH: join(this.workDir, "src") },
      timeout: 60_000,
    });
    return {
      ok: (result.status ?? 1) === 0,
      stdout: result.stdout || "",
      stderr: result.stderr || result.error?.message || "",
      exitCode: result.status ?? 1,
      durationMs: Date.now() - started,
      command,
    };
  }

  async runCommand(command: string): Promise<CommandResult> {
    const allowed = parseAllowlistedCommand(command);
    if (!allowed) {
      return {
        ok: false,
        stdout: "",
        stderr: `Command not allowed. Supported: test | pytest | evals | preview | reconcile | help`,
        exitCode: 127,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "help") {
      return {
        ok: true,
        stdout: "Allowed: test, pytest, evals, preview, reconcile, help\n",
        stderr: "",
        exitCode: 0,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "preview") {
      return this.preview();
    }
    if (allowed === "evals") return this.runEvaluations();
    if (allowed === "reconcile") return this.runReconcile();
    return this.runTests();
  }

  async runTests(): Promise<CommandResult> {
    // Prefer pytest; fall back to running test file assertions via a tiny runner.
    const pytest = this.runPython(["-m", "pytest", "-q", "tests"]);
    if (!pytest.stderr.includes("No module named pytest") && pytest.exitCode !== 127) {
      return pytest;
    }
    return this.runPython(["-c", FALLBACK_TEST_RUNNER]);
  }

  async runEvaluations(): Promise<CommandResult> {
    return this.runPython(["evals/run_evals.py"]);
  }

  async runReconcile(): Promise<CommandResult> {
    return this.runPython(["src/reconcile.py"]);
  }

  private async preview(): Promise<CommandResult> {
    const started = Date.now();
    const script = `
import json, sys
sys.path.insert(0, "src")
from load import load_carriers, load_delay_tracking, load_shipments
from report import build_report

shipments = load_shipments()
carriers = load_carriers()
delay_rows = load_delay_tracking()
report = build_report(shipments, carriers, delay_rows)
print(json.dumps(report, indent=2))
`;
    const result = spawnSync("python", ["-c", script], {
      cwd: this.workDir,
      encoding: "utf8",
      timeout: 30_000,
    });
    return {
      ok: (result.status ?? 1) === 0,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.status ?? 1,
      durationMs: Date.now() - started,
      command: "preview",
    };
  }

  async snapshot(label: string): Promise<Snapshot> {
    const files: FileMap = {};
    for (const path of await this.listFiles()) {
      files[path] = await this.readFile(path);
    }
    return { files, createdAt: new Date().toISOString(), label };
  }

  async restore(snapshot: Snapshot): Promise<void> {
    await this.initializeSession(snapshot.files);
  }

  async terminate(): Promise<void> {
    /* no-op */
  }
}

const FALLBACK_TEST_RUNNER = `
import sys
sys.path.insert(0, "src")
from load import load_delay_tracking, load_shipments
from join import naive_join
from reconcile import reconciled_join

def check(cond, msg):
  if not cond:
    raise AssertionError(msg)

shipments = load_shipments()
delay_rows = load_delay_tracking()
_, naive_dropped = naive_join(shipments, delay_rows)
check(len(naive_dropped) > 0, "naive join should drop mismatched-id rows")
_, reconciled_unmatched = reconciled_join(shipments, delay_rows)
check(len(reconciled_unmatched) == 0, "reconciled join should recover all rows")
print("FALLBACK_TESTS_PASSED")
`;

export function loadScenarioSeedFiles(scenarioRoot: string): FileMap {
  const files: FileMap = {};
  const walk = (dir: string, prefix = "") => {
    for (const name of readdirSync(dir)) {
      if (name === "__pycache__" || name.endsWith(".pyc")) continue;
      const full = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (statSync(full).isDirectory()) walk(full, rel);
      else files[rel.replace(/\\/g, "/")] = readFileSync(full, "utf8");
    }
  };
  walk(scenarioRoot);
  return files;
}
