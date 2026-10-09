import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth";
import { ensureBootstrapRole } from "@/lib/ops/platform-roles";
import { loginIdentities } from "@/lib/security/route-limits";
import { checkLoginLockout, recordFailedLogin } from "@/lib/security/login-lockout";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.slice(0, 254) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 256) : "";

  const identities = loginIdentities(req, email.trim().toLowerCase());
  const locked = await checkLoginLockout(identities);
  if (locked) return locked;

  if (!verifyAdminCredentials(email, password)) {
    await recordFailedLogin(identities);
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  try {
    await ensureBootstrapRole(email);
  } catch {
    // Login still proceeds; role grant can be retried via bootstrap script.
  }

  await createAdminSession(email);
  return NextResponse.json({ ok: true, redirectTo: "/admin/pilot-requests" });
}
