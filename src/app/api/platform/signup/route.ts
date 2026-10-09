import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCompanySession } from "@/lib/auth";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { ensureEmployerOnboardingRow } from "@/lib/pilot/lifecycle";
import { employerSelfSignupMode } from "@/lib/org/reserved";
import { appUrl } from "@/lib/app-url";
import { publicErrorMessage } from "@/lib/security/public-error";
import { limitByIp, ROUTE_LIMITS } from "@/lib/security/route-limits";
import { checkEmailPath, emailConfirmationRequired } from "@/lib/auth/email-confirmation";
import { passwordProblem } from "@/lib/auth/password-policy";

export async function POST(req: Request) {
  const limited = limitByIp(req, ROUTE_LIMITS.signup);
  if (limited) return limited;
  try {
    const raw: unknown = await req.json().catch(() => null);
    const fields = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const text = (value: unknown, max: number): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
    const email = text(fields.email, 254);
    const password = typeof fields.password === "string" ? fields.password : "";
    const companyName = text(fields.companyName, 160);
    const fullName = text(fields.fullName, 160);
    const intent = fields.intent === "candidate" ? "candidate" : fields.intent === "hiring" ? "hiring" : undefined;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    const weak = passwordProblem(password, email);
    if (weak) {
      return NextResponse.json({ error: weak }, { status: 400 });
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
        emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent("/app/employer")}`,
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
      return NextResponse.json({ error: publicErrorMessage(error, "Could not create account.") }, { status: 400 });
    }

    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Could not create account. Try signing in or use a different email." },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // Production waits for the person to confirm from their inbox; elsewhere the
    // account is confirmed immediately and signed in.
    const awaitingConfirmation = !data.session && emailConfirmationRequired();
    if (!data.session && !awaitingConfirmation) {
      const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) {
        return NextResponse.json(
          { error: publicErrorMessage(confirmError, "Could not activate account.") },
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
            error: publicErrorMessage(signInError ?? undefined, "Account created. Sign in with the same email and password."),
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

    if (awaitingConfirmation) {
      return NextResponse.json({ ok: true, needsConfirmation: true, redirectTo: checkEmailPath(normalized, null) });
    }
    await createCompanySession(userId, normalized);
    return NextResponse.json({
      ok: true,
      needsConfirmation: false,
      redirectTo: intent === "candidate" ? "/login" : "/app/employer",
    });
  } catch (err) {
    const msg = publicErrorMessage(err, "Could not create account.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
