import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth";
import { ensureBootstrapRole } from "@/lib/ops/platform-roles";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyAdminCredentials(email, password)) {
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
