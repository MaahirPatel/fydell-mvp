import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Never serve private app shells from a shared static cache.
  const res = await updateSession(request);
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/candidate") ||
    path.startsWith("/workroom") ||
    path.startsWith("/app") ||
    path.startsWith("/s/") ||
    path.startsWith("/r/") ||
    path.startsWith("/ops")
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
