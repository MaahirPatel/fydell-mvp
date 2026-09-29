/**
 * Checks the live SEO surface over HTTP: robots.txt, sitemap.xml, and the
 * server-rendered metadata of every sitemap page. Also confirms private routes
 * stay out of the sitemap and are either redirected or marked noindex.
 *
 *   npm run check:seo                      # against https://www.fydell.com
 *   npm run check:seo -- http://localhost:3100
 */
import { INDEXABLE_PATHS, PRIVATE_PATH_PREFIXES, SITE_URL } from "../src/lib/seo/site";

const base = (process.argv[2] ?? SITE_URL).replace(/\/$/, "");
const failures: string[] = [];
let passes = 0;

function check(ok: boolean, label: string) {
  if (ok) passes++;
  else failures.push(label);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tagAttr(html: string, tag: RegExp, attr: string): string | null {
  const m = html.match(tag);
  if (!m) return null;
  const a = m[0].match(new RegExp(`${attr}="([^"]*)"`));
  return a ? decode(a[1]) : null;
}

function visibleText(html: string) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
}

async function get(path: string) {
  return fetch(`${base}${path}`, { redirect: "manual", headers: { "user-agent": "fydell-seo-check" } });
}

async function main() {
  console.log(`Checking ${base}\n`);

  const robots = await get("/robots.txt");
  const robotsText = await robots.text();
  check(robots.status === 200, `/robots.txt returns 200 (got ${robots.status})`);
  check(/^User-Agent: \*$/im.test(robotsText) && /^Allow: \/$/m.test(robotsText), "robots.txt allows / for all agents");
  check(robotsText.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), "robots.txt points to the www sitemap");
  for (const prefix of PRIVATE_PATH_PREFIXES) {
    check(robotsText.includes(`Disallow: ${prefix}/`), `robots.txt disallows ${prefix}/`);
  }
  for (const path of INDEXABLE_PATHS) {
    const blocked = PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    check(!blocked, `robots.txt does not block public page ${path}`);
  }

  const sm = await get("/sitemap.xml");
  const smText = await sm.text();
  check(sm.status === 200, `/sitemap.xml returns 200 (got ${sm.status})`);
  check((sm.headers.get("content-type") ?? "").includes("xml"), "sitemap is served as XML");
  check(smText.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), "sitemap uses the sitemaps.org schema");
  const urls = [...smText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  check(urls.length === INDEXABLE_PATHS.length, `sitemap lists ${INDEXABLE_PATHS.length} URLs (got ${urls.length})`);
  check(urls.every((u) => u === SITE_URL || u.startsWith(`${SITE_URL}/`)), "every sitemap URL uses the www host");
  for (const u of urls) {
    const path = new URL(u).pathname;
    const privateHit = PRIVATE_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
    check(!privateHit, `sitemap URL ${path} is not a private route`);
  }

  for (const path of INDEXABLE_PATHS) {
    const res = await get(path);
    const html = await res.text();
    const expected = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = tagAttr(html, /<meta name="description"[^>]*>/, "content");
    const canonical = tagAttr(html, /<link rel="canonical"[^>]*>/, "href");
    const robotsMeta = tagAttr(html, /<meta name="robots"[^>]*>/, "content");
    check(res.status === 200, `${path} returns 200 without redirect (got ${res.status})`);
    check(Boolean(title && title.trim().length > 0), `${path} title: ${title ? decode(title) : "(missing)"}`);
    check(Boolean(description && description.length >= 20), `${path} has a description`);
    check(canonical === expected, `${path} canonical is ${expected} (got ${canonical ?? "none"})`);
    check(!robotsMeta?.includes("noindex") && !(res.headers.get("x-robots-tag") ?? "").includes("noindex"), `${path} is indexable`);
  }

  const home = await (await get("/")).text();
  const h1 = home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  const words = visibleText(home).split(" ").length;
  check(Boolean(h1 && visibleText(h1).length > 0), `homepage server-renders an h1: ${h1 ? visibleText(h1) : "(missing)"}`);
  check(words >= 300, `homepage server-renders meaningful text (${words} words)`);

  for (const path of ["/app/employer", "/app/candidate", "/admin", "/app/employer/reports", "/p/example-token", "/record/example-token", "/api/sim/invitations/mine"]) {
    const res = await get(path);
    const redirected = res.status >= 300 && res.status < 400;
    const noindex = (res.headers.get("x-robots-tag") ?? "").includes("noindex");
    const listed = urls.some((u) => new URL(u).pathname === path);
    check(!listed, `${path} is not in the sitemap`);
    check(noindex, `${path} sends X-Robots-Tag noindex (status ${res.status}${redirected ? ` -> ${res.headers.get("location")}` : ""})`);
  }

  console.log(`\n${passes} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
