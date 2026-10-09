/**
 * Browser walk of the engineer journey on the shared dev server, signed in as
 * the walk engineer. Credentials come from %TEMP%\fydell-walk.txt (whitespace
 * separated `engineer` and `password` lines) and are never printed; errors are
 * redacted before logging. Screenshots go to .scratch/acceptance/engineer/walk/.
 *
 * Run a stage: node scripts/accept-engineer-walk.mjs <stage>
 *   analysis   run Builder Analysis and open the report and evidence ledger
 *   reanalyze  analyze p-retry again at the same revision under the current rules
 *   intake     import a public GitHub repository with a contribution, and upload a ZIP
 *   project    add context, confirm the contribution, publish a version
 *   rerun      run Builder Analysis again and compare with the earlier run
 *   share      curate the profile, share it, open it anonymously, revoke it
 *   receipts   receipts list, detail and export
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { zipSync, strToU8 } from "fflate";

const BASE = "http://localhost:3000";
const OUT = join(process.cwd(), ".scratch", "acceptance", "engineer", "walk");
mkdirSync(OUT, { recursive: true });
const PRETRY = "1ace0c9d-b194-4519-a97c-57293e506569";
const GH_REPO = "jonschlinkert/is-number";
const GH_STATEMENT = "I added the integer checks and the tests for numeric strings.";
const UPLOAD_NAME = "walk-outbox-relay";

const lines = readFileSync(join(process.env.TEMP ?? "", "fydell-walk.txt"), "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
const walkValue = (tag) => lines.find((l) => l.startsWith(tag + " "))?.trim().split(/\s+/)[1] ?? "";
const SECRET = walkValue("password");

function redact(text) {
  return String(text)
    .split("\n")[0]
    .replaceAll(SECRET, "[redacted]")
    .replace(/(eyJ[\w.-]{8,}|base64-[\w-]{8,}|(sb-[\w-]+|fydell_[\w]+)=[^;\s]+)/g, "[redacted]")
    .slice(0, 300);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail: redact(detail) });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `  (${redact(detail)})` : ""}`);
}

async function signIn() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(60000);
  const problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${redact(m.text()).slice(0, 160)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500 || r.status() === 429) problems.push(`${r.status()} ${r.url().replace(BASE, "").split("?")[0]}`);
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const reached = await page.goto(`${BASE}/login`, { waitUntil: "networkidle" }).then(() => true, () => false);
    if (!reached) {
      await page.waitForTimeout(15000);
      continue;
    }
    await page.getByLabel("Email").fill(walkValue("engineer"));
    await page.locator("#login-password").fill(SECRET);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const left = await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 }).then(() => true, () => false);
    if (left) break;
    if (attempt === 2) throw new Error("could not sign in");
  }
  return { browser, context, page, problems };
}

async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
  console.log(`     screenshot ${name}.png`);
}

async function dump(page) {
  return page.evaluate(() => {
    const t = (el) => (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 90);
    const root = document.querySelector("main") ?? document.body;
    return {
      url: location.pathname + location.search,
      buttons: [...root.querySelectorAll("button")].map(t).filter(Boolean),
      dialogs: [...document.querySelectorAll("[role=dialog]")].map(t),
      fields: [...root.querySelectorAll("input:not([type=hidden]), textarea")].map((i) => `${i.tagName.toLowerCase()}#${i.id} ${i.getAttribute("aria-label") ?? ""} ${i.getAttribute("placeholder") ?? ""}`.trim()),
    };
  });
}

/** The shared dev server can restart; a dropped request is retried, not fatal. */
async function getJson(page, path) {
  for (let i = 0; i < 10; i++) {
    try {
      const r = await page.request.get(`${BASE}${path}`, { timeout: 120000 });
      if (r.status() < 500) return await r.json();
    } catch {
      // connection reset while the server restarts
    }
    await page.waitForTimeout(3000);
  }
  throw new Error(`GET ${path} kept failing`);
}

async function waitForRun(page) {
  for (let i = 0; i < 120; i++) {
    const a = (await getJson(page, "/api/profile/analysis")).analysis;
    if (a && a.status !== "running") return a;
    await page.waitForTimeout(2000);
  }
  throw new Error("analysis still running");
}

async function previewRepo(page, repo) {
  await page.goto(`${BASE}/app/candidate/work-record`, { waitUntil: "networkidle" });
  await page.locator("#github-input").fill(repo);
  await page.getByRole("button", { name: "Find repositories" }).click();
  await page.getByRole("button", { name: /^Import 1 repository$/ }).waitFor({ timeout: 90000 });
}

async function runImport(page, repo) {
  const startButton = page.getByRole("button", { name: /^Import 1 repository$/ });
  if (await startButton.count()) await startButton.click();
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(2000);
    const jobs = (await getJson(page, "/api/passport/imports")).jobs ?? [];
    // The same owner, repository, revision and rules resolve to one job, so a repeat import returns the finished one.
    const job = jobs.find((j) => j.repository.toLowerCase() === repo.toLowerCase());
    if (job && ["succeeded", "failed", "cancelled"].includes(job.state)) return job;
    if (job?.needsWorker) {
      await page.request.post(`${BASE}/api/passport/imports/${job.id}`, { data: { action: "resume" }, headers: { Origin: BASE } }).catch(() => undefined);
    }
  }
  throw new Error(`${repo}: import did not finish`);
}

async function projectHref(page, name) {
  await page.goto(`${BASE}/app/candidate/work-record`, { waitUntil: "networkidle" });
  return page.locator(`main a[href^="/app/candidate/projects/"]`, { hasText: name }).first().getAttribute("href");
}

function uploadZip() {
  const code = [
    "const delivered = new Set<string>();",
    "",
    "export async function relay(event: { id: string; body: string }, send: (b: string) => Promise<void>) {",
    "  if (delivered.has(event.id)) return;",
    "  for (let attempt = 0; attempt < 5; attempt++) {",
    "    try {",
    "      await send(event.body);",
    "      delivered.add(event.id);",
    "      return;",
    "    } catch (error) {",
    "      console.warn('relay failed', attempt, error);",
    "      await new Promise((r) => setTimeout(r, 2 ** attempt * 200));",
    "    }",
    "  }",
    "  throw new Error(`relay gave up on ${event.id}`);",
    "}",
    "",
  ].join("\n");
  const test = [
    "import { describe, it, expect, vi } from 'vitest';",
    "import { relay } from './relay';",
    "describe('relay', () => {",
    "  it('gives up after five failures', async () => {",
    "    vi.useFakeTimers();",
    "    const p = relay({ id: 'e1', body: 'x' }, async () => { throw new Error('down'); });",
    "    const assertion = expect(p).rejects.toThrow('relay gave up');",
    "    await vi.runAllTimersAsync();",
    "    await assertion;",
    "  });",
    "});",
    "",
  ].join("\n");
  return Buffer.from(
    zipSync({
      "package.json": strToU8(JSON.stringify({ name: UPLOAD_NAME, scripts: { test: "vitest run" }, devDependencies: { vitest: "^2.0.0", typescript: "^5.5.0" } })),
      "README.md": strToU8(`# ${UPLOAD_NAME}\n\nSynthetic outbox relay for the engineer walk.\n`),
      "src/relay.ts": strToU8(code),
      "src/relay.test.ts": strToU8(test),
    }),
  );
}

const state = { file: join(OUT, "walk-state.json") };
function loadState() {
  try {
    return JSON.parse(readFileSync(state.file, "utf8"));
  } catch {
    return {};
  }
}
function saveState(patch) {
  writeFileSync(state.file, JSON.stringify({ ...loadState(), ...patch }, null, 2));
}

const stages = {
  async analysis({ page }) {
    await page.goto(`${BASE}/app/candidate/reports`, { waitUntil: "networkidle" });
    await shot(page, "01-reports-before-run");
    await page.getByRole("button", { name: "Run again" }).click();
    await page.waitForTimeout(1500);
    const run = await waitForRun(page);
    check("Builder Analysis run completes", run.status === "complete", `status=${run.status}`);
    saveState({ firstRun: run.id });
    await page.goto(`${BASE}/app/candidate/reports`, { waitUntil: "networkidle" });
    await shot(page, "02-report-with-findings");
    const cited = (run.report?.ledger ?? []).filter((e) => e.source.snapshotId === PRETRY);
    check("the report's evidence ledger cites p-retry at a stored version", cited.length > 0 && cited.every((e) => typeof e.source.snapshotVersion === "number"), JSON.stringify(cited.map((e) => e.source.snapshotVersion)));
    const area = page.locator("#ba-dimension-quality");
    if (await area.count()) {
      await area.scrollIntoViewIfNeeded();
      await shot(page, "03-evidence-ledger", false);
    }
  },

  async reanalyze({ page }) {
    await previewRepo(page, "sindresorhus/p-retry");
    await shot(page, "04-scope-preview-p-retry");
    const job = await runImport(page, "sindresorhus/p-retry");
    check("p-retry analyzed again at the same revision under the current rules", job.state === "succeeded", JSON.stringify({ state: job.state, analysisVersion: job.analysisVersion, reused: job.result?.reusedExistingVersion }));
    await page.goto(`${BASE}/app/candidate/projects/${PRETRY}`, { waitUntil: "networkidle" });
    await shot(page, "05-p-retry-current-report");
    const body = await page.locator("main").innerText();
    check("the project page links the earlier analysis", /analyzed \d+ times/.test(body), body.match(/This revision has been analyzed[^\n]*/)?.[0] ?? "no line");
    await page.goto(`${BASE}/app/candidate/projects/${PRETRY}?version=1`, { waitUntil: "networkidle" });
    await shot(page, "06-p-retry-stored-version-1");
    const v1 = await page.locator("main").innerText();
    check("version 1 opens as it was recorded, under github-extract-v4", /analysis version 1/.test(v1) && /github-extract-v4/.test(v1), v1.slice(0, 160).replace(/\s+/g, " "));
    const link = page.getByRole("link", { name: "Open the current report" });
    check("the stored version links back to the current report", (await link.count()) === 1);
  },

  async intake({ page }) {
    await previewRepo(page, GH_REPO);
    await page.getByRole("button", { name: "Show included and excluded files" }).click().catch(() => undefined);
    await page.getByPlaceholder("What did you build or change here?", { exact: false }).fill(GH_STATEMENT);
    await shot(page, "07-github-scope-preview-with-contribution");
    const job = await runImport(page, GH_REPO);
    check("public GitHub import with a contribution succeeds", job.state === "succeeded", JSON.stringify({ state: job.state, error: job.errorCode }));
    const ghHref = await projectHref(page, "is-number");
    check("the imported repository is listed in the work record", !!ghHref, ghHref ?? "missing");
    await shot(page, "08-work-record-after-import");
    saveState({ ghHref });

    await page.getByText("Upload a project instead").click();
    await page.locator('input[type=file][accept*="zip"]').setInputFiles({ name: `${UPLOAD_NAME}.zip`, mimeType: "application/zip", buffer: uploadZip() });
    await page.getByPlaceholder("payments-service").fill(UPLOAD_NAME);
    await page.getByRole("button", { name: "Review files" }).click();
    await page.getByRole("button", { name: "Analyze and save" }).waitFor({ timeout: 90000 });
    await shot(page, "09-upload-scope-preview");
    await page.getByRole("button", { name: "Analyze and save" }).click();
    await page.waitForURL((u) => u.pathname.startsWith("/app/candidate/projects/"), { timeout: 120000 }).catch(() => undefined);
    await page.waitForLoadState("networkidle");
    const upHref = new URL(page.url()).pathname.startsWith("/app/candidate/projects/") ? new URL(page.url()).pathname : await projectHref(page, UPLOAD_NAME);
    check("the uploaded ZIP is analyzed and saved", !!upHref, upHref ?? "missing");
    if (upHref) {
      await page.goto(`${BASE}${upHref}`, { waitUntil: "networkidle" });
      const text = await page.locator("main").innerText();
      check("the upload report shows retry and idempotency findings", /retr/i.test(text) && /(repeat|duplicate|already|idempot)/i.test(text), text.slice(0, 200).replace(/\s+/g, " "));
      await shot(page, "10-upload-report");
    }
    saveState({ upHref });
  },

  async project({ page }) {
    const { ghHref } = loadState();
    if (!ghHref) throw new Error("run the intake stage first");
    await page.goto(`${BASE}${ghHref}`, { waitUntil: "networkidle" });
    await shot(page, "11-github-project-report");
    const text = await page.locator("main").innerText();
    check("the contribution written at import shows on the project", text.includes(GH_STATEMENT));

    const addContext = page.getByRole("button", { name: "Add context or a correction" }).first();
    if (await addContext.count()) {
      await addContext.click();
      const box = page.locator("[role=dialog] textarea, main textarea").first();
      await box.fill("The integer check was written to reject numeric strings with whitespace.");
      await shot(page, "12-add-context-form", false);
      const save = page.getByRole("button", { name: /^(Save|Add note|Save note|Add context)$/ }).first();
      await save.click();
      await page.waitForTimeout(2500);
      await shot(page, "13-context-added");
      const after = await page.locator("main").innerText();
      check("context on a finding is saved", /whitespace/.test(after), "note text not shown");
    } else {
      check("a finding offers 'Add context or a correction'", false, "no findings on this project");
    }

    await page.getByRole("button", { name: "Confirm my contribution" }).click();
    await page.waitForTimeout(2500);
    await shot(page, "14-contribution-confirmed");
    const confirmed = await page.locator("main").innerText();
    check("the import-time contribution confirms without retyping", !/Write what your contribution was/.test(confirmed) && /confirmed/i.test(confirmed), confirmed.match(/[^\n]*onfirm[^\n]*/)?.[0] ?? "");
    const publish = page.getByRole("button", { name: "Publish a version" });
    if (await publish.isEnabled()) {
      await publish.click();
      await page.waitForTimeout(3000);
    }
    await shot(page, "15-version-published");
    const published = await page.locator("main").innerText();
    check("a version is published", /Published version \d+/.test(published), published.match(/[^\n]*ublished[^\n]*/)?.[0] ?? "");
  },

  async rerun({ page }) {
    await page.goto(`${BASE}/app/candidate/reports`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Run again" }).click();
    await page.waitForTimeout(1500);
    const run = await waitForRun(page);
    check("a second run completes after the sources changed", run.status === "complete", `status=${run.status}`);
    const cited = (run.report?.ledger ?? []).filter((e) => e.source.snapshotId === PRETRY);
    check("the new run cites p-retry at its newest stored version", cited.length > 0 && cited.every((e) => (e.source.snapshotVersion ?? 0) >= 2), JSON.stringify(cited.map((e) => e.source.snapshotVersion)));
    await page.goto(`${BASE}/app/candidate/reports`, { waitUntil: "networkidle" });
    await shot(page, "16-report-after-rerun");
    const history = page.getByRole("heading", { name: "Run history" });
    await history.scrollIntoViewIfNeeded();
    await shot(page, "17-run-history", false);
    await page.getByRole("button", { name: "Compare with current" }).first().click();
    await page.waitForTimeout(3000);
    await shot(page, "18-run-comparison", false);
    const text = await page.locator("main").innerText();
    check("comparison shows what changed between runs", /(added|removed|changed|same inputs|different)/i.test(text));
  },

  async share({ page, browser }) {
    await page.goto(`${BASE}/app/candidate/work-record`, { waitUntil: "networkidle" });
    const feature = page.getByRole("button", { name: /^Feature Is Number$/i });
    if (await feature.count()) await feature.click();
    await page.waitForTimeout(2000);
    await shot(page, "19-curate-profile");
    await page.goto(`${BASE}/app/candidate/profile`, { waitUntil: "networkidle" });
    await shot(page, "20-profile");
    const profile = await page.locator("main").innerText();
    check("the curated profile shows the imported project", /is.?number/i.test(profile));

    await page.goto(`${BASE}/app/candidate/work-record#share`, { waitUntil: "networkidle" });
    await page.locator("#share-label").fill("Walk share");
    await shot(page, "21-share-form");
    await page.getByRole("button", { name: "Create share link" }).click();
    await page
      .waitForFunction(() => [...document.querySelectorAll("input, a")].some((el) => /\/p\/[\w-]{10,}/.test(el.value ?? el.href ?? "")) || /https?:\/\/\S+\/p\/[\w-]{10,}/.test(document.body.innerText), null, { timeout: 60000 })
      .catch(() => undefined);
    const shareUrl = await page.evaluate(() => {
      const fromInput = [...document.querySelectorAll("input")].map((i) => i.value).find((v) => /\/p\/[\w-]{10,}/.test(v));
      const fromLink = [...document.querySelectorAll("a")].map((a) => a.href).find((h) => /\/p\/[\w-]{10,}/.test(h));
      const fromText = (document.body.innerText.match(/https?:\/\/\S+\/p\/[\w-]{10,}/) ?? [])[0];
      return fromInput ?? fromLink ?? fromText ?? null;
    });
    check("a share link is created", !!shareUrl, "no link found");
    await shot(page, "22-share-created");
    if (!shareUrl) return;
    const path = new URL(shareUrl).pathname;

    const anon = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
    await anon.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await anon.screenshot({ path: join(OUT, "23-anonymous-view.png"), fullPage: true });
    console.log("     screenshot 23-anonymous-view.png");
    const html = await anon.content();
    check("an anonymous visitor sees the shared profile", /is-number|p-retry|ledger-sync/i.test(html));
    const leaked = ["Revoke", "Remove project", "Edit profile", "Run again", "/app/candidate/receipts"].filter((s) => html.includes(s));
    check("the anonymous view has no owner controls", leaked.length === 0, leaked.join(", "));

    await page.goto(`${BASE}/app/candidate/work-record#share`, { waitUntil: "networkidle" });
    // Revoke asks for an inline confirmation. Every walk share is revoked, including any left by an earlier run.
    for (let i = 0; i < 6; i++) {
      const revoke = page.getByRole("button", { name: "Revoke Walk share", exact: true });
      if (!(await revoke.count())) break;
      await revoke.first().click();
      await page.getByRole("button", { name: "Revoke link" }).first().click();
      await page.waitForTimeout(2000);
    }
    await shot(page, "24-share-revoked");
    await anon.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await anon.screenshot({ path: join(OUT, "25-anonymous-after-revoke.png"), fullPage: true });
    console.log("     screenshot 25-anonymous-after-revoke.png");
    const after = await anon.locator("body").innerText();
    check("after revoking, the link no longer shows the profile", /revoked/i.test(after) && !/is-number/i.test(after), after.slice(0, 120).replace(/\s+/g, " "));
  },

  async receipts({ page }) {
    await page.goto(`${BASE}/app/candidate/receipts`, { waitUntil: "networkidle" });
    await shot(page, "26-receipts-list");
    const hrefs = await page.locator('main a[href^="/app/candidate/receipts/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check("receipts are listed", hrefs.length > 0, `count=${hrefs.length}`);
    if (!hrefs.length) return;
    const listText = await page.locator("main").innerText();
    const snapshotIndex = await page.locator('main a[href^="/app/candidate/receipts/"]').evaluateAll((as) => as.findIndex((a) => /(github|upload|snapshot|import)/i.test(a.closest("li, tr, article, div")?.textContent ?? "")));
    const picks = [...new Set([0, Math.max(snapshotIndex, 0)])];
    for (const [n, i] of picks.entries()) {
      await page.goto(`${BASE}${hrefs[i]}`, { waitUntil: "networkidle" });
      await shot(page, n === 0 ? "27-receipt-detail" : "27b-receipt-detail-snapshot");
      const text = await page.locator("main").innerText();
      check(`receipt ${n + 1} states what was accepted, its processing state and integrity`, /(matches|differs)/i.test(text) && /(Current|Superseded|analyzed again)/i.test(text), text.slice(0, 160).replace(/\s+/g, " "));
      check(`receipt ${n + 1} never claims tests were run or authorship verified`, !/Tests (executed|passed)\s*Observed/i.test(text) && !/Attribution supported\s*Observed/i.test(text) && !/authorship (was )?verified/i.test(text));
      const href = await page.getByRole("link", { name: /(Download|Export)/i }).first().getAttribute("href").catch(() => null);
      check(`receipt ${n + 1} offers an export`, !!href, href ?? "no export link");
      if (!href) continue;
      const res = await page.request.get(`${BASE}${href}`);
      const body = await res.json().catch(() => null);
      writeFileSync(join(OUT, n === 0 ? "28-receipt-export.json" : "28b-receipt-export-snapshot.json"), JSON.stringify(body, null, 2));
      check(`receipt ${n + 1} export is a private JSON attachment with the receipt and a time statement`,
        res.status() === 200 && /attachment/.test(res.headers()["content-disposition"] ?? "") && /no-store/.test(res.headers()["cache-control"] ?? "") && !!body?.receipt?.id && !!body?.timeStatement,
        `status=${res.status()}`);
    }
    check("the receipts list names each artifact", /(Builder Analysis|snapshot|upload)/i.test(listText));
  },
};

const stage = process.argv[2];
if (!stages[stage]) {
  console.log(`Choose a stage: ${Object.keys(stages).join(", ")}`);
  process.exit(2);
}
let s;
try {
  s = await signIn();
  await stages[stage](s);
} catch (error) {
  check(`stage ${stage} finished`, false, error instanceof Error ? error.message : String(error));
  if (s) {
    console.log(redact(JSON.stringify(await s.page.evaluate(() => location.pathname).catch(() => ""))));
    console.log(JSON.stringify(await dump(s.page).catch(() => null)));
    await shot(s.page, `error-${stage}`).catch(() => undefined);
  }
}
if (s) {
  // A refused connection is the shared server being restarted by its watchdog, not the page.
  const environment = s.problems.filter((p) => /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|\/api\/eng\/attempts\/|\/api\/notifications/.test(p));
  const problems = s.problems.filter((p) => !/favicon/.test(p) && !environment.includes(p));
  if (environment.length) console.log(`     note: ${environment.length} request(s) refused while the dev server restarted`);
  check(`stage ${stage}: no server or console errors`, problems.length === 0, problems.join("; "));
  await s.browser.close();
}
writeFileSync(join(OUT, `results-${stage}.json`), JSON.stringify({ stage, ranAt: new Date().toISOString(), results }, null, 2));
process.exit(results.some((r) => !r.ok) ? 1 : 0);
