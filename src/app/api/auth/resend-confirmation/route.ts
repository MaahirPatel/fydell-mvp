import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/auth/email-confirmation";
import { safeNext } from "@/lib/auth/safe-next";
import { limitByIp, limitRequest } from "@/lib/security/route-limits";

export const dynamic = "force-dynamic";

const PER_IP = { name: "confirm-resend-ip", limit: 10, windowMs: 60 * 60_000 };
const PER_EMAIL = { name: "confirm-resend-email", limit: 3, windowMs: 60 * 60_000 };
const ANSWER = "If that address has an account waiting for confirmation, a new link is on its way. It can take a minute to arrive.";

/** Same answer whether or not the address exists, so this cannot be used to find accounts. */
export async function POST(req: Request) {
  const limited = limitByIp(req, PER_IP);
  if (limited) return limited;
  if (!isSupabaseAuthConfigured()) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });

  const raw: unknown = await req.json().catch(() => null);
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter the email address you signed up with." }, { status: 400 });
  const next = safeNext(typeof body.next === "string" ? body.next : null);

  const perEmail = limitRequest(PER_EMAIL, `email:${email}`);
  if (perEmail) return perEmail;
  await sendConfirmationEmail(await createServerSupabaseClient(), email, next);
  return NextResponse.json({ ok: true, message: ANSWER }, { headers: { "Cache-Control": "no-store" } });
}
