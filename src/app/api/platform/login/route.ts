import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAdminSession,
  createCompanySession,
  verifyAdminCredentials,
} from "@/lib/auth";
import { ensureBootstrapRole } from "@/lib/ops/platform-roles";
import { resolvePostLoginDestination } from "@/lib/auth/resolve-post-login";
import { ensureEmployerOnboardingRow } from "@/lib/pilot/lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseAuthConfigured } from "@/lib/supabase";
import { publicErrorMessage } from "@/lib/security/public-error";
import { loginIdentities } from "@/lib/security/route-limits";
import { checkLoginLockout, recordFailedLogin } from "@/lib/security/login-lockout";
import { checkEmailPath, emailConfirmationRequired, isEmailNotConfirmed } from "@/lib/auth/email-confirmation";
import { safeNext } from "@/lib/auth/safe-next";

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => null);
    const fields = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const email = typeof fields.email === "string" ? fields.email : "";
    const password = typeof fields.password === "string" ? fields.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    if (email.length > 254 || password.length > 256) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const normalized = email.trim().toLowerCase();
    const identities = loginIdentities(req, normalized);
    const locked = await checkLoginLockout(identities);
    if (locked) return locked;

    if (verifyAdminCredentials(normalized, password)) {
      try {
        await ensureBootstrapRole(normalized);
      } catch {
        /* bootstrap optional */
      }
      await createAdminSession(normalized);
      return NextResponse.json({
        ok: true,
        role: "platform_admin",
        redirectTo: "/admin/overview",
        onboardingComplete: true,
      });
    }

    if (!isSupabaseAuthConfigured()) {
      return NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: String(password),
    });

    // Production never confirms on someone's behalf: the person confirms from
    // their inbox. Outside production the account is confirmed and retried once.
    if (isEmailNotConfirmed(error) && emailConfirmationRequired()) {
      return NextResponse.json(
        {
          error: "Confirm your email address before signing in. Use the link we emailed you, or ask for a new one.",
          code: "email_not_confirmed",
          redirectTo: checkEmailPath(normalized, safeNext(typeof fields.next === "string" ? fields.next : null)),
        },
        { status: 403 }
      );
    }
    if (isEmailNotConfirmed(error)) {
      try {
        const admin = createAdminSupabaseClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", normalized)
          .maybeSingle();
        const userId = profile?.id as string | undefined;
        if (userId) {
          await admin.auth.admin.updateUserById(userId, { email_confirm: true });
          const retry = await supabase.auth.signInWithPassword({
            email: normalized,
            password: String(password),
          });
          data = retry.data;
          error = retry.error;
        }
      } catch {
        /* fall through to generic auth error */
      }
    }

    if (error || !data.user) {
      await recordFailedLogin(identities);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Transitional company cookie for legacy routes during migration
    await createCompanySession(data.user.id, normalized);

    try {
      await ensureEmployerOnboardingRow(data.user.id);
    } catch {
      /* table may not exist until migration applied */
    }

    const dest = await resolvePostLoginDestination(normalized, data.user.id);
    return NextResponse.json({
      ok: true,
      role: dest.kind,
      redirectTo: dest.path,
      reason: "reason" in dest ? dest.reason : undefined,
    });
  } catch (err) {
    const msg = publicErrorMessage(err, "Could not sign in.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
