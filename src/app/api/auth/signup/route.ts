import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { completeEmployerOnboarding } from "@/lib/pilot/lifecycle";
import { ensureCandidateProfile, audit } from "@/lib/auth/signup-helpers";
import { seedEngineerProfileName } from "@/lib/auth/account-name";
import { employerSelfSignupMode, isReservedOrganizationName } from "@/lib/org/reserved";
import { publicErrorMessage } from "@/lib/security/public-error";
import { limitByIp, ROUTE_LIMITS } from "@/lib/security/route-limits";
export const dynamic = "force-dynamic";

type SignupPath = "employer" | "fde" | "partner";

function redirectForPath(path: SignupPath | null): string {
  if (path === "employer") return "/app/employer";
  if (path === "fde") return "/app/candidate/profile";
  if (path === "partner") return "/account/setup-required?reason=partner_pending";
  // No path chosen yet. This is the default signup flow. Role is chosen next.
  return "/signup/role";
}

/** "" when absent, null when present but not a plain https URL; bare domains get https://. */
function normalizeWebsite(value: string): string | null {
  if (!value) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    const limited = limitByIp(req, ROUTE_LIMITS.signup);
    if (limited) return limited;

    const raw: unknown = await req.json().catch(() => null);
    const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const text = (value: unknown, max: number): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
    const rawPath = text(body.path, 20);
    const path = (["employer", "fde", "partner"].includes(rawPath) ? rawPath : null) as SignupPath | null;

    const email = text(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const name = text(body.name, 160);
    const companyName = text(body.companyName, 160);
    const companyWebsite = normalizeWebsite(text(body.companyWebsite, 300));
    const firmName = text(body.firmName, 160);

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length > 256) {
      return NextResponse.json({ error: "Password must be at most 256 characters." }, { status: 400 });
    }
    if (companyWebsite === null) {
      return NextResponse.json({ error: "Enter the company website as an https:// address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (path === "employer") {
      if (employerSelfSignupMode() === "disabled") {
        return NextResponse.json(
          { error: "Employer self-signup is disabled. Request a pilot instead." },
          { status: 403 }
        );
      }
      if (!companyName) {
        return NextResponse.json({ error: "Company name is required." }, { status: 400 });
      }
      if (isReservedOrganizationName(companyName)) {
        return NextResponse.json(
          { error: "That organization name is reserved and cannot be claimed." },
          { status: 400 }
        );
      }
    }

    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const nextPath = redirectForPath(path);

    // Accounts are confirmed on creation, so no confirmation email is sent.
    // signUp() would send one, and Supabase's built-in mailer allows only a few
    // per hour, which fails sign-ups outright once exceeded.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        account_type: path || "unresolved",
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
    const emailVerifiedAt = data.user.email_confirmed_at || new Date().toISOString();

    const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !signedIn.session) {
      return NextResponse.json(
        {
          error: publicErrorMessage(signInError ?? undefined, "Account created. Sign in with the same email and password."),
        },
        { status: 400 }
      );
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: name,
      display_name: name,
      account_type: path || "unresolved",
      onboarding_state:
        path === "employer"
          ? "started"
          : path === "partner"
            ? "partner_pending_approval"
            : path === "fde"
              ? "completed"
              : "unresolved",
      email_verified_at: emailVerifiedAt,
      company_name: path === "employer" ? companyName : path === "partner" ? firmName || null : null,
    });
    if (profileError) {
      console.error(`[signup] profile write failed for ${userId}: ${profileError.message}`);
      return NextResponse.json(
        { error: "Your account was created but its profile could not be saved. Contact support before signing in." },
        { status: 500 }
      );
    }

    let redirectTo = nextPath;

    if (path === "employer") {
      await completeEmployerOnboarding({
        userId,
        email,
        companyName,
        companyWebsite: companyWebsite || null,
      });
      redirectTo = "/app/employer";
    } else if (path === "fde") {
      await ensureCandidateProfile(userId);
      await seedEngineerProfileName(userId, email, name);
      redirectTo = "/app/candidate/profile";
    } else if (path === "partner") {
      redirectTo = "/account/setup-required?reason=partner_pending";
    } else {
      redirectTo = "/signup/role";
    }

    await audit(userId, `signup.${path || "unresolved"}`, "profile", userId, {
      path: path || "unresolved",
      email,
    });

    return NextResponse.json({ ok: true, redirectTo });
  } catch (err) {
    const msg = publicErrorMessage(err, "Could not create account.");
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
