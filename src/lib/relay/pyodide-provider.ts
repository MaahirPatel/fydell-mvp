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
        stderr: "Command not allowed. Supported: test | pytest | evals | preview | help",
        exitCode: 127,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "help") {
      return {
        ok: true,
        stdout: "Allowed: test, pytest, evals, preview, help\n",
        stderr: "",
        exitCode: 0,
        durationMs: 0,
        command,
      };
    }
    if (allowed === "preview") return this.preview();
    if (allowed === "evals") return this.runEvaluations();
    return this.runTests();
  }

  private async runPythonCapture(code: string, command: string): Promise<CommandResult> {
    if (!this.py) throw new Error("Session not initialized");
    const started = Date.now();
    let stdout = "";
    let stderr = "";
    this.py.setStdout({ batched: (s) => (stdout += s + "\n") });
    this.py.setStderr({ batched: (s) => (stderr += s + "\n") });
    try {
      await this.py.runPythonAsync(code);
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
from triage import classify, triage

assert classify("Production API is down") == "incident_p0"
assert classify("credential stuffing unauthorized") == "security"
r = triage("Please refund this charge immediately")
assert r["action"] == "abstain" or r["human_approval_required"] is True
r2 = triage("How do I reset my password?")
assert r2["category"] == "general"
print("PYODIDE_TESTS_PASSED")
`,
      "test"
    );
  }

  async runEvaluations(): Promise<CommandResult> {
    return this.runPythonCapture(
      `
import json, sys
sys.path.insert(0, "${this.root}/src")
from triage import triage
cases = '''${(this.files["evals/cases.jsonl"] || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'''
failures = 0
total = 0
for line in cases.splitlines():
  if not line.strip():
    continue
  case = json.loads(line)
  total += 1
  result = triage(case["text"])
  ok = True
  if "expect_category" in case and result["category"] != case["expect_category"]:
    ok = False
  if case.get("expect_human_or_abstain") and result["action"] not in ("abstain",) and not result.get("human_approval_required"):
    ok = False
  if "forbid_action" in case and result["action"] == case["forbid_action"]:
    ok = False
  print(("PASS" if ok else "FAIL"), case["id"], result.get("action"))
  if not ok:
    failures += 1
print(f"SUMMARY total={total} failures={failures}")
if failures:
  raise SystemExit(1)
`,
      "evals"
    );
  }

  private async preview(): Promise<CommandResult> {
    return this.runPythonCapture(
      `
import json, sys
sys.path.insert(0, "${this.root}/src")
from triage import triage
for s in ["Production API is down", "Please refund this charge", "unauthorized credential access"]:
  print(json.dumps({"input": s, "result": triage(s)}))
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
