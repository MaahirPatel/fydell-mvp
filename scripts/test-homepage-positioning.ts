import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/*
 * Public-site contract for the light visual system (src/components/site).
 * Checks structure, required product visuals and the hard content rules:
 * no scores or rankings, no unsupported claims, no fabricated social proof,
 * example visuals labelled, lowercase wordmark, nav order.
 */

let failures = 0;

function read(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function ok(name: string, condition: boolean): void {
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

function walk(dir: string): string[] {
  return readdirSync(resolve(dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(dir, e.name)] : [],
  );
}

const page = read("src/app/page.tsx");
const home = read("src/components/site/pages/HomePage.tsx");
const nav = read("src/components/site/SiteNav.tsx");
const footer = read("src/components/site/SiteFooter.tsx");
const mark = read("src/components/site/Mark.tsx");
const tokens = read("src/styles/fydell-tokens.css");
const layout = read("src/app/layout.tsx");
const pricing = read("src/components/site/pages/PricingPage.tsx");
const getStarted = read("src/app/get-started/page.tsx");
const signup = read("src/app/signup/page.tsx");
const siteFiles = walk("src/components/site");
const site = siteFiles.map(read).join("\n");
const visibleCopy = siteFiles
  .filter((f) => f.endsWith(".tsx"))
  .map(read)
  .join("\n")
  // Contract comments may name forbidden things in order to forbid them.
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

console.log("\nFydell public-site contract");

ok("homepage mounts the site shell and home composition", /SiteShell/.test(page) && /HomePage/.test(page));
ok("hero headline", home.includes("Hire engineers on the work itself"));
ok(
  "hero actions route employers to signup and developers to the passport builder",
  /href="\/signup\?as=employer">Start hiring/.test(home) && /href="\/passport\/new"/.test(home),
);
ok(
  "home sections in order",
  (() => {
    const order = [
      "A resume tells you where someone has worked.",
      "Start from a real incident",
      "Every step, on the record",
      "Checked on the code they submitted",
      "A report your team can stand behind",
      "One loop, from role to decision",
      "Engineers keep their work",
      "Clear about what it will not do",
      "Hire on the work. Start with one role.",
    ];
    const at = order.map((h) => home.indexOf(h));
    return at.every((n, i) => n >= 0 && (i === 0 || n > at[i - 1]));
  })(),
);
ok(
  "required product visuals exist",
  ["HeroWorkspace", "IncidentBrief", "ConsentScreen", "HiddenChecks", "CitedReport", "Receipt", "PassportView"].every((v) =>
    home.includes(`<${v}`),
  ),
);
ok(
  "hero visual carries the named product details",
  (() => {
    const hero = read("src/components/site/visuals/HeroWorkspace.tsx");
    return ["dispatcher.py", "Alex Morgan", "Engineering lead", "Which failures should count as temporary?", "Partner request: honor Retry-After", "31:42 left", "Submit", "13 passed", "2 failed"].every((t) => hero.includes(t));
  })(),
);
ok(
  "every product visual is captioned as an example",
  (read("src/components/site/primitives.tsx").match(/Example: \{children\}/) ?? []).length === 1 &&
    (home.match(/<Caption>/g) ?? []).length >= 7,
);
ok("visual frames expose role=img with a label", /role="img" aria-label=\{label\}/.test(read("src/components/site/primitives.tsx")));
ok(
  "navigation order and labels",
  /Product[\s\S]*Employers[\s\S]*Developers[\s\S]*Pricing[\s\S]*Trust[\s\S]*Contact/.test(nav) && /Sign in/.test(nav) && /Get started/.test(nav),
);
ok("footer has Product, Company, Account and Legal columns", ["Product", "Company", "Account", "Legal"].every((c) => footer.includes(`title: "${c}"`)));
ok("wordmark is lowercase live text beside the ring mark", /\n\s+fydell\n/.test(mark) && /Lockup/.test(nav) && /Lockup/.test(footer));
ok(
  "token families exist in light and dark",
  ["--surface-canvas", "--surface-deep", "--surface-band", "--surface-raised", "--surface-panel", "--surface-hover", "--surface-selected", "--surface-code", "--text-quaternary", "--border-strong", "--fy-blue-ink", "--fy-red-ink", "--fy-teal-ink", "--fy-violet-ink", "--fy-gradient"].every((t) =>
    tokens.includes(`${t}:`),
  ) && /\[data-theme="dark"\]/.test(tokens),
);
ok("no hardcoded Tailwind grey scales in the site system", !/\b(zinc|slate|gray|neutral|stone)-\d{2,3}\b/.test(site));
ok("reduced motion keeps everything visible", /prefers-reduced-motion/.test(read("src/styles/site-motion.css")));
ok(
  "audience choice offers developer and employer paths into signup",
  /I'm a developer/.test(getStarted) && /I'm hiring/.test(getStarted) && /\/signup\?as=developer/.test(getStarted) && /\/signup\?as=employer/.test(getStarted) && /as === "developer"/.test(signup),
);
// Sentences that deny something ("There is no score...", "It does not predict...")
// are the point of the copy; only affirmative sentences are checked.
const affirmed = visibleCopy
  .replace(/"[^"]*\?"/g, "")
  .replace(/(There is no|No\. |does not|never|not claim to|Claim to)[^.<]*[.<]/gi, "");
ok(
  "no scores, ratings, percentiles, rankings or leaderboards shown",
  !/\b(fit score|percentile|leaderboard|out of 10|\/100|\d+% match)\b/i.test(affirmed),
);
ok(
  "no unsupported claims",
  !/(predicts?|predictive of) (job )?performance|detects? (cheating|AI use)|removes? bias|industry standard|SOC 2 certified/i.test(affirmed),
);
ok("no invented social proof", !/testimonial|trusted by|customers love|\d+\+ (teams|companies)/i.test(visibleCopy));
ok("no test, quiz or exam framing for simulations", !/\b(quiz|exam)\b/i.test(visibleCopy));
ok("pricing states the billing unit", /completed simulation/i.test(pricing) && /never billed/i.test(pricing));
ok(
  "site icons are generated from the official Fydell mark",
  ["src/app/favicon.ico", "src/app/icon.png", "src/app/apple-icon.png"].every((f) => existsSync(resolve(f))) && !/icons:/.test(layout),
);

if (failures > 0) process.exit(1);
console.log("\nPublic-site contract passed");
