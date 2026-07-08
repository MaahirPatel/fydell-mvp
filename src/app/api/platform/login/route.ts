import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/platform-store";
import { createCompanySession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    const user = await verifyUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    await createCompanySession(user.id, user.email);
    return NextResponse.json({
      ok: true,
      onboardingComplete: user.onboardingComplete
    });
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
