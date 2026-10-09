import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AI_USE_FIELD,
  EngMessage,
  EngUpload,
  citationLabel,
  consentFacts,
  engStage,
  exclusionLabel,
  formatBytes,
  handoffBlockers,
  handoffFields,
  packageSummary,
  receiptProgress,
  reconcileDraft,
  senderName,
  serverOffsetMs,
  setupCommandFor,
  sortMessages,
  submittableUpload,
  timeLeft,
  uploadStatusText,
  windowNote,
} from "./eng.js";

function attempt(status: string, consentedAt: string | null = null) {
  return {
    attempt: {
      id: "a",
      status,
      consentedAt,
      preflightPassedAt: null,
      preflightRuntime: null,
      startedAt: null,
      dueAt: null,
      extensionMinutes: 0,
      allowedMinutes: 90,
      submittedAt: null,
      updateReleasedAt: null,
      updateAcknowledgedAt: null,
      window: "open",
    },
  };
}

function upload(over: Partial<EngUpload>): EngUpload {
  return {
    id: "u1",
    status: "accepted",
    original_filename: "x.zip",
    byte_size: 10,
    sha256: "ABC",
    file_list: [],
    rejection_code: null,
    rejection_detail: null,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("engStage", () => {
  it("maps statuses to stages, consent before setup", () => {
    assert.equal(engStage(attempt("accepted")), "consent");
    assert.equal(engStage(attempt("accepted", "2026-01-01T00:00:00Z")), "setup");
    assert.equal(engStage(attempt("preflight_passed", "x")), "ready");
    assert.equal(engStage(attempt("in_progress", "x")), "working");
    assert.equal(engStage(attempt("submitted", "x")), "submitted");
    assert.equal(engStage(attempt("withdrawn")), "withdrawn");
    assert.equal(engStage(attempt("expired")), "expired");
  });
});

describe("consentFacts", () => {
  it("includes extension minutes in the window", () => {
    const v = attempt("accepted");
    v.attempt.extensionMinutes = 30;
    const facts = consentFacts({ ...v, scenario: { targetMinutes: 75 } as never });
    assert.match(facts[0].value, /^120 minutes/);
    assert.match(facts[0].value, /75 minutes of work/);
  });
});

describe("clock", () => {
  it("computes the server offset and ignores bad input", () => {
    assert.equal(serverOffsetMs("2026-01-01T00:00:10Z", Date.parse("2026-01-01T00:00:00Z")), 10_000);
    assert.equal(serverOffsetMs("garbage", 5), 0);
  });

  it("formats time left with tones", () => {
    const due = "2026-01-01T02:00:00Z";
    const at = (iso: string) => Date.parse(iso);
    assert.deepEqual(timeLeft(due, at("2026-01-01T00:30:00Z")), { label: "1:30:00 left", tone: "ok" });
    assert.deepEqual(timeLeft(due, at("2026-01-01T01:55:05Z")), { label: "4:55 left", tone: "low" });
    assert.deepEqual(timeLeft(due, at("2026-01-01T02:00:30Z")), { label: "Time is up", tone: "over" });
    assert.deepEqual(timeLeft(due, at("2026-01-01T02:07:00Z")), { label: "7 min over", tone: "over" });
    assert.equal(timeLeft(null, 0), null);
  });

  it("explains late and closed windows only", () => {
    assert.equal(windowNote("open", 15), null);
    assert.match(windowNote("late", 15) ?? "", /15-minute grace period/);
    assert.match(windowNote("closed", 15) ?? "", /closed/);
  });
});

describe("team thread", () => {
  const msg = (seq: number, sender: string, teammate_id: string | null = null): EngMessage => ({
    id: String(seq),
    seq,
    sender,
    teammate_id,
    body: "b",
    client_msg_id: null,
    created_at: "2026-01-01T00:00:00Z",
  });

  it("names senders from the roster", () => {
    const team = [{ id: "lead", name: "Teammate A", title: "Tech lead" }];
    assert.equal(senderName(msg(1, "candidate"), team), "You");
    assert.equal(senderName(msg(2, "teammate", "lead"), team), "Teammate A · Tech lead");
    assert.equal(senderName(msg(3, "teammate", "unknown"), team), "Team");
  });

  it("sorts by seq without mutating", () => {
    const input = [msg(3, "candidate"), msg(1, "teammate"), msg(2, "candidate")];
    assert.deepEqual(sortMessages(input).map((m) => m.seq), [1, 2, 3]);
    assert.equal(input[0].seq, 3);
  });
});

describe("packaging", () => {
  it("formats bytes", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2.0 KB");
    assert.equal(formatBytes(3 * 1024 * 1024), "3.00 MB");
  });

  it("labels every exclusion reason", () => {
    for (const r of ["ignored_folder", "system_file", "possible_secret", "nested_archive", "link"] as const) {
      assert.ok(exclusionLabel(r).length > 0);
    }
  });

  it("summarises a plan", () => {
    const plan = {
      root: "proj",
      included: [
        { path: "a.py", bytes: 100, change: "unchanged" as const },
        { path: "b.py", bytes: 100, change: "modified" as const },
      ],
      excluded: [],
      removedFromStarter: [],
      totalBytes: 200,
      problems: [],
    };
    assert.equal(packageSummary(plan), "2 files (200 B), 1 changed or added");
  });

  it("describes upload states", () => {
    assert.equal(uploadStatusText({ status: "accepted", rejection_detail: null }), "Accepted by Fydell's checks");
    assert.equal(uploadStatusText({ status: "rejected", rejection_detail: "too big" }), "Rejected: too big");
    assert.equal(uploadStatusText({ status: "initiated", rejection_detail: null }), "Started, not finished");
  });

  it("picks the newest accepted upload and verifies it against the local build", () => {
    const uploads = [upload({ id: "u2", status: "rejected" }), upload({ id: "u1", sha256: "ABC" })];
    assert.equal(submittableUpload([upload({ status: "rejected" })], null), null);
    const pkg = { sha256: "abc", bytes: 10, fileCount: 1, createdAt: "", uploadId: "u1", uploadStatus: "accepted", serverSha256: "abc" };
    assert.deepEqual(submittableUpload(uploads, { lastPackage: pkg }), { upload: uploads[1], verifiedLocally: true });
    assert.equal(submittableUpload(uploads, { lastPackage: { ...pkg, sha256: "def" } })?.verifiedLocally, false);
    assert.equal(submittableUpload(uploads, { lastPackage: { ...pkg, uploadId: "other" } })?.verifiedLocally, false);
    assert.equal(submittableUpload(uploads, null)?.verifiedLocally, false);
  });
});

describe("local handoff drafts", () => {
  const local = (body: string, baseRevision: number, accepted = false) => ({ body, baseRevision, savedAt: "t", accepted });

  it("uses the server copy when nothing unsent is on this computer", () => {
    assert.deepEqual(reconcileDraft({ body: "a", revision: 2 }, undefined), { body: "a", revision: 2, status: "saved", conflict: null });
    assert.equal(reconcileDraft({ body: "a", revision: 3 }, local("old", 2, true)).body, "a");
  });

  it("treats text the server already has as accepted", () => {
    assert.equal(reconcileDraft({ body: "same", revision: 4 }, local("same", 3)).status, "saved");
  });

  it("restores and resends unsent text when the server copy has not moved", () => {
    const r = reconcileDraft({ body: "a", revision: 2 }, local("a and more", 2));
    assert.deepEqual(r, { body: "a and more", revision: 2, status: "local", conflict: null });
    assert.equal(reconcileDraft(undefined, local("first words", 0)).status, "local");
  });

  it("keeps unsent text and shows both when the answer changed elsewhere", () => {
    const r = reconcileDraft({ body: "from the website", revision: 5 }, local("from the desktop", 3));
    assert.equal(r.status, "conflict");
    assert.equal(r.body, "from the desktop");
    assert.deepEqual(r.conflict, { body: "from the website", revision: 5 });
  });
});

describe("handoff", () => {
  const prompts = [
    { field: "what_changed", label: "What changed", help: "" },
    { field: "testing", label: "Testing", help: "" },
    { field: "risks", label: "Risks", help: "" },
  ];

  it("adds the optional AI-use field", () => {
    assert.deepEqual(handoffFields(prompts), ["what_changed", "testing", "risks", AI_USE_FIELD]);
  });

  it("requires what changed and caps length", () => {
    assert.deepEqual(handoffBlockers(prompts, { what_changed: "  " }), ["Answer “What changed”."]);
    assert.deepEqual(handoffBlockers(prompts, { what_changed: "Fixed it" }), []);
    assert.equal(handoffBlockers(prompts, { what_changed: "x", testing: "y".repeat(8001) }).length, 1);
  });
});

describe("receipt and report", () => {
  it("marks delayed processing", () => {
    assert.equal(receiptProgress("queued").delayed, false);
    assert.equal(receiptProgress("blocked").delayed, true);
    assert.equal(receiptProgress("ready").index, 4);
  });

  it("labels citations", () => {
    assert.equal(citationLabel({ kind: "file", path: "a.py", lineStart: 3, lineEnd: 9 }), "a.py:3–9");
    assert.equal(citationLabel({ kind: "file", path: "a.py", lineStart: 3, lineEnd: 3 }), "a.py:3");
    assert.equal(citationLabel({ kind: "file", path: "a.py", lineStart: null, lineEnd: null }), "a.py");
    assert.equal(citationLabel({ kind: "handoff", field: "next_steps" }), "Handoff: next steps");
    assert.equal(citationLabel({ kind: "other" }), "Other evidence");
  });

  it("picks the setup command for the OS", () => {
    const c = { windows: "py preflight.py", unix: "python3 preflight.py" };
    assert.equal(setupCommandFor("windows", c), "py preflight.py");
    assert.equal(setupCommandFor("macos", c), "python3 preflight.py");
  });
});
