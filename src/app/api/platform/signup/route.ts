import { NextResponse } from "next/server";
import { createUser } from "@/lib/platform-store";
import { createCompanySession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, companyName } = await req.json();
    if (!email || !password || !companyName) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    const user = await createUser(email, password, companyName);
    await createCompanySession(user.id, user.email);
    return NextResponse.json({
      ok: true,
      onboardingComplete: user.onboardingComplete
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
