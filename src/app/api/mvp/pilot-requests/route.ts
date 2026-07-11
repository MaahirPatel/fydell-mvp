import { POST as publicPost, GET as publicGet } from "@/app/api/public/pilot-requests/route";

export const runtime = "nodejs";

/** @deprecated Prefer /api/public/pilot-requests */
export async function POST(req: Request) {
  return publicPost(req);
}

export async function GET() {
  return publicGet();
}
