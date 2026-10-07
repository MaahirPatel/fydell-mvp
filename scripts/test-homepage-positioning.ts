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
const frame = read("src/components/marketing/site/ProductFrame.tsx");
const sections = read("src/components/marketing/site/Sections.tsx");
const profile = read("src/components/marketing/site/ProfileWorkspace.tsx");
const applicants = read("src/components/marketing/site/ApplicantReview.tsx");
const navData = read("src/components/marketing/site/nav-data.ts");
const products = read("src/components/marketing/site/products.tsx");
const releases = read("src/components/marketing/site/releases.ts");
const shell = read("src/components/layout/MarketingShell.tsx");
const workspace = read("src/components/marketing/home/EvidenceWorkspace.tsx");
const stage = read("src/components/marketing/home/ProductStage.tsx");
const nav = read("src/components/layout/SiteNav.tsx");
const footer = read("src/components/layout/SiteFooter.tsx");
const pricing = read("src/app/pricing/page.tsx");
const layout = read("src/app/layout.tsx");
const getStarted = read("src/app/get-started/page.tsx");
const signup = read("src/app/signup/page.tsx");
const publicPages = ["employers", "developers", "pricing", "download", "changelog", "products", "products/[slug]"].map((p) => read(`src/app/${p}/page.tsx`));
const active = [page, nav, navData, footer, products, releases, pricing, layout, getStarted, signup, ...publicPages].join("\n");

console.log("\nFydell homepage contract");

ok("homepage renders inside the shared marketing shell", /<MarketingShell>/.test(page));
ok(
  "every rebuilt public page uses the same shell and page grammar",
  [page, ...publicPages].every((p) => /<MarketingShell>/.test(p) && /marketing\/site\/Sections/.test(p)) && /<SiteNav \/>/.test(shell) && /<SiteFooter \/>/.test(shell),
);
ok("the retired second marketing system is gone", !existsSync(resolve("src/components/marketing/MarketingV2.tsx")) && !existsSync(resolve("src/styles/marketing-v2.css")));

// Page contract: the owner's headline and lead, Sign up first, the platform
// second, and a quieter Download link.
const hero = page.slice(page.indexOf("<SiteHero"), page.indexOf("<ProductFrame"));
ok("hero states the proposition", /"Engineering work\."/.test(hero) && /"Ready to be seen\."/.test(hero));
ok(
  "hero lead speaks to engineers and hiring teams",
  /one Passport/.test(hero) && /apply to roles/.test(hero) && /hiring teams/.test(hero),
);
ok(
  "hero actions: Sign up, Explore the platform, Download",
  /primary=\{\{ href: "\/signup", label: "Sign up" \}\}/.test(hero) &&
    /secondary=\{\{ href: "\/demo", label: "Explore the platform" \}\}/.test(hero) &&
    /supporting=\{\{ href: "\/download", label: "Download Fydell" \}\}/.test(hero) &&
    ["src/app/signup/page.tsx", "src/app/demo/page.tsx", "src/app/download/page.tsx"].every((f) => existsSync(resolve(f))),
);
ok("hero leads straight into the product", /<ProductFrame[\s\S]*?size="hero"[\s\S]*?<ProfileWorkspace \/>/.test(page.slice(page.indexOf("<SiteHero"), page.indexOf("</SiteHero>"))));
ok(
  "homepage chapters follow the narrative",
  [
    "Give your projects a professional home.",
    "See the evidence behind each finding.",
    "Choose the work you share.",
    "Bring applicants and evidence into one workspace.",
    "Explore the questions the existing work leaves open.",
    "Keep your work connected.",
  ].every((t) => page.includes(t)) && /label: "Contact sales"/.test(page),
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
ok(
  "product imagery is labelled as example data or preview",
  (page.match(/<ProductFrame/g) ?? []).length >= 5 &&
    /"Example data" \| "Preview"/.test(frame) &&
    /role="img"/.test(frame) &&
    /figcaption/.test(frame) &&
    /tag="Preview"/.test(page),
);
ok("homepage views are interactive and built from the shared fixture", /aria-pressed=\{active\}/.test(profile) && /from "\.\/fixture"/.test(profile) && /from "\.\/fixture"/.test(applicants));
ok("employer decision does not send anything", /Nothing is sent to the applicant/.test(applicants) && /nothing is sent to the candidate/.test(workspace));
ok("availability is written as text, not a pill", /data-state=\{state\}/.test(sections));
ok("demo has four steps with skip and reset", /Skip to the report/.test(stage) && /Reset demo/.test(stage) && /"passport"/.test(stage) && /EvidenceWorkspace/.test(stage));
ok("official lockup is used in the site header", /FydellLogo/.test(nav) && /FydellLogo/.test(footer));
ok(
  "navigation labels",
  /For Engineers[\s\S]*For Employers[\s\S]*Pricing/.test(navData) &&
    /\n\s*Product\n/.test(nav) &&
    /aria-expanded=\{productOpen\}/.test(nav) &&
    /Log in/.test(nav) &&
    /href="\/signup"[^>]*>\s*Sign up/.test(nav) &&
    /href="\/download"[^>]*>\s*Download/.test(nav) &&
    /Open workspace/.test(nav),
);
ok(
  "every Product menu item has a product page",
  [...navData.matchAll(/href: "\/products\/([a-z-]+)"/g)].every((m) => products.includes(`"${m[1]}": {`) || products.includes(`\n  ${m[1]}: {`)),
);
ok(
  "changelog lists only published desktop releases",
  ["0.1.0", "0.1.1", "0.1.2", "0.1.3", "0.1.4", "0.1.5"].every((v) => releases.includes(`version: "${v}"`)) && !/version: "0\.1\.[6-9]"/.test(releases),
);
ok(
  "pricing labels Pro as a preview with a working waitlist",
  /Paid subscriptions are not available yet\./.test(pricing) && /Preview/.test(pricing) && /<ProWaitlistForm \/>/.test(pricing) && !/Most popular/i.test(pricing),
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
