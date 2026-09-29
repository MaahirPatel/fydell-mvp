/**
 * Human QA hold (AI-12) and starter-vs-submission diffs (REP-02). Pure rules.
 * Run: npx tsx scripts/test-engineering-review.ts
 */
import { readFileSync } from "node:fs";
import { diffFiles } from "../src/lib/engineering/diff";
import { MIN_NOTE_CHARS, applyReviewAction, employerCanSeeReport } from "../src/lib/engineering/report-review";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!cond) failures++;
}
const note = "x".repeat(MIN_NOTE_CHARS);

// ------------------------------------------------------------ review rules
check("nothing is visible to the employer before review", !employerCanSeeReport(null) && !employerCanSeeReport("pending"));
check("changes-requested reports stay hidden", !employerCanSeeReport("changes_requested"));
check("released reports are visible", employerCanSeeReport("released"));

const clean = applyReviewAction("pending", "release", { notes: "", evaluation: "completed" });
check("a clean evaluation can be released without a note", clean.ok === true && clean.status === "released");
check("cannot release before the evaluation finishes", applyReviewAction("pending", "release", { notes: note, evaluation: "pending" }).ok === false);
for (const evaluation of ["infrastructure_error", "not_configured", "indeterminate", "no_files"] as const) {
  check(`releasing a ${evaluation} evaluation needs a note`, applyReviewAction("pending", "release", { notes: "ok", evaluation }).ok === false);
  check(`releasing a ${evaluation} evaluation with a note is allowed`, applyReviewAction("pending", "release", { notes: note, evaluation }).ok === true);
}
check("request changes needs a note", applyReviewAction("pending", "request_changes", { notes: "", evaluation: "completed" }).ok === false);
const returned = applyReviewAction("pending", "request_changes", { notes: note, evaluation: "completed" });
check("request changes moves to changes_requested", returned.ok === true && returned.status === "changes_requested");
check("a returned report can be released later", applyReviewAction("changes_requested", "release", { notes: "", evaluation: "completed" }).ok === true);
check("cannot release twice", applyReviewAction("released", "release", { notes: note, evaluation: "completed" }).ok === false);
const reopened = applyReviewAction("released", "reopen", { notes: note, evaluation: "completed" });
check("a released report can be reopened with a reason", reopened.ok === true && reopened.status === "pending");
check("reopen needs a reason", applyReviewAction("released", "reopen", { notes: "", evaluation: "completed" }).ok === false);
check("only released reports can be reopened", applyReviewAction("pending", "reopen", { notes: note, evaluation: "completed" }).ok === false);

// The report route withholds engineering reports until release.
const reportRoute = readFileSync("src/app/api/sim/sessions/[id]/report/route.ts", "utf8");
check("report route gates engineering reports on the review", /employerCanSeeReport\(/.test(reportRoute) && /review_required/.test(reportRoute));
const adminRoute = readFileSync("src/app/api/admin/report-reviews/[sessionId]/route.ts", "utf8");
check("only platform reviewers/admins can decide", /requirePlatformRoleApi\(\["super_admin", "admin", "reviewer"\]\)/.test(adminRoute));
check("decisions are appended to the review history", /sim_report_review_events/.test(adminRoute));

// ------------------------------------------------------------ diffs
const starter = {
  "webhooks/retry.py": "a = 1\nb = 2\nc = 3\nd = 4\ne = 5\nf = 6\ng = 7\nh = 8\n",
  "webhooks/gone.py": "x = 1\n",
  "README.md": "docs\n",
};
const submitted = {
  "webhooks/retry.py": "a = 1\nb = 2\nc = 3\nd = 40\ne = 5\nf = 6\ng = 7\nh = 8\n",
  "tests/test_mine.py": "def test_x():\n    assert True\n",
  "README.md": "edited docs\n",
};
const editable = (p: string) => p.startsWith("webhooks/") || p.startsWith("tests/");
const changes = diffFiles(starter, submitted, editable);
const byPath = Object.fromEntries(changes.map((c) => [c.path, c]));
check("modified file is reported with counts", byPath["webhooks/retry.py"]?.change === "modified" && byPath["webhooks/retry.py"].added === 1 && byPath["webhooks/retry.py"].removed === 1);
check(
  "unified hunk with context and correct header",
  byPath["webhooks/retry.py"]?.hunks === "@@ -1,7 +1,7 @@\n a = 1\n b = 2\n c = 3\n-d = 4\n+d = 40\n e = 5\n f = 6\n g = 7",
  byPath["webhooks/retry.py"]?.hunks
);
check("added file", byPath["tests/test_mine.py"]?.change === "added" && byPath["tests/test_mine.py"].added === 2);
check("removed file", byPath["webhooks/gone.py"]?.change === "removed" && byPath["webhooks/gone.py"].removed === 1);
check("non-editable files are not diffed", !("README.md" in byPath));
check("line-ending-only changes are not reported", diffFiles({ "webhooks/a.py": "x\n" }, { "webhooks/a.py": "x\r\n" }).length === 0);
check("identical trees produce no changes", diffFiles(starter, starter).length === 0);
const big = Array.from({ length: 3000 }, (_, i) => `line ${i}`).join("\n");
const huge = diffFiles({ "webhooks/big.py": big }, { "webhooks/big.py": big + "\nmore" });
check("very large files are reported without a line diff", huge.length === 1 && huge[0].hunks === null);

console.log(failures ? `\n${failures} failure(s)` : "\nAll review and diff checks passed.");
if (failures) process.exit(1);
