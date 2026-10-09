import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPrivatePath } from "@/lib/seo/site";
import { checkOrigin } from "@/lib/security/origin-check";

const MAX_API_BODY_BYTES = 25 * 1024 * 1024;

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/") && checkOrigin(request)) {
    return NextResponse.json({ error: "Request blocked for security reasons." }, { status: 403 });
  }

  // Route handlers buffer request bodies without a size limit. The largest
  // legitimate upload (editor history import) is 10 MB.
  if (path.startsWith("/api/") && Number(request.headers.get("content-length") || 0) > MAX_API_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

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
    path.startsWith("/onboarding") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/passport/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/sim/") ||
    path.startsWith("/simulations") ||
    path.startsWith("/invite/") ||
    path.startsWith("/assess") ||
    path.startsWith("/results/") ||
    // Shared passports and receipts must stop rendering the moment access is revoked.
    path.startsWith("/p/") ||
    path.startsWith("/r/") ||
    path.startsWith("/record/") ||
    path.startsWith("/work/") ||
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
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|brand/|monaco/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
