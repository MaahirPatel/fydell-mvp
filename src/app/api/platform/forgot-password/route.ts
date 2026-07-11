import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/platform-store";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    // Always return ok to avoid email enumeration.
    try {
      await requestPasswordReset(email);
    } catch {
      // Swallow provider errors for unknown emails.
    }
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link is on the way."
    });
  } catch {
    return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
  }
}
