/**
 * test-orphans-grind-demo — DEMO-01..DEMO-08 (orphaned demo requirements).
 *
 * Run: npx tsx scripts/test-orphans-grind-demo.ts
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
  const t = new Harness("test-orphans-grind-demo");

  // ---------- DEMO-01: complete product story ----------
  const { DEMO_STORY_BEATS, validateStoryBeats, beatIndex } = await import(
    "@/lib/demo/story"
  );
  t.eq(DEMO_STORY_BEATS.length, 8, "DEMO-01: story has 8 beats");
  t.eq(
    DEMO_STORY_BEATS.map((b) => b.id),
    [
      "github_finding",
      "passport",
      "desktop_preview",
      "code_change",
      "teammate_update",
      "submission",
      "employer_report",
      "sharing",
    ],
    "DEMO-01: beats in canonical order"
  );
  t.eq(validateStoryBeats(DEMO_STORY_BEATS), [], "DEMO-01: canonical story validates clean");
  t.ok(validateStoryBeats([]).length > 0, "DEMO-01: empty story rejected");
  t.ok(
    validateStoryBeats([...DEMO_STORY_BEATS].reverse()).length > 0,
    "DEMO-01: reordered story rejected"
  );
  t.ok(
    validateStoryBeats(DEMO_STORY_BEATS.slice(0, 7)).length > 0,
    "DEMO-01: story missing the sharing beat rejected"
  );
  t.eq(beatIndex("employer_report"), 6, "DEMO-01: beatIndex locates employer report");
  t.eq(beatIndex("nope"), -1, "DEMO-01: beatIndex -1 for unknown beat");

  // ---------- DEMO-02 / DEMO-03: inspectable details, labeled fixtures ----------
  const {
    SAMPLE_DATA_LABEL,
    DEMO_CANDIDATE_ID,
    allDemoFixtures,
    assertAllFixturesLabeled,
    demoScanDisclaimer,
    assertDemoCopyHonest,
    DEMO_FINDING,
    DEMO_TESTS,
    DEMO_THREAD,
    DEMO_SHARING,
    makeFixtureMeta,
  } = await import("@/lib/demo/fixtures");

  t.ok(SAMPLE_DATA_LABEL.length > 0, "DEMO-03: sample-data label defined");
  t.eq(DEMO_CANDIDATE_ID, "candidate01", "DEMO-03: deterministic Candidate01 identity");
  t.eq(assertAllFixturesLabeled(allDemoFixtures()), [], "DEMO-02/03: all fixtures carry the label");
  t.ok(
    assertAllFixturesLabeled([{ meta: undefined as never }]).length > 0,
    "DEMO-03: unlabeled fixture rejected"
  );
  t.ok(
    assertAllFixturesLabeled([{ meta: { ...makeFixtureMeta(), label: "Real data" as never } }])
      .length > 0,
    "DEMO-03: wrong label rejected"
  );
  t.ok(
    demoScanDisclaimer().toLowerCase().includes("fictional") &&
      demoScanDisclaimer().toLowerCase().includes("not a live repository analysis"),
    "DEMO-03: disclaimer states fictional, not live"
  );
  t.ok(
    assertDemoCopyHonest("We scanned your repository and found 3 issues").length > 0,
    "DEMO-03: 'we scanned your repository' copy rejected"
  );
  t.ok(
    assertDemoCopyHonest("This is a fictional example scan for demonstration only").length === 0,
    "DEMO-03: honest copy accepted"
  );
  // DEMO-02 inspectability
  t.ok(DEMO_FINDING.citation.excerpt.length > 0, "DEMO-02: finding has openable source citation");
  t.ok(
    DEMO_FINDING.citation.startLine > 0 && DEMO_FINDING.citation.endLine >= DEMO_FINDING.citation.startLine,
    "DEMO-02: citation has valid line range"
  );
  t.eq(
    DEMO_TESTS.map((x) => x.status).sort(),
    ["failing", "passing"],
    "DEMO-02: fixtures include passing and failing tests"
  );
  t.ok(DEMO_THREAD.messages.length >= 2, "DEMO-02: thread is readable with multiple messages");
  t.ok(DEMO_SHARING.fields.includes("evidence"), "DEMO-02: sharing preview covers evidence field");

  // ---------- DEMO-04: reuse real UI components via adapters ----------
  const { adaptDemoPassport, adaptDemoReportClaims, adaptDemoThread, assertAdaptersComplete } =
    await import("@/lib/demo/adapters");
  t.eq(assertAdaptersComplete(), [], "DEMO-04: adapters complete against real component contracts");
  const passport = adaptDemoPassport();
  t.ok(
    passport.headline.includes(SAMPLE_DATA_LABEL),
    "DEMO-04: passport adapter carries the sample label into the real PassportData contract"
  );
  t.ok(passport.projects[0].evidence.length === 1, "DEMO-04: passport adapter maps the finding to evidence");
  const claims = adaptDemoReportClaims();
  t.ok(
    claims.some((c) => c.tone === "risk" && c.text.includes("failing")),
    "DEMO-04: failing test becomes a risk-toned claim in the real claim contract"
  );
  t.ok(
    claims.every((c) => c.limitation && c.limitation.length > 0),
    "DEMO-04: every adapted claim states its limitation"
  );
  const threadProps = adaptDemoThread();
  t.eq(threadProps.messages.length, DEMO_THREAD.messages.length, "DEMO-04: thread adapter maps all messages");
  t.ok(
    threadProps.banner !== null && threadProps.banner.includes("Sample data"),
    "DEMO-04: thread adapter sets the sample-data banner"
  );

  // ---------- DEMO-06: clean conversion ----------
  const { buildConversionContext, sanitizeReturnRoute } = await import("@/lib/demo/conversion");
  const conv = buildConversionContext({
    audience: "employer",
    returnRoute: "/demo#report",
    demoEvidenceIds: ["demo-evidence-01"],
    demoNamespace: "demo_public",
  });
  t.eq(conv.context.audience, "employer", "DEMO-06: audience retained");
  t.eq(conv.context.returnRoute, "/demo#report", "DEMO-06: useful route context retained");
  t.eq(conv.context.evidence, [], "DEMO-06: no fictional evidence carried into the live account");
  t.eq(conv.context.namespace, null, "DEMO-06: demo namespace dropped");
  t.eq(conv.droppedEvidence, ["demo-evidence-01"], "DEMO-06: dropped evidence reported explicitly");
  t.eq(sanitizeReturnRoute("https://evil.example/x"), "/get-started", "DEMO-06: absolute URL rejected");
  t.eq(sanitizeReturnRoute("//evil.example"), "/get-started", "DEMO-06: protocol-relative URL rejected");
  t.eq(sanitizeReturnRoute("/admin/secret"), "/get-started", "DEMO-06: non-allowlisted route rejected");

  // ---------- DEMO-07: explain the desktop experience ----------
  const {
    DESKTOP_CAPABILITIES,
    DESKTOP_PLATFORMS,
    UNSUPPORTED_PLATFORM_NOTE,
    validatePreviewLabels,
  } = await import("@/lib/demo/desktop-preview");
  t.eq(validatePreviewLabels(DESKTOP_CAPABILITIES), [], "DEMO-07: every capability labeled simulated vs requires_install");
  t.ok(
    validatePreviewLabels([{ id: "x", label: "X", kind: "mystery" as never, detail: "d" }]).length > 0,
    "DEMO-07: unlabeled capability rejected"
  );
  t.ok(
    DESKTOP_CAPABILITIES.some((c) => c.kind === "simulated") &&
      DESKTOP_CAPABILITIES.some((c) => c.kind === "requires_install"),
    "DEMO-07: preview covers both simulated and requires-install capabilities"
  );
  t.eq(DESKTOP_PLATFORMS.length, 1, "DEMO-07: exactly one supported platform claimed");
  t.eq(DESKTOP_PLATFORMS[0].os, "linux", "DEMO-07: Linux is the supported system");
  t.eq(
    [...DESKTOP_PLATFORMS[0].formats].sort(),
    [".AppImage", ".deb", ".rpm"],
    "DEMO-07: download names installer formats"
  );
  t.ok(
    DESKTOP_PLATFORMS[0].installNotes.length > 20,
    "DEMO-07: installation needs are named"
  );
  t.ok(
    UNSUPPORTED_PLATFORM_NOTE.includes("macOS") && UNSUPPORTED_PLATFORM_NOTE.includes("Windows"),
    "DEMO-07: unsupported systems are named honestly, not implied"
  );

  // ---------- DEMO-08: real sample run gate (P1) ----------
  const { checkSampleRunEligibility, currentPreconditions } = await import(
    "@/lib/demo/sample-run"
  );
  const gate = checkSampleRunEligibility(currentPreconditions());
  t.ok(gate.ok === false, "DEMO-08: sample run not offered before verifications");
  if (gate.ok === false) {
    t.eq(gate.missing.length, 3, "DEMO-08: all three missing preconditions named");
  }
  t.eq(
    checkSampleRunEligibility({
      costLimitsVerified: true,
      abuseProtectionsVerified: true,
      runtimeReliabilityVerified: true,
    }),
    { ok: true },
    "DEMO-08: gate opens only when all three verifications hold"
  );
  const partial = checkSampleRunEligibility({
    costLimitsVerified: true,
    abuseProtectionsVerified: false,
    runtimeReliabilityVerified: true,
  });
  t.ok(
    partial.ok === false &&
      (partial as { missing: string[] }).missing.includes("abuse protections"),
    "DEMO-08: single missing precondition keeps the gate closed"
  );

  process.exit(t.summary());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
