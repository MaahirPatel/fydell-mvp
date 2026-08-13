import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // A layout cannot read the request path, so it is forwarded here. Without it
  // an unauthenticated hit on any employer sub-route would send the reviewer to
  // the workspace root after signing in instead of the page they asked for.
  request.headers.set("x-pathname", `${path}${request.nextUrl.search}`);

  // Never serve private app shells from a shared static cache.
  const res = await updateSession(request);
  if (
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/app") ||
    path.startsWith("/sim/") ||
    path.startsWith("/simulations") ||
    path.startsWith("/invite/") ||
    path.startsWith("/results/")
  ) {
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
