/**
 * Auth-flow probe against a running Next server.
 *
 * This is not a substitute for a credentialed signup against fydell-dev.
 * It proves what an anonymous browser actually observes: public pages, next=
 * preservation, route protection when UI preview is off, and the API
 * responses that do not require a service-role key.
 *
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3017 npx tsx scripts/test-auth-flows.ts
 */
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

let failures = 0;

function pass(label: string, detail = ""): void {
  console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label: string, detail: string): void {
  failures += 1;
  console.error(`FAIL ${label} — ${detail}`);
}

async function textSample(page: Page, n = 240): Promise<string> {
  const body = await page.locator("body").innerText().catch(() => "");
  return body.replace(/\s+/g, " ").trim().slice(0, n);
}

async function goto(page: Page, path: string) {
  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  return {
    status: response?.status() ?? 0,
    url: page.url(),
    sample: await textSample(page),
  };
}

async function jsonPost(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    /* keep raw */
  }
  const error =
    parsed && typeof parsed === "object" && "error" in parsed
      ? String((parsed as { error: unknown }).error)
      : undefined;
  const ok =
    parsed && typeof parsed === "object" && "ok" in parsed
      ? Boolean((parsed as { ok: unknown }).ok)
      : undefined;
  return { status: res.status, error, ok, location: res.headers.get("location") };
}

function looksLikePreviewFixture(sample: string): boolean {
  return /Example Manufacturing|Sample Owner|Avery Sample|Frankie Synthetic/i.test(sample);
}

async function main() {
  console.log(`\nAuth flow probe against ${BASE}\n`);

  try {
    await fetch(BASE, { redirect: "manual" });
  } catch {
    console.error(
      `UNREACHABLE ${BASE}. Reuse npm run dev:preview on :3000, or start an isolated server.`
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  // --- Public pages ---
  for (const path of [
    "/signup",
    "/login",
    "/forgot-password",
    "/auth/link-invalid",
    "/auth/confirmation-required",
  ]) {
    const hit = await goto(page, path);
    if (hit.status >= 400) {
      fail(`${path} loads`, `HTTP ${hit.status}`);
    } else if (!hit.sample) {
      fail(`${path} loads`, "empty body");
    } else {
      pass(`${path} loads`, `HTTP ${hit.status}`);
    }
  }

  const signup = await goto(page, "/signup");
  if (/Create your Fydell account|Create account/i.test(signup.sample)) {
    pass("signup form is present");
  } else {
    fail("signup form is present", `body: ${signup.sample}`);
  }

  const login = await goto(page, "/login");
  if (/Sign in to Fydell|Continue to your workspace/i.test(login.sample)) {
    pass("login form is present");
  } else {
    fail("login form is present", `body: ${login.sample}`);
  }

  // --- next= preservation ---
  const nextLogin = await goto(page, "/login?next=%2Fapp%2Femployer%2Fcandidates");
  if (nextLogin.url.includes("next=") && nextLogin.url.includes("candidates")) {
    pass("login keeps next= in the URL");
  } else {
    fail("login keeps next= in the URL", nextLogin.url);
  }

  const evil = await goto(page, "/login?next=https://evil.example");
  const evilHref = await page.locator('a[href*="signup"]').first().getAttribute("href");
  if (evilHref && /evil/i.test(evilHref)) {
    fail("login rejects external next=", `signup link ${evilHref}`);
  } else {
    pass("login rejects external next=", `signup href=${evilHref ?? "none"}`);
  }
  void evil;

  // --- Route protection (must not be UI preview fixtures) ---
  const employer = await goto(page, "/app/employer");
  if (looksLikePreviewFixture(employer.sample)) {
    console.log(
      "SKIP anonymous /app/employer protection — this process is FYDELL_UI_PREVIEW=1 and serves synthetic workspace data to anyone. That is a design-preview bypass, not production auth. A second Next dev server could not be started because Next 16 locks the existing :3000 instance."
    );
  } else if (employer.url.includes("/login")) {
    pass("anonymous /app/employer redirects to login", employer.url.replace(BASE, ""));
  } else {
    fail(
      "anonymous /app/employer is protected",
      `ended at ${employer.url} body=${employer.sample}`
    );
  }

  const admin = await goto(page, "/admin");
  if (/Overview|Pilot requests|Organizations/i.test(admin.sample) && !admin.url.includes("/login")) {
    fail("anonymous /admin is protected", `ended at ${admin.url} body=${admin.sample}`);
  } else if (admin.url.includes("/login") || /Sign in to Fydell/i.test(admin.sample)) {
    pass("anonymous /admin redirects to login");
  } else {
    fail("anonymous /admin is protected", `ended at ${admin.url} body=${admin.sample}`);
  }

  const onboarding = await goto(page, "/onboarding/employer");
  if (onboarding.url.includes("/login")) {
    pass("anonymous /onboarding/employer redirects to login");
  } else {
    fail(
      "anonymous /onboarding/employer is protected",
      `ended at ${onboarding.url} body=${onboarding.sample}`
    );
  }

  const invite = await goto(page, "/invite/not-a-real-token");
  if (invite.status >= 500) {
    fail("invalid invite token", `HTTP ${invite.status} body=${invite.sample}`);
  } else if (/not valid|not active|invitation/i.test(invite.sample)) {
    pass("invalid invite token renders a dead-link page", `HTTP ${invite.status}`);
  } else {
    fail("invalid invite token", `HTTP ${invite.status} body=${invite.sample}`);
  }

  const callback = await goto(page, "/auth/callback");
  if (callback.url.includes("/auth/link-invalid")) {
    pass("auth callback without code goes to link-invalid");
  } else {
    fail("auth callback without code goes to link-invalid", callback.url);
  }

  await browser.close();

  // --- API: no live account required ---
  const badLogin = await jsonPost("/api/platform/login", {
    email: "nobody@example.invalid",
    password: "definitely-wrong-password-000",
  });
  if (badLogin.status === 401) {
    pass("login with unknown credentials returns 401");
  } else {
    fail("login with unknown credentials returns 401", `HTTP ${badLogin.status} ${badLogin.error ?? ""}`);
  }

  const signupBlocked = await jsonPost("/api/auth/signup", {
    path: "employer",
    name: "Auth Probe",
    email: "auth-probe@example.invalid",
    password: "probe-password-0001",
    companyName: "Auth Probe Co",
  });
  if (signupBlocked.status === 503) {
    pass(
      "employer signup refuses to create an Auth user without a real service-role key",
      "HTTP 503"
    );
  } else if (signupBlocked.status === 200 && signupBlocked.ok) {
    fail(
      "employer signup end-to-end",
      "unexpected success: this environment was not supposed to have a live service-role key"
    );
  } else {
    fail(
      "employer signup without service-role key",
      `HTTP ${signupBlocked.status} ${signupBlocked.error ?? ""}`
    );
  }

  const forgot = await jsonPost("/api/platform/forgot-password", {
    email: "nobody@example.invalid",
    captchaToken: "",
  });
  if (forgot.status === 200 && forgot.ok) {
    pass("forgot-password returns the generic success payload");
  } else {
    fail(
      "forgot-password returns the generic success payload",
      `HTTP ${forgot.status} ${forgot.error ?? ""}`
    );
  }

  const logout = await fetch(`${BASE}/api/platform/logout`, {
    method: "GET",
    redirect: "manual",
  });
  const loc = logout.headers.get("location") || "";
  if (logout.status >= 300 && logout.status < 400 && loc.includes("/login") && !/fydell\.com/i.test(loc)) {
    pass("GET logout redirects to local /login", loc);
  } else if (logout.status === 200) {
    pass("GET logout completed", `HTTP ${logout.status}`);
  } else {
    fail("GET logout redirects to local /login", `HTTP ${logout.status} location=${loc}`);
  }

  console.log("");
  if (failures > 0) {
    console.error(`${failures} auth-flow check(s) failed.`);
    process.exit(1);
  }
  console.log("AUTH_FLOWS_OK");
}

void main();
