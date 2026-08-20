import type { NextConfig } from "next";

/**
 * alasql powers the in-browser SQL sandbox in the analyst simulation, and it
 * needs pinning to its browser build.
 *
 * Its `exports` map is `{ node: dist/alasql.fs.js, browser: dist/alasql.min.js,
 * default: dist/alasql.fs.js }`. The `.fs` build requires `react-native-fs`,
 * which ships untranspiled Flow syntax; when the bundler resolves the `node`
 * condition for a client chunk it follows that require, fails to parse it, and
 * takes down every route in the app.
 *
 * The obvious workaround of deep-importing `alasql/dist/alasql.js` cannot work:
 * the same `exports` map exposes only `.` and `./precompile`, so any other
 * subpath is refused even though the file is present on disk. That leaves
 * aliasing to a real file path as the only reliable route, so both the bare
 * specifier and the tempting deep one are pinned to the browser build.
 *
 * This is safe rather than merely expedient: the sandbox queries fixture tables
 * held in memory and must never reach a file system.
 */
const ALASQL_BROWSER_BUILD = "./node_modules/alasql/dist/alasql.min.js";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    resolveAlias: {
      alasql: ALASQL_BROWSER_BUILD,
      "alasql/dist/alasql.js": ALASQL_BROWSER_BUILD,
    },
  },
  async redirects() {
    // Legacy product surfaces. Old URLs must never 404 or render retired UI.
    return [
      // Old candidate flows
      { source: "/s/:path*", destination: "/simulations", permanent: true },
      { source: "/apply/:path*", destination: "/simulations", permanent: true },
      { source: "/c/:path*", destination: "/simulations", permanent: true },
      { source: "/workroom/:path*", destination: "/simulations", permanent: true },
      { source: "/session/:path*", destination: "/simulations", permanent: true },
      { source: "/preview/:path*", destination: "/simulations", permanent: true },
      { source: "/candidate/:path*", destination: "/app/candidate", permanent: true },
      // Old share links
      { source: "/r/:path*", destination: "/", permanent: true },
      // Old employer surfaces
      { source: "/employer/:path*", destination: "/login", permanent: true },
      { source: "/dashboard/:path*", destination: "/app/employer", permanent: true },
      { source: "/platform/:path*", destination: "/app/employer", permanent: true },
      // /onboarding/employer is a live route, not a retired one: it names the
      // workspace for people who picked "I am hiring" after signing up without
      // a company. The catch-all used to swallow it, so that step never ran and
      // the layout silently named the workspace after their email domain. Only
      // the other legacy onboarding URLs redirect.
      { source: "/onboarding", destination: "/app/employer", permanent: true },
      {
        source: "/onboarding/:path((?!employer$).*)",
        destination: "/app/employer",
        permanent: true,
      },
      // Old internal ops
      { source: "/ops/:path*", destination: "/admin", permanent: true },
      // Old marketing pages
      { source: "/simulation", destination: "/how-it-works", permanent: true },
      { source: "/simulations", destination: "/how-it-works", permanent: true },
      { source: "/product", destination: "/how-it-works", permanent: true },
      { source: "/evidence-report", destination: "/how-it-works", permanent: true },
      { source: "/request-pilot", destination: "/contact", permanent: true },
      { source: "/security", destination: "/trust", permanent: true },
      { source: "/sample-report", destination: "/how-it-works", permanent: true },
      { source: "/work-receipts", destination: "/how-it-works", permanent: true },
      { source: "/for-finance", destination: "/how-it-works", permanent: true },
      { source: "/solutions", destination: "/how-it-works", permanent: true },
      { source: "/resources", destination: "/how-it-works", permanent: true },
      { source: "/network", destination: "/how-it-works", permanent: true },
      { source: "/company", destination: "/contact", permanent: true },
      // Old app areas
      { source: "/app/fde/:path*", destination: "/app/candidate", permanent: true },
      { source: "/app/employer/missions/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/attempts/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/evidence/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/receipts/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/decisions/:path*", destination: "/app/employer", permanent: true },
      // The retired "create a simulation" surface. Simulations now live at
      // /app/employer/workbench, which is a new path rather than a reuse of
      // this one, because a permanent redirect stays cached in browsers that
      // ever followed it.
      {
        source: "/app/employer/simulations/:path*",
        destination: "/app/employer/workbench",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
