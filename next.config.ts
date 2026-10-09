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
  // Scenario packages (candidate files) and their server-only evaluation
  // material are read from disk by the session, run and analysis routes.
  // Serverless output tracing cannot see dynamic fs reads, so bundle them
  // explicitly; without this, filePackage is null and runs cannot evaluate.
  outputFileTracingIncludes: {
    "/api/sim/**/*": ["./scenarios/**/*"],
  },
  turbopack: {
    resolveAlias: {
      alasql: ALASQL_BROWSER_BUILD,
      "alasql/dist/alasql.js": ALASQL_BROWSER_BUILD,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    // Legacy product surfaces. Old URLs must never 404 or render retired UI.
    return [
      // Old candidate flows
      { source: "/s/:path*", destination: "/products/simulations", permanent: true },
      { source: "/apply/:path*", destination: "/products/simulations", permanent: true },
      { source: "/c/:path*", destination: "/products/simulations", permanent: true },
      { source: "/workroom/:path*", destination: "/products/simulations", permanent: true },
      { source: "/session/:path*", destination: "/products/simulations", permanent: true },
      { source: "/preview/:path*", destination: "/products/simulations", permanent: true },
      { source: "/candidate/:path*", destination: "/app/candidate", permanent: true },
      // Old share links
      { source: "/r/:path*", destination: "/", permanent: true },
      // Old employer surfaces
      { source: "/employer/:path*", destination: "/login", permanent: true },
      { source: "/dashboard/:path*", destination: "/app/employer", permanent: true },
      { source: "/platform/:path*", destination: "/app/employer", permanent: true },
      // /onboarding/employer and /onboarding/engineer are the live first-run
      // routes for each kind of account. The catch-all used to swallow them, so
      // those steps never ran. Only the other legacy onboarding URLs redirect.
      { source: "/onboarding", destination: "/app/employer", permanent: true },
      {
        source: "/onboarding/:path((?!employer$|engineer$).*)",
        destination: "/app/employer",
        permanent: true,
      },
      // Old internal ops
      { source: "/ops/:path*", destination: "/admin", permanent: true },
      // Old marketing pages
      { source: "/simulation", destination: "/products/simulations", permanent: true },
      { source: "/simulations", destination: "/products/simulations", permanent: true },
      { source: "/evidence-report", destination: "/products", permanent: true },
      { source: "/request-pilot", destination: "/contact", permanent: true },
      { source: "/security", destination: "/trust", permanent: true },
      { source: "/sample-report", destination: "/products", permanent: true },
      { source: "/work-receipts", destination: "/products", permanent: true },
      { source: "/for-finance", destination: "/products", permanent: true },
      { source: "/solutions", destination: "/products", permanent: true },
      { source: "/resources", destination: "/products", permanent: true },
      { source: "/network", destination: "/products", permanent: true },
      { source: "/company", destination: "/contact", permanent: true },
      // Old app areas
      { source: "/app/fde/:path*", destination: "/app/candidate", permanent: true },
      { source: "/app/employer/missions/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/attempts/:path*", destination: "/app/employer", permanent: true },
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
