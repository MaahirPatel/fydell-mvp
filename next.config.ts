import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
      { source: "/onboarding/:path*", destination: "/app/employer", permanent: true },
      // Old internal ops
      { source: "/ops/:path*", destination: "/admin", permanent: true },
      // Old marketing pages
      { source: "/simulation", destination: "/simulations", permanent: true },
      { source: "/sample-report", destination: "/", permanent: true },
      { source: "/work-receipts", destination: "/", permanent: true },
      { source: "/how-it-works", destination: "/product", permanent: true },
      { source: "/for-finance", destination: "/product", permanent: true },
      { source: "/solutions", destination: "/product", permanent: true },
      { source: "/resources", destination: "/product", permanent: true },
      { source: "/network", destination: "/product", permanent: true },
      { source: "/company", destination: "/product", permanent: true },
      // Old app areas
      { source: "/app/fde/:path*", destination: "/app/candidate", permanent: true },
      { source: "/app/employer/missions/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/attempts/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/evidence/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/receipts/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/decisions/:path*", destination: "/app/employer", permanent: true },
      { source: "/app/employer/simulations/:path*", destination: "/app/employer", permanent: true },
    ];
  },
};

export default nextConfig;
