import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCompanySession } from "@/lib/auth";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ensureEmployerOnboardingRow } from "@/lib/pilot/lifecycle";
import { employerSelfSignupMode } from "@/lib/org/reserved";
import { appUrl } from "@/lib/app-url";

export async function POST(req: Request) {
  try {
    const { email, password, companyName, fullName, intent } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const mode = employerSelfSignupMode();
    if (intent === "hiring" && mode === "disabled") {
      return NextResponse.json(
        { error: "Employer self-signup is disabled. Request a pilot instead." },
        { status: 403 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Authentication is not configured." },
        { status: 503 }
      );
    }

    const normalized = String(email).trim().toLowerCase();
    const supabase = await createServerSupabaseClient();
    const site = appUrl();

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password: String(password),
      options: {
        emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent("/onboarding/employer")}`,
        data: {
          full_name: fullName || null,
          company_name: companyName || null,
          intent: intent || "hiring",
          account_type: intent === "candidate" ? "candidate" : "employer",
        },
      },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Could not create account. Try signing in or use a different email." },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // Pilot: never block on email confirmation. Confirm immediately, then ensure session.
    if (!data.session) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) {
        return NextResponse.json(
          { error: confirmError.message || "Could not activate account." },
          { status: 400 }
        );
      }
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalized,
        password: String(password),
      });
      if (signInError || !signedIn.session) {
        return NextResponse.json(
          {
            error:
              signInError?.message ||
              "Account created. Sign in with the same email and password.",
          },
          { status: 400 }
        );
      }
    }

    await admin.from("profiles").upsert({
      id: userId,
      email: normalized,
      full_name: fullName || null,
      company_name: companyName || null,
      account_type: intent === "candidate" ? "candidate" : "employer",
      onboarding_state: "started",
      role: intent === "candidate" ? "candidate" : "employer",
    });

    if (intent !== "candidate") {
      try {
        await ensureEmployerOnboardingRow(userId);
        if (companyName) {
          await admin
            .from("employer_onboarding")
            .update({ company_name: String(companyName).trim() })
            .eq("user_id", userId);
        }
      } catch {
        /* migration may be pending */
      }
    }

    await createCompanySession(userId, normalized);
    return NextResponse.json({
      ok: true,
      needsConfirmation: false,
      redirectTo: intent === "candidate" ? "/login" : "/onboarding/employer",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
