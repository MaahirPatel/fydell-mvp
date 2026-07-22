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
        s.onerror = () =>
          reject(
            new Error(
              "[infrastructure] The Python runtime could not be downloaded. This is a platform/network issue, not a problem with your work."
            )
          );
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
    if (!this.py) {
      // Runtime never initialized — a Fydell infrastructure condition, never
      // a candidate-code failure. exitCode 111 marks infra everywhere.
      return {
        ok: false,
        stdout: "",
        stderr:
          "[infrastructure] The Python runtime is not available. Your work is unaffected — reload the workspace or use Report technical issue.",
        exitCode: 111,
        durationMs: 0,
        command,
      };
    }
    const allowed = parseAllowlistedCommand(command);
    if (!allowed) {
      return {
        ok: false,
        stdout: "",
        stderr:
          "Command not allowed. Supported: test | pytest | evals | preview | reconcile | ls | cat | head | grep | git diff | help",
        exitCode: 127,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "help") {
      return {
        ok: true,
        stdout:
          "Allowed: test, pytest, evals, preview, reconcile, ls, cat <path>, head <path>, grep <pat> <path>, git diff, help\n",
        stderr: "",
        exitCode: 0,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "ls" || allowed === "cat" || allowed === "head" || allowed === "grep" || allowed === "git diff") {
      return this.runFsCommand(allowed, command.trim());
    }
    if (allowed === "preview") return this.preview();
    if (allowed === "evals") return this.runEvaluations();
    if (allowed === "reconcile") return this.runReconcile();
    return this.runTests();
  }

  private async runFsCommand(kind: string, raw: string): Promise<CommandResult> {
    const started = Date.now();
    try {
      const files = await this.listFiles();
      if (kind === "ls") {
        return {
          ok: true,
          stdout: files.sort().join("\n") + "\n",
          stderr: "",
          exitCode: 0,
          durationMs: Date.now() - started,
          command: raw,
        };
      }
      if (kind === "git diff") {
        return {
          ok: true,
          stdout:
            "No host git in the sandbox. Use the Code tab for edits; evidence captures file changes on submit.\n",
          stderr: "",
          exitCode: 0,
          durationMs: Date.now() - started,
          command: raw,
        };
      }
      const parts = raw.split(/\s+/);
      if (kind === "cat" || kind === "head") {
        const path = parts[1];
        if (!path) {
          return {
            ok: false,
            stdout: "",
            stderr: `Usage: ${kind} <path>\n`,
            exitCode: 2,
            durationMs: Date.now() - started,
            command: raw,
          };
        }
        const content = await this.readFile(path);
        const out = kind === "head" ? content.split("\n").slice(0, 20).join("\n") + "\n" : content;
        return {
          ok: true,
          stdout: out.endsWith("\n") ? out : out + "\n",
          stderr: "",
          exitCode: 0,
          durationMs: Date.now() - started,
          command: raw,
        };
      }
      // grep <pat> <path>
      const pat = parts[1];
      const path = parts[2];
      if (!pat || !path) {
        return {
          ok: false,
          stdout: "",
          stderr: "Usage: grep <pattern> <path>\n",
          exitCode: 2,
          durationMs: Date.now() - started,
          command: raw,
        };
      }
      const content = await this.readFile(path);
      const re = new RegExp(pat, "i");
      const hits = content
        .split("\n")
        .map((line, i) => ({ line, i: i + 1 }))
        .filter(({ line }) => re.test(line))
        .slice(0, 80)
        .map(({ line, i }) => `${i}:${line}`)
        .join("\n");
      return {
        ok: true,
        stdout: (hits || "(no matches)") + "\n",
        stderr: "",
        exitCode: 0,
        durationMs: Date.now() - started,
        command: raw,
      };
    } catch (err) {
      return {
        ok: false,
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        durationMs: Date.now() - started,
        command: raw,
      };
    }
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
    "test_reconcile",
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

  /**
   * Executes the seeded tests/test_reconcile.py from the virtual FS against
   * the candidate's *current* workspace files — not a hardcoded re-statement
   * of the assertions. A candidate edit to src/reconcile.py (or to the test
   * file itself) changes what actually runs, exactly like pytest would.
   */
  async runTests(): Promise<CommandResult> {
    const testPath = `${this.root}/tests/test_reconcile.py`;
    if (this.py && !this.py.FS.analyzePath(testPath).exists) {
      return {
        ok: false,
        stdout: "",
        stderr:
          "[infrastructure] tests/test_reconcile.py is missing from the workspace. This is a Fydell provisioning issue, not a problem with your work — use Report technical issue.",
        exitCode: 111,
        durationMs: 0,
        command: "pytest",
      };
    }
    return this.runPythonCapture(
      `
import sys, traceback, importlib.util
sys.path.insert(0, "${this.root}/src")
sys.path.insert(0, "${this.root}/tests")

spec = importlib.util.spec_from_file_location("test_reconcile", "${testPath}")
mod = importlib.util.module_from_spec(spec)
sys.modules["test_reconcile"] = mod
spec.loader.exec_module(mod)

tests = [(name, fn) for name, fn in vars(mod).items() if name.startswith("test_") and callable(fn)]
tests.sort(key=lambda t: t[0])

passed, failed, errored = 0, 0, 0
for name, fn in tests:
    try:
        fn()
        print(f"PASSED  {name}")
        passed += 1
    except AssertionError as exc:
        failed += 1
        print(f"FAILED  {name}")
        tb = traceback.format_exc().splitlines()
        for line in tb[-3:]:
            print(f"        {line}")
    except Exception:
        errored += 1
        print(f"ERROR   {name}")
        tb = traceback.format_exc().splitlines()
        for line in tb[-3:]:
            print(f"        {line}")

print()
print(f"{passed} passed, {failed} failed, {errored} errored — tests/test_reconcile.py")
if failed or errored:
    raise SystemExit(1)
`,
      "pytest"
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
