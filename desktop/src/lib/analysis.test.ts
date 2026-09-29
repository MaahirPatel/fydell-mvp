import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeFile, analyzeWorkspace } from "./analysis.js";

const STARTER = `"""Webhook retry worker."""
import time


def fetch_pending():
    return []


def process_one(item):
    # TODO: handle poison messages
    return item
`;

const EDITED = `"""Webhook retry worker."""
import time


def fetch_pending():
    try:
        return query_db()
    except ConnectionError:
        return []


def process_one(item):
    # TODO: handle poison messages
    if item is None:
        return None
    if item.get("retries", 0) > 5:
        if item.get("poison"):
            if item["poison"]:
                raise ValueError("poison")
    return transform(item)


def transform(item):
    return item


def deeply_nested(x):
    if x:
        if x > 1:
            if x > 2:
                if x > 3:
                    if x > 4:
                        return x
    return None
`;

describe("analyzeFile: python", () => {
  it("finds functions, nesting, error handling, and TODOs", () => {
    const f = analyzeFile("worker.py", EDITED, STARTER);
    assert.equal(f.language, "python");
    assert.equal(f.changed, true);
    const names = f.functions.map((fn) => fn.name);
    assert.ok(names.includes("fetch_pending"));
    assert.ok(names.includes("process_one"));
    assert.ok(names.includes("transform"));
    const fetch = f.functions.find((fn) => fn.name === "fetch_pending")!;
    assert.equal(fetch.hasErrorHandling, true);
    const process = f.functions.find((fn) => fn.name === "process_one")!;
    assert.equal(process.hasErrorHandling, false);
    assert.equal(f.todos.length, 1);
    assert.ok(f.todos[0].text.startsWith("TODO"));
    const deep = f.functions.find((fn) => fn.name === "deeply_nested")!;
    assert.ok(deep.maxNesting >= 4, `nesting was ${deep.maxNesting}`);
  });

  it("flags camelCase function names", () => {
    const f = analyzeFile("a.py", "def doThing():\n    pass\n", null);
    assert.equal(f.namingIssues.length, 1);
    assert.equal(f.namingIssues[0].name, "doThing");
  });

  it("reports unchanged files as unchanged", () => {
    const f = analyzeFile("worker.py", STARTER, STARTER);
    assert.equal(f.changed, false);
    assert.equal(f.linesAdded, 0);
    assert.equal(f.linesRemoved, 0);
  });
});

describe("analyzeWorkspace", () => {
  it("diffs against the baseline and reports added functions", () => {
    const report = analyzeWorkspace(
      [
        { path: "worker.py", content: EDITED },
        { path: "tests/test_worker.py", content: "def test_transform():\n    assert transform({}) == {}\n" },
      ],
      [{ path: "worker.py", content: STARTER }]
    );
    assert.equal(report.fileCount, 2);
    assert.equal(report.filesChanged, 2);
    assert.ok(report.totalLinesAdded > 0);
    const added = report.functionsAdded.map((f) => f.name);
    assert.ok(added.includes("transform"));
    assert.ok(added.includes("deeply_nested"));
    assert.equal(report.functionsRemoved.length, 0);
    // Coverage heuristic: test file references transform.
    const cov = report.coverage.find((c) => c.functionName === "transform");
    assert.ok(cov);
    assert.deepEqual(cov!.referencedByTests, ["tests/test_worker.py"]);
    const covDeep = report.coverage.find((c) => c.functionName === "deeply_nested");
    assert.ok(covDeep);
    assert.deepEqual(covDeep!.referencedByTests, []);
    // Signals.
    assert.ok(report.signals.deepNesting.some((s) => s.name === "deeply_nested"));
    assert.equal(report.signals.todoCount, 1);
    assert.deepEqual(report.signals.testFiles, ["tests/test_worker.py"]);
    assert.ok(report.scope.length > 0);
  });

  it("detects removed functions", () => {
    const report = analyzeWorkspace(
      [{ path: "worker.py", content: "def kept():\n    pass\n" }],
      [{ path: "worker.py", content: "def kept():\n    pass\n\ndef gone():\n    pass\n" }]
    );
    assert.equal(report.functionsRemoved.length, 1);
    assert.equal(report.functionsRemoved[0].name, "gone");
  });

  it("handles empty workspaces", () => {
    const report = analyzeWorkspace([], []);
    assert.equal(report.fileCount, 0);
    assert.equal(report.filesChanged, 0);
  });
});
