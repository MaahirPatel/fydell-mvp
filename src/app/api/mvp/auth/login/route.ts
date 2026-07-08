import { NextResponse } from "next/server";
import { mvpLogin } from "@/lib/mvp/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    const profile = await mvpLogin({ email, password });
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not sign in.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
