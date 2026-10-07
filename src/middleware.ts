import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPrivatePath } from "@/lib/seo/site";

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
    path.startsWith("/assess") ||
    path.startsWith("/results/") ||
    // Shared passports and receipts must stop rendering the moment access is revoked.
    path.startsWith("/p/") ||
    path.startsWith("/r/") ||
    path.startsWith("/receipts") ||
    path.startsWith("/api/")
  ) {
    res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  if (isPrivatePath(path)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
