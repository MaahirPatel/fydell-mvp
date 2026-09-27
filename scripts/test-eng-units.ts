/**
 * Engineering assessment unit contracts: archive inspection against hostile
 * ZIPs, the reviewed starter archive, the deterministic teammate policy, the
 * setup code, the derived employer state, and the report release gate.
 * Pure functions only; no network, no database.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { inspectArchive, ZIP_LIMITS } from "../src/lib/eng/zip";
import { buildStarterArchive, starterFileList } from "../src/lib/eng/starter";
import { selectReply, tokenize } from "../src/lib/eng/teammate";
import { CURRENT_SCENARIO, expectedSetupCodes, verifySetupCode } from "../src/lib/eng/scenarios";
import { effectiveDueAt, operationalState, submissionWindow } from "../src/lib/eng/state";
import { validateForRelease, parseFindings, parseBrief, type EvidenceIndex } from "../src/lib/eng/citations";
import type { Finding, ReportBrief } from "../src/lib/eng/types";

let failures = 0;
let passes = 0;
function ok(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passes += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

const KEY = CURRENT_SCENARIO.key;
const MANIFEST = JSON.stringify({ scenario: KEY, version: 1 });
const MTIME = new Date(2026, 8, 27);

function project(extra: Record<string, Uint8Array | string> = {}, root = "harbor-webhooks/"): Uint8Array {
  const files: Record<string, [Uint8Array, { mtime: Date }]> = {};
  const base: Record<string, Uint8Array | string> = {
    "fydell.json": MANIFEST,
    "webhooks/__init__.py": "",
    "webhooks/dispatcher.py": "def dispatch():\n    return None\n",
    ...extra,
  };
  for (const [name, value] of Object.entries(base)) {
    files[`${root}${name}`] = [typeof value === "string" ? strToU8(value) : value, { mtime: MTIME }];
  }
  return zipSync(files, { level: 6, mtime: MTIME });
}

function code(bytes: Uint8Array): string {
  const r = inspectArchive(bytes, KEY);
  return r.ok ? "ok" : r.code;
}

/** Rewrites every central and local header of a single-entry archive. */
function patch(bytes: Uint8Array, fn: (view: DataView, central: number, local: number) => void): Uint8Array {
  const out = bytes.slice();
  const view = new DataView(out.buffer);
  let eocd = -1;
  for (let i = out.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  const cd = view.getUint32(eocd + 16, true);
  fn(view, cd, view.getUint32(cd + 42, true));
  return out;
}

console.log("\nArchive inspection");
{
  const good = inspectArchive(project(), KEY);
  ok("minimal valid project is accepted", good.ok === true, good);
  if (good.ok) {
    ok("prefix is detected from fydell.json", good.prefix === "harbor-webhooks/");
    ok("paths are stored relative to the project root", good.contents.has("webhooks/dispatcher.py"));
  }
  ok("project zipped without a top folder is accepted", code(project({}, "")) === "ok");

  const ignored = inspectArchive(project({ "__pycache__/x.pyc": "x", ".venv/lib/a.py": "a", ".git/HEAD": "ref", ".DS_Store": "x" }), KEY);
  ok("caches, venvs, .git and OS files are ignored, not rejected", ignored.ok === true && ignored.ignored.length === 4, ignored);

  ok("not a zip", code(strToU8("hello world, definitely not a zip archive")) === "not_a_zip");
  ok("truncated zip", code(project().subarray(0, 60)) === "not_a_zip");
  ok("path traversal", code(project({ "../evil.py": "x" })) === "unsafe_path");
  ok("absolute path", code(zipSync({ "/etc/passwd": strToU8("x"), "fydell.json": strToU8(MANIFEST) })) === "unsafe_path");
  ok("windows drive path", code(zipSync({ "C:/x.py": strToU8("x"), "fydell.json": strToU8(MANIFEST) })) === "unsafe_path");
  ok(".env credential is refused", code(project({ ".env": "SECRET=1" })) === "credential_file");
  ok(".env.local credential is refused", code(project({ ".env.local": "SECRET=1" })) === "credential_file");
  ok(".env.example is allowed", code(project({ ".env.example": "SECRET=" })) === "ok");
  ok("private key is refused", code(project({ "keys/id_rsa": "k" })) === "credential_file");
  ok("nested archive is refused", code(project({ "vendor/lib.zip": "PK" })) === "nested_archive");
  ok("case-insensitive duplicate is refused", code(project({ "webhooks/Dispatcher.py": "x" })) === "duplicate_name");
  ok("missing manifest", code(zipSync({ "p/webhooks/dispatcher.py": strToU8("x") })) === "missing_manifest");
  ok("wrong scenario", code(zipSync({ "p/fydell.json": strToU8(JSON.stringify({ scenario: "other" })), "p/webhooks/dispatcher.py": strToU8("x") })) === "wrong_scenario");
  ok("missing dispatcher", code(zipSync({ "p/fydell.json": strToU8(MANIFEST), "p/README.md": strToU8("x") })) === "missing_source");
  ok("files outside the project folder", code(zipSync({ "a/fydell.json": strToU8(MANIFEST), "a/webhooks/dispatcher.py": strToU8("x"), "b/other.py": strToU8("x") })) === "unsafe_path");
  ok("oversize archive", code(new Uint8Array(ZIP_LIMITS.maxArchiveBytes + 1)) === "too_large");
  ok("single file over 1 MB", code(project({ "data.bin": new Uint8Array(ZIP_LIMITS.maxFileBytes + 10).fill(7) })) === "file_too_large");

  const bomb = project({ "big.txt": new Uint8Array(900 * 1024).fill(65) });
  ok("high-ratio entry is refused before inflating", code(bomb) === "compression_ratio");

  const single = zipSync({ "fydell.json": [strToU8(MANIFEST), { mtime: MTIME }] }, { level: 0 });
  const encrypted = patch(single, (v, c, l) => {
    v.setUint16(c + 8, v.getUint16(c + 8, true) | 1, true);
    v.setUint16(l + 6, v.getUint16(l + 6, true) | 1, true);
  });
  ok("encrypted entry is refused", code(encrypted) === "encrypted_entry");

  const symlink = patch(single, (v, c) => {
    v.setUint16(c + 4, (3 << 8) | 20, true);
    v.setUint32(c + 38, (0o120777 << 16) >>> 0, true);
  });
  ok("symbolic link is refused", code(symlink) === "symlink");

  const badCrc = patch(project(), (v, c) => v.setUint32(c + 16, (v.getUint32(c + 16, true) ^ 0xffff) >>> 0, true));
  ok("CRC mismatch is refused", code(badCrc) === "corrupt_entry");

  const lying = patch(project(), (v, c) => v.setUint32(c + 24, 3, true));
  ok("declared size mismatch is refused", code(lying) === "corrupt_entry");
}

console.log("\nReviewed starter archive");
{
  const a = buildStarterArchive();
  const b = buildStarterArchive();
  ok("starter archive is byte-identical across builds", a.sha256 === b.sha256);
  const inspected = inspectArchive(a.bytes, KEY);
  ok("starter passes the same checks a submission must pass", inspected.ok === true, inspected);
  ok("starter contains preflight, tests and the dispatcher", ["preflight.py", "fydell.json", "webhooks/dispatcher.py", "tests/test_dispatcher.py"].every((f) => starterFileList().includes(f)));
  ok("starter does not ship evaluator or fixtures", !starterFileList().some((f) => /harness|expectations|fixtures|reference/i.test(f)));
}

console.log("\nSetup code");
{
  ok("Python 3.12 code matches preflight output", verifySetupCode(CURRENT_SCENARIO, "HWR-C491D692") === "3.12");
  ok("code check is case and whitespace tolerant", verifySetupCode(CURRENT_SCENARIO, "  hwr-c491d692 ") === "3.12");
  ok("unknown code is refused", verifySetupCode(CURRENT_SCENARIO, "HWR-00000000") === null);
  ok("the whole printed line is accepted", verifySetupCode(CURRENT_SCENARIO, "Setup code: HWR-C491D692") === "3.12");
  ok("text without a code is refused", verifySetupCode(CURRENT_SCENARIO, "Python 3.12 OK. Public tests ran") === null);
  ok("one code per supported runtime", expectedSetupCodes(CURRENT_SCENARIO).size === CURRENT_SCENARIO.supportedRuntimes.length);
}

console.log("\nScenario consistency");
{
  const s = CURRENT_SCENARIO;
  const files = unzipSync(buildStarterArchive().bytes);
  const read = (suffix: string) => {
    const key = Object.keys(files).find((k) => k.endsWith(suffix));
    return key ? strFromU8(files[key]) : "";
  };
  const incident = read("INCIDENT.md");
  const preflight = read("preflight.py");
  const beforeUpdate = [s.summary, ...s.candidateBrief, ...s.initialRequirements, ...s.resources.map((r) => r.description)].join(" ").toLowerCase();
  ok("nothing shown before the update names Retry-After", !/retry[\s-]*after/.test(beforeUpdate));
  ok("the brief says one update will arrive", /update/.test(s.summary.toLowerCase()) && s.candidateBrief.some((l) => l.includes(`${s.requirementUpdate.releaseAfterMinutes} minutes`)));
  ok("the update itself is about Retry-After", /retry-after/i.test(s.requirementUpdate.body));
  ok("initial requirements match INCIDENT.md numbers", ["60 seconds", "3600 seconds", "8 attempts", "Idempotency-Key"].every((t) => incident.includes(t) && s.initialRequirements.join(" ").includes(t)));
  ok("every listed resource exists in the starter", s.resources.every((r) => Object.keys(files).some((k) => k.endsWith(r.path))));
  ok("supported runtimes match preflight.py", s.supportedRuntimes.every((v) => preflight.includes(`(${v.replace(".", ", ")})`)));
  ok("setup code prefix matches preflight.py", preflight.includes(`Setup code: ${s.setupCodePrefix}-`));
  ok("update arrives well inside the expected effort", s.requirementUpdate.releaseAfterMinutes < s.targetMinutes && s.targetMinutes < s.defaultAllowedMinutes);
  ok("handoff asks the three agreed questions", s.handoffPrompts.map((p) => p.field).join(",") === "what_changed,testing,risks");
  ok("candidate-facing environment notes carry no internal dates", s.supportedEnvironments.every((e) => !/\d{4}-\d{2}-\d{2}/.test(e.note)));
}

console.log("\nTeammate policy");
{
  const s = CURRENT_SCENARIO;
  ok("retry-after spellings normalize", tokenize("Retry-After").has("retryafter") && tokenize("retry after").has("retryafter"));
  ok("status codes add a class token", tokenize("what about 503?").has("5xx"));
  const early = selectReply(s, "Should we honor Retry-After on 429?", { updateReleased: false });
  const late = selectReply(s, "Should we honor Retry-After on 429?", { updateReleased: true });
  ok("Retry-After is not answered before the update", early.ruleId === "retry_after_early", early.ruleId);
  ok("Retry-After policy is answered after the update", late.ruleId === "retry_after_policy", late.ruleId);
  ok("the same question gets the same answer", selectReply(s, "Do we follow redirects?", { updateReleased: false }).body === selectReply(s, "do we FOLLOW redirects", { updateReleased: true }).body);
  ok("redirect question", selectReply(s, "Do we follow a 302 redirect?", { updateReleased: false }).ruleId === "redirects");
  ok("temporary vs permanent", selectReply(s, "Which status codes should we retry?", { updateReleased: false }).ruleId === "temporary_vs_permanent");
  ok("backoff", selectReply(s, "What backoff delay should I use?", { updateReleased: false }).ruleId === "backoff");
  ok("hidden checks are not disclosed", selectReply(s, "What do the hidden tests check?", { updateReleased: false }).ruleId === "tests");
  ok("identity question is answered honestly", selectReply(s, "Are you a real person or a bot?", { updateReleased: false }).ruleId === "identity");
  ok("unrelated question falls back", selectReply(s, "What is your favourite colour?", { updateReleased: false }).ruleId === "fallback");
  const leaks = s.clarificationRules.filter((r) => /H\d|U\d|harness|expectation/i.test(r.answer));
  ok("no authored answer names a hidden probe", leaks.length === 0, leaks.map((r) => r.id));
}

console.log("\nDerived employer state");
{
  const inv = { status: "invited" as const, expires_at: new Date(Date.now() + 86400000).toISOString() };
  ok("invited", operationalState({ invitation: inv, attempt: null, run: null, releasedReport: null }) === "invited");
  ok("expired invitation", operationalState({ invitation: { ...inv, expires_at: new Date(Date.now() - 1000).toISOString() }, attempt: null, run: null, releasedReport: null }) === "expired");
  ok("withdrawn wins", operationalState({ invitation: { ...inv, status: "withdrawn" }, attempt: { status: "in_progress" }, run: null, releasedReport: null }) === "withdrawn");
  ok("setup complete", operationalState({ invitation: inv, attempt: { status: "preflight_passed" }, run: null, releasedReport: null }) === "setup_complete");
  ok("evaluating", operationalState({ invitation: inv, attempt: { status: "submitted" }, run: { status: "running" }, releasedReport: null }) === "evaluating");
  ok("platform failure is a delay, not a result", operationalState({ invitation: inv, attempt: { status: "submitted" }, run: { status: "blocked" }, releasedReport: null }) === "evaluation_delayed");
  ok("finished checks wait for a human", operationalState({ invitation: inv, attempt: { status: "submitted" }, run: { status: "human_review" }, releasedReport: null }) === "review_required");
  ok("ready only with a released report", operationalState({ invitation: inv, attempt: { status: "submitted" }, run: { status: "ready" }, releasedReport: { status: "released" } }) === "ready");

  const start = new Date("2026-09-27T10:00:00Z");
  const attempt = { due_at: new Date(start.getTime() + 90 * 60000).toISOString(), extension_minutes: 0 };
  ok("open before the deadline", submissionWindow(attempt, 15, new Date(start.getTime() + 89 * 60000)) === "open");
  ok("late inside the grace window", submissionWindow(attempt, 15, new Date(start.getTime() + 100 * 60000)) === "late");
  ok("closed after the grace window", submissionWindow(attempt, 15, new Date(start.getTime() + 106 * 60000)) === "closed");
  ok("extension moves the deadline", submissionWindow({ ...attempt, extension_minutes: 30 }, 15, new Date(start.getTime() + 110 * 60000)) === "open");
  ok("effective due includes the extension", effectiveDueAt({ ...attempt, extension_minutes: 30 })!.getTime() === start.getTime() + 120 * 60000);
  ok("not started means closed", submissionWindow({ due_at: null, extension_minutes: 0 }, 15) === "closed");
}

console.log("\nReport release gate");
{
  const index: EvidenceIndex = {
    files: new Map([["webhooks/dispatcher.py", 120]]),
    probes: new Map([
      ["H1", "passed"],
      ["H2", "failed"],
      ["U1", "passed"],
    ]),
    messageIds: new Set(["m-1"]),
    handoffFields: new Set(["what_changed"]),
  };
  const brief: ReportBrief = {
    summary: "Fixed backoff and idempotency; Retry-After handled for 429 only.",
    strengths: ["Stable idempotency key"],
    gaps: ["503 Retry-After ignored"],
    limitations: ["Editor activity is not observed."],
    followUps: ["Walk through the 503 path."],
    dimensions: [
      { key: "correctness", level: "adequate", rationale: "Most checks pass." },
      { key: "engineering_judgment", level: "adequate", rationale: "Clear structure." },
      { key: "requirement_response", level: "weak", rationale: "Partial update." },
      { key: "work_communication", level: "strong", rationale: "Asked the right question." },
    ],
  };
  const good: Finding[] = [
    { id: "F1", dimension: "correctness", category: "coding_result", kind: "strength", basis: "observed", statement: "Backoff doubles and caps.", citations: [{ kind: "test", ref: "H1" }] },
    { id: "F2", dimension: "requirement_response", category: "coding_result", kind: "gap", basis: "observed", statement: "503 ignores Retry-After.", citations: [{ kind: "test", ref: "H2" }, { kind: "file", ref: "webhooks/dispatcher.py", lineStart: 40, lineEnd: 52 }] },
    { id: "F3", dimension: "work_communication", category: "communication", kind: "strength", basis: "observed", statement: "Asked about redirects early.", citations: [{ kind: "message", ref: "m-1" }] },
  ];
  ok("well-grounded report passes", validateForRelease(brief, good, index).length === 0, validateForRelease(brief, good, index));

  const problems = (findings: Finding[], b: ReportBrief = brief) => validateForRelease(b, findings, index);
  ok("observed coding result without a test is refused", problems([{ ...good[0], citations: [{ kind: "file", ref: "webhooks/dispatcher.py", lineStart: 1, lineEnd: 2 }] }]).length > 0);
  ok("same claim as a hypothesis is allowed", problems([{ ...good[0], basis: "hypothesis", citations: [{ kind: "file", ref: "webhooks/dispatcher.py", lineStart: 1, lineEnd: 2 }] }]).length === 0);
  ok("observed gap citing only passing tests is refused", problems([{ ...good[1], citations: [{ kind: "test", ref: "H1" }] }]).length > 0);
  ok("observed strength citing a failed test is refused", problems([{ ...good[0], citations: [{ kind: "test", ref: "H2" }] }]).length > 0);
  ok("file lines outside the file are refused", problems([{ ...good[1], citations: [{ kind: "test", ref: "H2" }, { kind: "file", ref: "webhooks/dispatcher.py", lineStart: 110, lineEnd: 130 }] }]).length > 0);
  ok("file not in the snapshot is refused", problems([{ ...good[1], citations: [{ kind: "test", ref: "H2" }, { kind: "file", ref: "webhooks/other.py", lineStart: 1 }] }]).length > 0);
  ok("unknown test is refused", problems([{ ...good[0], citations: [{ kind: "test", ref: "H9" }] }]).length > 0);
  ok("communication finding without message or handoff is refused", problems([{ ...good[2], citations: [{ kind: "test", ref: "H1" }] }]).length > 0);
  ok("message from another thread is refused", problems([{ ...good[2], citations: [{ kind: "message", ref: "m-other" }] }]).length > 0);
  ok("empty handoff field cannot be cited", problems([{ ...good[2], citations: [{ kind: "handoff", ref: "risks" }] }]).length > 0);
  ok("missing dimension is refused", problems(good, { ...brief, dimensions: brief.dimensions.slice(1) }).length > 0);
  ok("no limitations is refused", problems(good, { ...brief, limitations: [] }).length > 0);
  ok("no follow-ups is refused", problems(good, { ...brief, followUps: [] }).length > 0);
  ok("a report with no findings is refused", problems([]).length > 0);
  ok("parser rejects duplicate finding ids", parseFindings([good[0], good[0]]).ok === false);
  ok("parser rejects bad levels", parseBrief({ ...brief, dimensions: [{ key: "correctness", level: "excellent", rationale: "x" }] }).ok === false);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log("engineering unit contracts passed");
