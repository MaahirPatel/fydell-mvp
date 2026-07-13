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
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

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
    let { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: String(password),
    });

    // Pilot: if Auth still requires confirmation, confirm via service role and retry once.
    if (error && /confirm|verified/i.test(error.message || "")) {
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
