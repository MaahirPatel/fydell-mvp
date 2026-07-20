import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/dashboard/simulations/new",
        destination: "/app/employer/simulations/generate",
        permanent: false,
      },
      {
        source: "/dashboard/simulations/:id",
        destination: "/app/employer/missions/:id",
        permanent: false,
      },
      {
        source: "/dashboard/simulations/:id/preview",
        destination: "/app/employer/missions/:id/preview",
        permanent: false,
      },
      {
        source: "/dashboard/reports/:attemptId",
        destination: "/app/employer/evidence/:attemptId",
        permanent: false,
      },
      {
        // Legacy: /simulations used to mean attempts — keep Attempts bookmark working
        // only when query ?view=attempts; library is the default at /app/employer/simulations
        source: "/app/employer/simulations/sessions",
        destination: "/app/employer/attempts",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
