/**
 * Regression scan: retired terminology and em dashes must not appear anywhere
 * in the active source tree. Fails (exit 1) with file:line listings when found.
 *
 * Scope: the entire src tree (src/app, src/components, src/lib) plus public/.
 * Excluded: node_modules, .next, and scanner test fixtures.
 *
 * Run: npx tsx scripts/scan-retired-terms.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();

const SCAN_PATHS = ["src/app", "src/components", "src/lib", "public"];

const EXCLUDED_DIR_NAMES = new Set(["node_modules", ".next", "__fixtures__"]);

/** Word-boundary, case-chosen patterns. "FDE" stays case-sensitive so lowercase
 *  legacy identifiers (account_type "fde", table names) don't false-positive. */
const RETIRED: { label: string; re: RegExp }[] = [
  { label: "FDE", re: /\bFDE\b/ },
  { label: "Forward Deployed", re: /forward.deployed/i },
  { label: "Project Relay", re: /project.relay/i },
  { label: "Northbeam", re: /northbeam/i },
  { label: "synthetic simulation/deployment", re: /synthetic (simulation|deployment)/i },
  { label: "deployment recovery", re: /deployment recovery/i },
  { label: "leetcode", re: /leetcode/i },
  { label: "em dash", re: /\u2014/ },
];

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".css",
  ".svg",
  ".html",
  ".txt",
  ".json",
  ".md",
  ".xml",
  ".webmanifest",
]);

function* walk(path: string): Generator<string> {
  const full = join(ROOT, path);
  let st;
  try {
    st = statSync(full);
  } catch {
    return;
  }
  if (st.isFile()) {
    yield full;
    return;
  }
  for (const entry of readdirSync(full)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const child = join(full, entry);
    const cst = statSync(child);
    if (cst.isDirectory()) yield* walk(relative(ROOT, child));
    else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) yield child;
  }
}

let violations = 0;
for (const scanPath of SCAN_PATHS) {
  for (const file of walk(scanPath)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const { label, re } of RETIRED) {
        if (re.test(lines[i])) {
          violations++;
          console.error(
            `${relative(ROOT, file)}:${i + 1} contains retired term [${label}]: ${lines[i].trim().slice(0, 120)}`
          );
        }
      }
    }
  }
}

if (violations) {
  console.error(`\n${violations} violation(s). Active sources must not contain retired terms or em dashes.`);
  process.exit(1);
}
console.log("Active sources are clean: no retired terms, no em dashes.");
