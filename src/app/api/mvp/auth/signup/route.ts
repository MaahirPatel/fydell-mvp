import { NextResponse } from "next/server";
import { mvpSignup } from "@/lib/mvp/auth";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, companyName } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    const { profile, workspace } = await mvpSignup({ email, password, fullName, companyName });
    return NextResponse.json({ ok: true, profile, workspace });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
