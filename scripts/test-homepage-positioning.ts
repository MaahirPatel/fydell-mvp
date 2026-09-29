import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let failures = 0;

function read(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function ok(name: string, condition: boolean): void {
  if (condition) {
    console.log(`  ok   ${name}`);
    return;
  }
  console.log(`  FAIL ${name}`);
  failures += 1;
}

const page = read("src/app/page.tsx");
const kit = read("src/components/marketing/kit/Kit.tsx");
const shots = read("src/components/marketing/kit/Shots.tsx");
const shell = read("src/components/layout/MarketingShell.tsx");
const workspace = read("src/components/marketing/home/EvidenceWorkspace.tsx");
const stage = read("src/components/marketing/home/ProductStage.tsx");
const nav = read("src/components/layout/SiteNav.tsx");
const footer = read("src/components/layout/SiteFooter.tsx");
const pricing = read("src/app/pricing/page.tsx");
const layout = read("src/app/layout.tsx");
const getStarted = read("src/app/get-started/page.tsx");
const signup = read("src/app/signup/page.tsx");
const publicPages = ["employers", "developers", "product", "pricing", "download"].map((p) => read(`src/app/${p}/page.tsx`));
const active = [page, shots, nav, footer, pricing, layout, getStarted, signup, ...publicPages].join("\n");

console.log("\nFydell homepage contract");

ok("homepage renders inside the shared marketing shell", /<MarketingShell>/.test(page));
ok(
  "every rebuilt public page uses the same shell and kit",
  publicPages.every((p) => /<MarketingShell>/.test(p) && /marketing\/kit\/Kit/.test(p)) && /<SiteNav \/>/.test(shell) && /<SiteFooter \/>/.test(shell),
);
ok("the retired second marketing system is gone", !existsSync(resolve("src/components/marketing/MarketingV2.tsx")) && !existsSync(resolve("src/styles/marketing-v2.css")));

// Page contract (release checklist, Landing): a clear proposition for both
// audiences, and "Get started" and "Explore demo" both work.
const hero = page.slice(page.indexOf("<Hero"), page.indexOf("<Stage"));
ok("hero speaks to hiring teams and candidates", /Candidates/.test(hero) && /team/i.test(hero));
ok(
  "hero actions: Get started, Explore demo, and an engineer path",
  /href="\/get-started"[^>]*>\s*Get started/.test(hero) &&
    /href="\/demo"[^>]*>\s*Explore demo/.test(hero) &&
    /href="\/developers"/.test(hero) &&
    ["src/app/get-started/page.tsx", "src/app/demo/page.tsx", "src/app/developers/page.tsx"].every((f) => existsSync(resolve(f))),
);
ok(
  "audience choice offers developer and employer paths into signup",
  /I'm a developer/.test(getStarted) &&
    /I'm hiring/.test(getStarted) &&
    /\/signup\?as=developer/.test(getStarted) &&
    /\/signup\?as=employer/.test(getStarted) &&
    /as === "developer"/.test(signup),
);
ok("no statistics band on the homepage", !/stats|Stat(s)?Band|\d+%\s/.test(page));
ok("product imagery is labelled as an example", (page.match(/label="Example:/g) ?? []).length >= 4 && /role="img"/.test(kit) && /figcaption/.test(kit));
ok("shared evidence interface still backs the demo", /aria-pressed=\{active\}/.test(workspace) && /Evidence limits/.test(workspace));
ok("employer decision does not send anything", /nothing is sent to the candidate/.test(workspace));
ok("demo has four steps with skip and reset", /Skip to the report/.test(stage) && /Reset demo/.test(stage) && /"passport"/.test(stage) && /EvidenceWorkspace/.test(stage));
ok("official lockup is used in the site header", /FydellLogo/.test(nav) && /FydellLogo/.test(footer));
ok(
  "navigation labels",
  /Product[\s\S]*Employers[\s\S]*Developers[\s\S]*Pricing/.test(nav) && /Sign in/.test(nav) && /Get started/.test(nav),
);
ok(
  "no retired positioning in active public surfaces",
  !/Solutions Engineer|worth interviewing|worth meeting|Run a pilot|Start a hiring pilot|Request a pilot|placement fee|15%|\$250|\$2,500|Data Analyst|quality_events|Acme|SSO review|oral defense/i.test(active),
);
ok("no invented social proof or unsupported claims", !/testimonial|trusted by|SOC 2 certified|predicts? job performance|industry standard/i.test(active));
ok("no claim to detect AI or cheating", !/Fydell (detects|catches|flags) (AI|cheat)|detects cheating|cheat(ing)? detection/i.test(active));
ok("pricing states the billing unit without mixing plan types", /completed simulation/i.test(pricing) && !/Annual plan/.test(pricing));
ok(
  "site icons are generated from the official Fydell mark",
  ["src/app/favicon.ico", "src/app/icon.png", "src/app/apple-icon.png"].every((f) => existsSync(resolve(f))) &&
    !existsSync(resolve("src/app/icon.svg")) &&
    !/icons:/.test(layout),
);

if (failures > 0) process.exit(1);
console.log("\nHomepage contract passed");
