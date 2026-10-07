import { runDetectors } from "../src/lib/passport/github/detectors";

let failures = 0;
function ok(name: string, condition: boolean, detail = ""): void {
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}${!condition && detail ? ` (${detail})` : ""}`);
  if (!condition) failures += 1;
}

const detectorsIn = (files: Record<string, string>) => runDetectors(new Map(Object.entries(files)));
const has = (files: Record<string, string>, detector: string) => detectorsIn(files).some((f) => f.detector === detector);
const cited = (files: Record<string, string>, detector: string) => detectorsIn(files).find((f) => f.detector === detector);

const BACKEND = {
  "app/api/deps.py": [
    "from fastapi import Depends, HTTPException",
    "",
    "def read_items(user = Depends(get_current_user)):",
    "    return []",
  ].join("\n"),
  "app/services/payments.py": [
    "import logging",
    "import time",
    "import httpx",
    "logger = logging.getLogger(__name__)",
    "",
    "def charge(client, payload):",
    "    for attempt in range(5):",
    "        try:",
    "            return client.post('/charge', json=payload, timeout=10)",
    "        except httpx.TimeoutException as exc:",
    "            logger.warning('timeout %s', exc)",
    "            time.sleep(2 ** attempt)",
    "    raise RuntimeError('gave up')",
    "",
    "def save(session, order):",
    "    with session.begin():",
    "        session.add(order)",
    "",
    "def find(cur, order_id):",
    "    cur.execute(\"SELECT * FROM orders WHERE id = %s\", (order_id,))",
  ].join("\n"),
  "app/worker.py": ["from celery import shared_task", "", "@shared_task", "def send_receipt(order_id):", "    pass"].join("\n"),
  "tests/test_payments.py": [
    "import pytest",
    "",
    "@pytest.mark.parametrize('amount', [0, -1])",
    "def test_rejects_bad_amount(monkeypatch, amount):",
    "    monkeypatch.setattr('app.services.payments.TIMEOUT', 1)",
    "    with pytest.raises(ValueError):",
    "        charge(None, {'amount': amount})",
  ].join("\n"),
};

const SOFTWARE = {
  "src/store.ts": ["import { createContext, useReducer } from 'react';", "export const Ctx = createContext(null);"].join("\n"),
  "src/load.ts": [
    "export async function loadAll(ids: string[]) {",
    "  try {",
    "    return await Promise.all(ids.map(fetchOne));",
    "  } catch (err) {",
    "    console.error('load failed', err);",
    "    throw err;",
    "  }",
    "}",
  ].join("\n"),
  "src/repo.py": ["from typing import Protocol", "", "class Repository(Protocol):", "    def get(self, id: str): ..."].join("\n"),
  "tsconfig.json": ['{', '  "compilerOptions": {', '    "strict": true', "  }", "}"].join("\n"),
  "Dockerfile": ["FROM python:3.12-slim", "COPY . /app", "USER app"].join("\n"),
};

const ML = {
  "train.py": [
    "import torch",
    "from sklearn.model_selection import train_test_split",
    "from sklearn.metrics import f1_score",
    "",
    "torch.manual_seed(0)",
    "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)",
    "loss.backward()",
    "optimizer.step()",
    "model.eval()",
    "with torch.no_grad():",
    "    preds = model(X_test)",
    "print(f1_score(y_test, preds))",
    "torch.save(model.state_dict(), 'model.pt')",
  ].join("\n"),
  "agent.py": [
    "import json, time",
    "start = time.perf_counter()",
    "resp = client.chat.completions.create(model='x', messages=[])",
    "data = json.loads(resp.choices[0].message.content)",
  ].join("\n"),
};

console.log("Backend and API module");
for (const d of ["auth_boundary", "explicit_error_handling", "retry_with_backoff", "outbound_timeout", "db_transaction", "parameterized_sql", "background_job", "observability"]) {
  ok(`detects ${d}`, has(BACKEND, d));
}
ok("retry citation spans the loop and the delay", (() => {
  const f = cited(BACKEND, "retry_with_backoff");
  return f !== undefined && f.path === "app/services/payments.py" && f.startLine === 7 && f.endLine === 12;
})());
ok("parameterized query cites the execute line", cited(BACKEND, "parameterized_sql")?.startLine === 20);

console.log("Testing depth");
for (const d of ["failure_path_test", "test_isolation", "parametrized_test", "test_suite"]) ok(`detects ${d}`, has(BACKEND, d));

console.log("Software design module");
for (const d of ["ui_state_management", "concurrent_execution", "explicit_error_handling", "interface_contract", "strict_typing", "container_build", "container_non_root"]) {
  ok(`detects ${d}`, has(SOFTWARE, d));
}

console.log("AI and ML module");
for (const d of ["ml_training_step", "ml_data_split", "ml_evaluation_metric", "ml_reproducibility", "ml_artifact_versioning", "ml_inference_mode", "llm_api_integration", "llm_output_validation", "llm_latency_measurement"]) {
  ok(`detects ${d}`, has(ML, d));
}

console.log("Guards against overclaiming");
ok("unsupported language yields no observations", detectorsIn({ "src/Main.hs": "main :: IO ()\nmain = putStrLn \"hi\"" }).length === 0);
ok("a swallowed exception is not reported as handling", !has({ "a.py": "try:\n    x()\nexcept ValueError:\n    pass\n" }, "explicit_error_handling"));
ok("SQL built with an f-string is not reported as parameterized", !has({ "a.py": 'cur.execute(f"SELECT * FROM t WHERE id = {i}")' }, "parameterized_sql"));
ok("root container user is not reported as non-root", !has({ Dockerfile: "FROM alpine\nUSER root" }, "container_non_root"));
ok("output validation requires a model call in the same file", !has({ "a.py": "import json\njson.loads(s)" }, "llm_output_validation"));
ok("importing a mocking library is not reported as test isolation", !has({ "tests/test_a.py": "from unittest.mock import patch\n\ndef test_a():\n    assert 1\n" }, "test_isolation"));
ok("using a mock is reported as test isolation", has({ "tests/test_a.py": "from unittest.mock import patch\n\ndef test_a():\n    with patch(\"a.b\"):\n        assert 1\n" }, "test_isolation"));
ok("library names in docs are not findings", detectorsIn({ "README.md": "We use pytest.raises( and torch.manual_seed(" }).length === 0);
ok("dependency declarations are kept separate from observations", (() => {
  const all = detectorsIn({ ...BACKEND, "pyproject.toml": '[project]\ndependencies = ["fastapi", "sqlalchemy"]' });
  const firstDeclared = all.findIndex((f) => f.basis === "dependency_declaration");
  return firstDeclared > 0 && all.slice(firstDeclared).every((f) => f.basis === "dependency_declaration");
})());
ok("every finding states at least one limitation", [BACKEND, SOFTWARE, ML].every((fx) => detectorsIn(fx).every((f) => f.limitations.length > 0)));
ok("every citation points at a real line", [BACKEND, SOFTWARE, ML].every((fx) => detectorsIn(fx).every((f) => {
  const lines = (fx as Record<string, string>)[f.path]?.split("\n") ?? [];
  return f.startLine >= 1 && f.endLine >= f.startLine && f.endLine <= lines.length;
})));

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll analysis module checks passed");
