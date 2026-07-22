import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login";
import { createCompanySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/link-invalid", url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/auth/link-invalid", url.origin));
  }

  await createCompanySession(data.user.id, data.user.email || "");
  const dest = await resolvePostLoginDestination(
    data.user.email || "",
    data.user.id
  );
  // Candidate session deep-links (/s/<token>) always win over the generic
  // account-type destination — an invited candidate must land on their mission.
  const isSessionDeepLink = next.startsWith("/s/");
  const target =
    isSessionDeepLink && dest.kind !== "admin"
      ? next
      : dest.path === "/dashboard"
        ? next
        : dest.path;
  return NextResponse.redirect(new URL(target, url.origin));
}
