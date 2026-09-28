/**
 * DESK-19: the platform's desktop version declaration.
 * Run: npx tsx scripts/test-desktop-version-policy.ts
 */
import { DEFAULT_MIN_SUPPORTED_VERSION, desktopVersionDeclaration } from "../src/lib/desktop/version-policy";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!cond) failures++;
}

const none = desktopVersionDeclaration({});
check("default declares the oldest supported build", none.declaration.minSupportedVersion === DEFAULT_MIN_SUPPORTED_VERSION && none.problems.length === 0);
check("no latest or download link unless configured", none.declaration.latestVersion === undefined && none.declaration.downloadUrl === undefined);

const full = desktopVersionDeclaration({
  FYDELL_DESKTOP_MIN_VERSION: "0.2.0",
  FYDELL_DESKTOP_LATEST_VERSION: "0.3.1",
  FYDELL_DESKTOP_DOWNLOAD_URL: "https://fydell.example/download",
});
check("configured values are served", full.declaration.minSupportedVersion === "0.2.0" && full.declaration.latestVersion === "0.3.1" && full.declaration.downloadUrl === "https://fydell.example/download");

const badMin = desktopVersionDeclaration({ FYDELL_DESKTOP_MIN_VERSION: "latest" });
check("a malformed minimum never blocks everyone", badMin.declaration.minSupportedVersion === DEFAULT_MIN_SUPPORTED_VERSION && badMin.problems.length === 1);

const lower = desktopVersionDeclaration({ FYDELL_DESKTOP_MIN_VERSION: "0.4.0", FYDELL_DESKTOP_LATEST_VERSION: "0.3.0" });
check("latest below the minimum is dropped", lower.declaration.latestVersion === undefined && lower.problems.length === 1);

const http = desktopVersionDeclaration({ FYDELL_DESKTOP_DOWNLOAD_URL: "http://fydell.example/download" });
check("non-HTTPS download links are refused", http.declaration.downloadUrl === undefined && http.problems.length === 1);

const js = desktopVersionDeclaration({ FYDELL_DESKTOP_DOWNLOAD_URL: "javascript:alert(1)" });
check("script URLs are refused", js.declaration.downloadUrl === undefined);

console.log(failures === 0 ? "\nAll desktop version checks passed." : `\n${failures} failure(s)`);
if (failures) process.exit(1);
