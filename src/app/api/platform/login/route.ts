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
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    if (verifyAdminCredentials(normalized, String(password))) {
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 503 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: String(password),
    });

    if (error || !data.user) {
      const msg = error?.message || "Invalid email or password.";
      if (/confirm|verified/i.test(msg)) {
        return NextResponse.json(
          {
            error: "Please confirm your email before signing in.",
            code: "email_not_confirmed",
          },
          { status: 403 }
        );
      }
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
    const msg = err instanceof Error ? err.message : "Could not sign in.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
