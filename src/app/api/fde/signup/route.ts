import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { completeEmployerOnboarding } from "@/lib/pilot/lifecycle";
import { ensureFdeProfile, audit } from "@/lib/fde/lifecycle";
import { isReservedOrganizationName } from "@/lib/org/reserved";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

type SignupPath = "employer" | "fde" | "partner";

function redirectForPath(path: SignupPath): string {
  if (path === "employer") return "/app/employer/missions/new";
  if (path === "fde") return "/app/fde";
  return "/account/setup-required?reason=partner_pending";
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    const body = await req.json();
    const path = String(body.path || "") as SignupPath;
    if (!["employer", "fde", "partner"].includes(path)) {
      return NextResponse.json({ error: "Invalid signup path." }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const companyName = body.companyName ? String(body.companyName).trim() : "";
    const companyWebsite = body.companyWebsite ? String(body.companyWebsite).trim() : "";
    const firmName = body.firmName ? String(body.firmName).trim() : "";

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (path === "employer") {
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
    const site = appUrl();
    const nextPath = redirectForPath(path);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        data: {
          full_name: name,
          account_type: path,
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
    let emailVerifiedAt: string | null = data.user?.email_confirmed_at || null;

    // Never block on email confirmation for now — keep working like the pilot flow.
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
      emailVerifiedAt = new Date().toISOString();

      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
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
      email,
      full_name: name,
      display_name: name,
      account_type: path,
      onboarding_state:
        path === "employer" ? "started" : path === "partner" ? "partner_pending_approval" : "completed",
      email_verified_at: emailVerifiedAt,
      company_name: path === "employer" ? companyName : path === "partner" ? firmName || null : null,
    });

    let redirectTo = nextPath;

    if (path === "employer") {
      await completeEmployerOnboarding({
        userId,
        email,
        companyName,
        companyWebsite: companyWebsite || null,
      });
      redirectTo = "/app/employer/missions/new";
    } else if (path === "fde") {
      await ensureFdeProfile(userId);
      redirectTo = "/app/fde";
    } else {
      redirectTo = "/account/setup-required?reason=partner_pending";
    }

    await audit(userId, `signup.${path}`, "profile", userId, { path, email });

    return NextResponse.json({ ok: true, redirectTo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
