export type TestVisibility = "public" | "protected";

export type TestStatus = "pass" | "fail" | "not_run";

/** What the demo knows about each test, independent of any run. */
export type TestMeta = {
  id: string;
  /** Exact name passed to `test(name, fn)` in the test file. */
  name: string;
  file: string;
  visibility: TestVisibility;
  /** The requirement the test checks, in words. Protected tests are shown to candidates only through this. */
  requirement: string;
  /** True when the starter is expected to fail this test because of the seeded issue. Only known for hand-validated scenarios. */
  targetsIssue?: boolean;
};

export type TestResult = {
  id: string;
  status: TestStatus;
  message: string | null;
  durationMs: number;
};

/** Raw harness output, as posted back by the worker. */
export type HarnessTest = {
  file: string;
  name: string;
  status: "pass" | "fail";
  message: string | null;
  durationMs: number;
};

export type HarnessOutput = {
  tests: HarnessTest[];
  fileErrors: { file: string; message: string }[];
  logs: string[];
  durationMs: number;
};

export type RunOutcome =
  | { kind: "completed"; output: HarnessOutput }
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "error"; message: string };

export type RunScope = "public" | "all";

export type RunRecord = {
  at: string;
  scope: RunScope;
  outcome: RunOutcome["kind"];
  /** Explains a timeout or worker error. Null when the run completed. */
  outcomeMessage: string | null;
  results: TestResult[];
  logs: string[];
  durationMs: number;
};

export type HarnessPayload = {
  files: Record<string, string>;
  testFiles: string[];
};
