/**
 * Desktop version-gate endpoint (DESK-19) — in-process route test.
 *
 * Drives the REAL handler in `src/app/api/desktop/version/route.ts`.
 * No Supabase, no network.
 *
 * Proves:
 *  - 404 when FYDELL_DESKTOP_MIN_VERSION is not declared (client → Unknown)
 *  - 200 with minSupportedVersion when declared
 *  - latestVersion/downloadUrl present only when configured
 *  - blank/whitespace values are treated as undeclared
 *
 * Run with: npx tsx scripts/test-desktop-version-route.ts
 */

import { GET } from "../src/app/api/desktop/version/route";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

function setEnv(min?: string, latest?: string, url?: string) {
  for (const k of [
    "FYDELL_DESKTOP_MIN_VERSION",
    "FYDELL_DESKTOP_LATEST_VERSION",
    "FYDELL_DESKTOP_DOWNLOAD_URL",
  ])
    delete process.env[k];
  if (min !== undefined) process.env.FYDELL_DESKTOP_MIN_VERSION = min;
  if (latest !== undefined) process.env.FYDELL_DESKTOP_LATEST_VERSION = latest;
  if (url !== undefined) process.env.FYDELL_DESKTOP_DOWNLOAD_URL = url;
}

async function main() {
  // 1. Nothing declared → 404, client treats as Unknown.
  setEnv();
  {
    const res = await GET();
    check("undeclared → 404", res.status === 404, `got ${res.status}`);
    const body = (await res.json()) as { error?: string };
    check("404 carries an error message", typeof body.error === "string");
  }

  // 2. Blank values are undeclared.
  setEnv("   ");
  {
    const res = await GET();
    check("whitespace min → 404", res.status === 404, `got ${res.status}`);
  }

  // 3. Minimum declared → 200 with the contract shape.
  setEnv("0.2.0");
  {
    const res = await GET();
    check("declared → 200", res.status === 200, `got ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    check(
      "minSupportedVersion echoed",
      body.minSupportedVersion === "0.2.0",
      JSON.stringify(body)
    );
    check("latestVersion omitted when unset", !("latestVersion" in body));
    check("downloadUrl omitted when unset", !("downloadUrl" in body));
  }

  // 4. Full declaration.
  setEnv("0.2.0", "0.3.1", "https://fydell.com/download");
  {
    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    check("latestVersion echoed", body.latestVersion === "0.3.1");
    check("downloadUrl echoed", body.downloadUrl === "https://fydell.com/download");
  }

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\ndesktop version route: all assertions passed");
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
