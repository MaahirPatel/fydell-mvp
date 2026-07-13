import { NextResponse } from "next/server";
import { verifyCaptchaToken } from "@/lib/security/captcha";
import { rateLimit } from "@/lib/security/rate-limit";
import { hashIp } from "@/lib/ops/platform-roles";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

const GENERIC_OK = {
  ok: true,
  message: "If an account exists for that email, a reset link has been sent.",
};

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
      return NextResponse.json(GENERIC_OK);
    }

    const captcha = await verifyCaptchaToken(captchaToken, ip);
    if (!captcha.ok) {
      return NextResponse.json(
        { error: captcha.error || "CAPTCHA verification failed." },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(GENERIC_OK);
    }

    // Always return a generic success to avoid email enumeration.
    // Send a branded Resend email with a recovery link (do not rely on Supabase SMTP alone).
    try {
      const admin = createAdminSupabaseClient();
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${appUrl()}/auth/update-password`,
        },
      });

      const actionLink =
        linkData?.properties?.action_link ||
        (linkData as { action_link?: string } | null)?.action_link;

      if (!linkError && actionLink) {
        const sent = await sendPasswordResetEmail({
          to: email,
          resetUrl: actionLink,
        });
        if (!sent.ok) {
          console.error("[forgot-password] Resend failed", sent.error);
        }
      } else if (linkError) {
        // Unknown email or Auth error — still return generic OK.
        console.error("[forgot-password] generateLink failed", linkError.message);
      }
    } catch (err) {
      console.error("[forgot-password] unexpected", err);
    }

    return NextResponse.json(GENERIC_OK);
  } catch {
    return NextResponse.json({ error: "Could not start password reset." }, { status: 500 });
  }
}
