import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login";
import { createCompanySession } from "@/lib/auth";
import {
  isCandidateDestination,
  isEmployerDestination,
  safeNext,
  withNext,
} from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = safeNext(rawNext);

  // Preserve the destination across the failure page so a candidate who clicks
  // an expired link can request a new one and still land on their evaluation.
  const linkInvalid = withNext("/auth/link-invalid", next);

  if (!code) {
    return NextResponse.redirect(new URL(linkInvalid, url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL(linkInvalid, url.origin));
  }

  await createCompanySession(data.user.id, data.user.email || "");
  const dest = await resolvePostLoginDestination(data.user.email || "", data.user.id);

  // Operators are always routed by the server. Otherwise an invited candidate
  // returns to their evaluation, and an employer returns to where they left.
  let target = dest.path;
  if (next && dest.kind !== "admin") {
    if (isCandidateDestination(next) || isEmployerDestination(next)) {
      target = next;
    } else if (dest.path === "/app/employer") {
      target = next;
    }
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
