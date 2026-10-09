import { retiredDemoApi } from "@/lib/employer-demo/retired";

export const runtime = "nodejs";

/**
 * Retired: it reset a shared namespace timestamp without an account. Each
 * signed-in employer now resets only their own demo workspace through
 * /api/employer/demo/reset.
 */
export function POST() {
  return retiredDemoApi();
}
