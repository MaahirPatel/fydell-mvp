import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login";
import { createCompanySession } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  isCandidateDestination,
  isEmployerDestination,
  safeAdminNext,
  safeNext,
  withNext,
} from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";

const OTP_TYPES = ["signup", "email", "magiclink", "recovery", "invite", "email_change"] as const;
type OtpType = (typeof OTP_TYPES)[number];

function otpTypeOf(value: string | null): OtpType | null {
  return OTP_TYPES.find((t) => t === value) ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const next = safeNext(rawNext);

  // Preserve the destination across the failure page so a candidate who clicks
  // an expired link can request a new one and still land on their evaluation.
  const linkInvalid = withNext("/auth/link-invalid", next);

  const tokenHash = url.searchParams.get("token_hash");
  const otpType = otpTypeOf(url.searchParams.get("type"));
  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(new URL(linkInvalid, url.origin));
  }

  const supabase = await createServerSupabaseClient();
  // A token_hash link (from the email templates) works on any device; a PKCE
  // code only in the browser that asked for it.
  const { data, error } =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      : await supabase.auth.exchangeCodeForSession(code ?? "");
  if (error || !data.user) {
    return NextResponse.redirect(new URL(linkInvalid, url.origin));
  }
  if (data.user.email_confirmed_at) {
    await createAdminSupabaseClient()
      .from("profiles")
      .update({ email_verified_at: data.user.email_confirmed_at })
      .eq("id", data.user.id)
      .is("email_verified_at", null);
  }

  await createCompanySession(data.user.id, data.user.email || "");
  const dest = await resolvePostLoginDestination(data.user.email || "", data.user.id);

  // Operators are always routed by the server. Otherwise an invited candidate
  // returns to their evaluation, and an employer returns to where they left.
  let target = dest.path;
  if (dest.kind === "admin") {
    target = safeAdminNext(rawNext) ?? dest.path;
  } else if (next) {
    if (isCandidateDestination(next) || isEmployerDestination(next)) {
      target = next;
    } else if (dest.path === "/app/employer") {
      target = next;
    }
  }

  return NextResponse.redirect(new URL(target, url.origin));
}
