import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/platform-store";
import {
  createAdminSession,
  createCompanySession,
  verifyAdminCredentials,
} from "@/lib/auth";
import { ensureBootstrapRole } from "@/lib/ops/platform-roles";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const normalized = String(email).trim().toLowerCase();

    // Platform administrators use the same /login form.
    if (verifyAdminCredentials(normalized, String(password))) {
      try {
        await ensureBootstrapRole(normalized);
      } catch {
        // Role grant can be retried via bootstrap script.
      }
      await createAdminSession(normalized);
      return NextResponse.json({
        ok: true,
        role: "platform_admin",
        redirectTo: "/admin/overview",
        onboardingComplete: true,
      });
    }

    const user = await verifyUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await createCompanySession(user.id, user.email);
    return NextResponse.json({
      ok: true,
      role: "employer",
      redirectTo: user.onboardingComplete ? "/dashboard" : "/onboarding",
      onboardingComplete: user.onboardingComplete,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not sign in.";
    const status = /confirm your email/i.test(msg) ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
