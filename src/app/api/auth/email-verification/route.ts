import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  confirmCodeFailureMessage,
  confirmInboxCode,
  isInboxVerified,
  sendCodeFailureMessage,
  sendInboxCode,
} from "@/lib/security/email-verification";
import { limitByIp, tooManyRequests } from "@/lib/security/route-limits";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };
const CONFIRM_ATTEMPTS = { name: "email-code-confirm", limit: 30, windowMs: 60 * 60 * 1000 };

/** GET: whether the signed-in account has confirmed control of its inbox. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ email: user.email.toLowerCase(), verified: await isInboxVerified(user) }, { headers: NO_STORE });
}

/**
 * POST { action: "send" } emails a one-time code to the account's address.
 * POST { action: "confirm", code } checks it and records the confirmation.
 * The code itself is never part of any response.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const raw: unknown = await req.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const action = body?.action;

  try {
    if (action === "send") {
      const result = await sendInboxCode(user);
      if (result.ok === false) {
        if ("retryAfterSeconds" in result) {
          return tooManyRequests(result.retryAfterSeconds, sendCodeFailureMessage(result.reason));
        }
        const status = result.reason === "no_email" ? 400 : 503;
        return NextResponse.json({ error: sendCodeFailureMessage(result.reason) }, { status });
      }
      return NextResponse.json(
        result.delivery === "already_verified"
          ? { ok: true, verified: true }
          : { ok: true, verified: false, delivery: result.delivery, expiresAt: result.expiresAt },
        { headers: NO_STORE }
      );
    }

    if (action === "confirm") {
      const code = body?.code;
      if (typeof code !== "string" || code.length > 16) {
        return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
      }
      const limited = limitByIp(req, CONFIRM_ATTEMPTS);
      if (limited) return limited;
      const result = await confirmInboxCode(user, code);
      if (result.ok === false) {
        return NextResponse.json({ error: confirmCodeFailureMessage(result), reason: result.reason }, { status: 400 });
      }
      return NextResponse.json({ ok: true, verified: true }, { headers: NO_STORE });
    }

    return NextResponse.json({ error: 'Use action "send" or "confirm".' }, { status: 400 });
  } catch (err) {
    console.error("[email-verification]", err);
    return NextResponse.json({ error: "Could not confirm your email right now. Try again." }, { status: 500 });
  }
}
