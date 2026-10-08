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
const home = read("src/components/marketing/site/Home.tsx");
const sections = read("src/components/marketing/site/Sections.tsx");
const frame = read("src/components/marketing/site/ProductFrame.tsx");
const stage = read("src/components/marketing/site/PaintedStage.tsx");
const reveal = read("src/components/marketing/site/RevealObserver.tsx");
const profile = read("src/components/marketing/site/ProfileWorkspace.tsx");
const applicants = read("src/components/marketing/site/ApplicantReview.tsx");
const simHero = read("src/components/marketing/site/SimulationHero.tsx");
const desktopBand = read("src/components/marketing/site/DesktopBand.tsx");
const downloadButton = read("src/components/marketing/site/DownloadButton.tsx");
const navDownload = read("src/components/marketing/site/NavDownload.tsx");
const releases = read("src/components/marketing/site/releases.ts");
const navData = read("src/components/marketing/site/nav-data.ts");
const products = read("src/components/marketing/site/products.tsx");
const demoOption = read("src/components/marketing/site/DemoWorkspaceOption.tsx");
const shell = read("src/components/layout/MarketingShell.tsx");
const nav = read("src/components/layout/SiteNav.tsx");
const footer = read("src/components/layout/SiteFooter.tsx");
const globals = read("src/app/globals.css");
const download = read("src/app/download/page.tsx");
const demoPage = read("src/app/demo/page.tsx");
const signup = read("src/app/signup/page.tsx");
const signupView = read("src/components/auth/SignupView.tsx");
const getStarted = read("src/app/get-started/page.tsx");
const publicPages = ["developers", "employers", "pricing", "download", "changelog", "products", "products/[slug]"].map((p) => read(`src/app/${p}/page.tsx`));
const marketingCss = ["home", "site", "screens", "sim-hero"].map((f) => read(`src/components/marketing/site/${f}.module.css`));
const publicSurfaces = [page, home, sections, navData, nav, footer, products, desktopBand, ...publicPages];
const active = [...publicSurfaces, releases, signup, signupView, getStarted].join("\n");

console.log("\nFydell homepage contract");

// Shell and hero.
ok("homepage renders inside the shared marketing shell", /<MarketingShell>/.test(page) && /<SiteNav \/>/.test(shell) && /<SiteFooter \/>/.test(shell));
ok("every rebuilt public page uses the same shell", publicPages.every((p) => /<MarketingShell>/.test(p)));
const hero = page.slice(page.indexOf("<CenteredHero"), page.indexOf("</CenteredHero>"));
ok("hero headline", /title="Engineering work, ready to be seen\."/.test(hero));
ok(
  "hero lead names real projects, simulations and hiring teams",
  /lead="Fydell turns real projects and realistic simulations into evidence hiring teams can read\."/.test(hero),
);
ok("hero actions: Download and Sign up", /<DownloadButton \/>/.test(hero) && /href="\/signup"[^>]*>\s*Sign up/.test(hero));
ok("hero leads straight into the simulation", /<ProductFrame[\s\S]*?size="hero"[\s\S]*?<SimulationHero \/>/.test(hero));
ok(
  "hero simulation is built from the shipped scenario and labelled as an example",
  /backend-webhook-retry\/definition/.test(simHero) && /SCENARIO\.teammates/.test(simHero) && />Example</.test(simHero),
);

// Desktop downloads: Windows and macOS only.
ok("desktop builds are Windows and macOS only", /export type DesktopOs = "macos" \| "windows";/.test(releases) && !/\blinux:\s*\{/i.test(releases));
ok(
  "download buttons offer Windows and macOS, never Linux",
  /<DownloadButton os="windows" \/>/.test(download) &&
    /<DownloadButton os="macos"/.test(download) &&
    /<DownloadButton os="windows" \/>/.test(desktopBand) &&
    /<DownloadButton os="macos"/.test(desktopBand) &&
    ![downloadButton, navDownload, desktopBand].some((f) => /linux/i.test(f)) &&
    !/os="linux"/.test([download, page].join("\n")),
);

// Demo gating: offered at sign-up only.
const demoHref = /href[=:]\s*\{?\s*["'`]\/(demo|sandbox)\b/;
ok("no demo or sandbox link in the nav, footer or product menu", ![navData, nav, footer].some((f) => demoHref.test(f) || /Interactive demo/.test(f)));
ok("no demo or sandbox link on the homepage or public pages", !publicSurfaces.some((f) => demoHref.test(f)));
ok("/demo still exists and sends visitors to the sign-up demo choice", /redirect\("\/signup\?intent=demo"\)/.test(demoPage));
ok("/sandbox route is kept", existsSync(resolve("src/app/sandbox/page.tsx")));
ok(
  "sign-up offers the demo workspace with honest copy",
  /DEMO_WORKSPACE_HREF = "\/sandbox"/.test(demoOption) &&
    /Explore the demo workspace first/.test(demoOption) &&
    /Synthetic data\. Nothing you do there is sent to anyone\./.test(demoOption) &&
    /<DemoWorkspaceOption/.test(signupView) &&
    /params\.intent\) === "demo"/.test(signup) &&
    /audience !== "open" \? "none"/.test(signup),
);
ok(
  "audience choice offers developer and employer paths, plus the demo",
  /I'm a developer/.test(getStarted) &&
    /I'm hiring/.test(getStarted) &&
    /\/signup\?as=developer/.test(getStarted) &&
    /\/signup\?as=employer/.test(getStarted) &&
    /<DemoWorkspaceOption \/>/.test(getStarted) &&
    /as === "developer"/.test(signup),
);

// Colour and motion.
ok(
  "indigo accent and status inks are defined once for the marketing scope",
  ["--mk-indigo: #4f46e5", "--mk-success: #16734a", "--mk-attention: #8a5700", "--mk-error: #b42332"].every((t) => globals.includes(t)),
);
ok("the brand wash is used once, on the homepage hero", (page.match(/\bwash\b/g) ?? []).length === 1 && /priority wash/.test(page));
ok("no gradient text on the public site", ![...publicSurfaces, ...marketingCss].some((f) => /bg-clip-text|background-clip:\s*text/.test(f)));
ok(
  "entrance motion respects reduced motion and never hides server HTML",
  /prefers-reduced-motion: reduce/.test(reveal) &&
    /html\[data-mk-motion\] \.site-linear \[data-reveal\]/.test(globals) &&
    /cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(globals) &&
    marketingCss.some((f) => /\.heroIn[\s\S]*prefers-reduced-motion: reduce/.test(f)),
);
ok("no animation library on the public site", ![...publicSurfaces, reveal].some((f) => /from "gsap|from "framer-motion|from "motion\//.test(f)));
ok("a missing painting falls back to a plain ground", /existsSync/.test(stage) && /data-painted/.test(stage));

// Product views.
ok("homepage shows the Passport and the hiring review", /<ProfileWorkspace \/>/.test(page) && /<ApplicantReview \/>/.test(page));
ok(
  "product imagery is labelled as example data or preview",
  (page.match(/<ProductFrame/g) ?? []).length >= 4 && /"Example data" \| "Preview"/.test(frame) && /role="img"/.test(frame) && /tag="Preview"/.test(page),
);
ok("homepage views are interactive and built from the shared fixture", /aria-pressed=\{active\}/.test(profile) && /from "\.\/fixture"/.test(profile) && /from "\.\/fixture"/.test(applicants));
ok("employer decision does not send anything", /Nothing is sent to the applicant/.test(applicants));
ok("closing offers sign-up and sales", /Sign up free/.test(page) && /Contact sales/.test(page));

// Navigation and honesty.
ok("official lockup is used in the site header and footer", /FydellLogo/.test(nav) && /FydellLogo/.test(footer));
ok("navigation labels", /For Engineers[\s\S]*For Employers[\s\S]*Pricing/.test(navData) && /aria-expanded=\{productOpen\}/.test(nav) && /Log in/.test(nav) && /Open workspace/.test(nav));
ok(
  "every Product menu item has a product page",
  [...navData.matchAll(/href: "\/products\/([a-z-]+)"/g)].every((m) => products.includes(`"${m[1]}": {`) || products.includes(`\n  ${m[1]}: {`)),
);
ok("no statistics band on the homepage", !/Stat(s)?Band|\d+%\s/.test(page));
ok("no em dashes in public copy", !publicSurfaces.some((f) => f.includes("\u2014")));
ok("no invented social proof or unsupported claims", !/testimonial|trusted by|SOC 2 certified|predicts? job performance|industry standard/i.test(active));
ok("no claim to detect AI or cheating", !/Fydell (detects|catches|flags) (AI|cheat)|detects cheating|cheat(ing)? detection/i.test(active));
ok(
  "site icons are generated from the official Fydell mark",
  ["src/app/favicon.ico", "src/app/icon.png", "src/app/apple-icon.png"].every((f) => existsSync(resolve(f))) && !existsSync(resolve("src/app/icon.svg")),
);

if (failures > 0) process.exit(1);
console.log("\nHomepage contract passed");
