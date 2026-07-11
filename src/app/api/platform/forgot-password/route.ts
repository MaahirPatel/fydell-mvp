import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/platform-store";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashIp } from "@/lib/ops/platform-roles";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const ip = clientIp(req);
    const ipKey = hashIp(ip) || "unknown";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!rateLimit(`forgot:ip:${ipKey}`, 10).ok || !rateLimit(`forgot:email:${email}`, 5).ok) {
      // Still generic to avoid enumeration via timing of 429 alone on email existence
      return NextResponse.json({
        ok: true,
        message: "If an account exists for that email, a reset link has been sent.",
      });
    }

    const captcha = await verifyCaptchaToken(captchaToken, ip);
    if (!captcha.ok) {
      return NextResponse.json(
        { error: captcha.error || "CAPTCHA verification failed." },
        { status: 400 }
      );
    }

    // Always return ok to avoid email enumeration.
    try {
      await requestPasswordReset(email);
    } catch {
      // Swallow provider errors for unknown emails.
    }
    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
  }
}
