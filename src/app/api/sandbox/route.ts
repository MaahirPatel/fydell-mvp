import { retiredDemoApi } from "@/lib/employer-demo/retired";

export const runtime = "nodejs";

/** The anonymous proof sandbox is retired; the employer sandbox requires an account. */
export function GET() {
  return retiredDemoApi();
}

export function POST() {
  return retiredDemoApi();
}
