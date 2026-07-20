/**
 * In-browser Pyodide-backed execution (worker-friendly API surface).
 * Loads scenario files into a virtual FS; runs allowlisted Python only.
 *
 * Honest limitation: this is a Python workflow + deterministic JSON preview,
 * not a full deployed FastAPI server. Do not fake a live HTTP backend.
 */

import type {
  CommandResult,
  ExecutionProvider,
  FileMap,
  Snapshot,
} from "./execution-provider";
import { parseAllowlistedCommand } from "./execution-provider";

type PyodideLike = {
  FS: {
    writeFile: (path: string, data: string) => void;
    readFile: (path: string, opts: { encoding: string }) => string;
    mkdirTree: (path: string) => void;
    readdir: (path: string) => string[];
    isDir: (mode: number) => boolean;
    stat: (path: string) => { mode: number };
    analyzePath: (path: string) => { exists: boolean };
  };
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideLike>;
  }
}

export class PyodideExecutionProvider implements ExecutionProvider {
  private py: PyodideLike | null = null;
  private files: FileMap = {};
  private root = "/relay";

  async initializeSession(seedFiles: FileMap): Promise<void> {
    this.files = { ...seedFiles };
    if (!this.py) {
      await this.ensurePyodide();
    }
    this.py!.FS.mkdirTree(this.root);
    for (const [path, content] of Object.entries(this.files)) {
      const full = `${this.root}/${path}`;
      const dir = full.split("/").slice(0, -1).join("/");
      this.py!.FS.mkdirTree(dir);
      this.py!.FS.writeFile(full, content);
    }
    await this.py!.runPythonAsync(`
import sys
sys.path.insert(0, "${this.root}/src")
`);
  }

  private async ensurePyodide() {
    if (typeof window === "undefined") {
      throw new Error("PyodideExecutionProvider requires a browser environment");
    }
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(s);
      });
    }
    this.py = await window.loadPyodide!({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
    });
  }

  async listFiles(): Promise<string[]> {
    return Object.keys(this.files).sort();
  }

  async readFile(path: string): Promise<string> {
    return this.files[path] ?? "";
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files[path] = content;
    if (this.py) {
      const full = `${this.root}/${path}`;
      const dir = full.split("/").slice(0, -1).join("/");
      this.py.FS.mkdirTree(dir);
      this.py.FS.writeFile(full, content);
    }
  }

  async runCommand(command: string): Promise<CommandResult> {
    const allowed = parseAllowlistedCommand(command);
    if (!allowed) {
      return {
        ok: false,
        stdout: "",
        stderr: "Command not allowed. Supported: test | pytest | evals | preview | reconcile | help",
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
    if (allowed === "preview") return this.preview();
    if (allowed === "evals") return this.runEvaluations();
    if (allowed === "reconcile") return this.runReconcile();
    return this.runTests();
  }

  /**
   * Modules imported from the scenario's virtual FS get cached in sys.modules
   * for the life of this Pyodide worker. Without clearing them first, a
   * candidate's edit to e.g. report.py would silently keep running the
   * pre-edit version on every subsequent command — drop the cache so every
   * command run reflects the current file contents.
   */
  private static readonly SCENARIO_MODULES = [
    "run_evals",
    "report",
    "metrics",
    "reconcile",
    "join",
    "load",
  ];

  private async runPythonCapture(code: string, command: string): Promise<CommandResult> {
    if (!this.py) throw new Error("Session not initialized");
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    this.py.setStdout({ batched: (s) => (stdout += s + "\n") });
    this.py.setStderr({ batched: (s) => (stderr += s + "\n") });
    const evictModules = PyodideExecutionProvider.SCENARIO_MODULES.map((m) => `"${m}"`).join(", ");
    const preamble = `
import sys
for _m in (${evictModules}):
    sys.modules.pop(_m, None)
`;
    try {
      await this.py.runPythonAsync(preamble + code);
      return {
        ok: true,
        stdout,
        stderr,
        exitCode: 0,
        durationMs: Date.now() - started,
        command,
      };
    } catch (err) {
      return {
        ok: false,
        stdout,
        stderr: stderr + (err instanceof Error ? err.message : String(err)),
        exitCode: 1,
        durationMs: Date.now() - started,
        command,
      };
    }
  }

  async runTests(): Promise<CommandResult> {
    return this.runPythonCapture(
      `
import sys
sys.path.insert(0, "${this.root}/src")
from load import load_delay_tracking, load_shipments
from join import naive_join
from reconcile import reconciled_join

shipments = load_shipments()
delay_rows = load_delay_tracking()
_, naive_dropped = naive_join(shipments, delay_rows)
assert len(naive_dropped) > 0, "naive_join should drop mismatched-id rows"
_, reconciled_unmatched = reconciled_join(shipments, delay_rows)
assert len(reconciled_unmatched) == 0, "reconciled_join should recover all rows"
print("PYODIDE_TESTS_PASSED")
`,
      "test"
    );
  }

  async runEvaluations(): Promise<CommandResult> {
    // Runs the actual scenario evals/run_evals.py from the virtual FS — the
    // same script `python evals/run_evals.py` would run outside the browser —
    // rather than a separate reimplementation, so results (including the
    // EVAL_SUMMARY_JSON line the workspace UI parses) always match the source
    // of truth in scenarios/project-relay/evals/.
    return this.runPythonCapture(
      `
import sys
sys.path.insert(0, "${this.root}/src")
sys.path.insert(0, "${this.root}/evals")
import run_evals
exit_code = run_evals.main()
if exit_code:
    raise SystemExit(exit_code)
`,
      "evals"
    );
  }

  /**
   * Runs the same naive-vs-reconciled join comparison as
   * `reconcile.main()` (see `scenarios/project-relay/src/reconcile.py`) so a
   * candidate can see, from the workspace terminal, exactly which
   * delay-tracking rows the naive join drops and why. Real code, real data —
   * no mock ledger.
   */
  private async runReconcile(): Promise<CommandResult> {
    return this.runPythonCapture(
      `
import sys
sys.path.insert(0, "${this.root}/src")
import reconcile
reconcile.main()
`,
      "reconcile"
    );
  }

  private async preview(): Promise<CommandResult> {
    return this.runPythonCapture(
      `
import sys
sys.path.insert(0, "${this.root}/src")
from load import load_carriers, load_delay_tracking, load_shipments
from report import build_report

shipments = load_shipments()
carriers = load_carriers()
delay_rows = load_delay_tracking()
report = build_report(shipments, carriers, delay_rows)
import json
print(json.dumps(report, indent=2))
`,
      "preview"
    );
  }

  async snapshot(label: string): Promise<Snapshot> {
    return {
      files: { ...this.files },
      createdAt: new Date().toISOString(),
      label,
    };
  }

  async restore(snapshot: Snapshot): Promise<void> {
    await this.initializeSession(snapshot.files);
  }

  async terminate(): Promise<void> {
    this.py = null;
  }
}
