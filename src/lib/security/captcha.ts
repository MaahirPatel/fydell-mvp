import "server-only";

export type CaptchaResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

function captchaDisabled(): boolean {
  return process.env.CAPTCHA_DISABLED === "true";
}

/**
 * Verify Cloudflare Turnstile token.
 * Skips in non-production when TURNSTILE_SECRET_KEY is unset (local DX).
 * Production requires configuration unless CAPTCHA_DISABLED=true.
 */
export async function verifyCaptchaToken(
  token: string | null | undefined,
  ip?: string | null
): Promise<CaptchaResult> {
  if (captchaDisabled()) {
    return { ok: true, skipped: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  if (!secret) {
    // Do not brick production forms before Turnstile is configured.
    // Once NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, secret becomes mandatory.
    if (isProd && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      return { ok: false, error: "CAPTCHA not configured" };
    }
    return { ok: true, skipped: true };
  }

  if (!token || typeof token !== "string" || token.length < 10) {
    return { ok: false, error: "Complete the CAPTCHA challenge." };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { ok: false, error: "CAPTCHA verification failed." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "CAPTCHA verification unavailable." };
  }
}
