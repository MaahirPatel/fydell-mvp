import { NextResponse } from "next/server";
import { createPublicPilotRequest } from "@/lib/ops/pilot-requests";
import { processEmailOutbox } from "@/lib/ops/process-outbox";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hashIp } from "@/lib/ops/platform-roles";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyCaptchaToken } from "@/lib/security/captcha";

export const runtime = "nodejs";

type PilotBody = {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  candidates?: string;
  note?: string;
  captchaToken?: string;
};

function clean(value: unknown, max = 500): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Send JSON over HTTPS." }, { status: 415 });
  }

  let body: PilotBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const role = clean(body.role, 160);
  const candidates = clean(body.candidates, 80);
  const note = clean(body.note, 2000);
  const ip = clientIp(req);
  const ipKey = hashIp(ip) || "unknown";

  if (!rateLimit(`pilot:ip:${ipKey}`).ok || !rateLimit(`pilot:email:${email}`, 5).ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const captcha = await verifyCaptchaToken(body.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.error || "CAPTCHA verification failed." },
      { status: 400 }
    );
  }

  if (!name || !email || !company || !role) {
    return NextResponse.json(
      { error: "Name, work email, company, and role are required." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }

  if (!isSupabaseConfigured() && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
    return NextResponse.json(
      {
        error:
          "Request storage is temporarily unavailable. Please email admin@fydell.com or try again shortly.",
        errorId: `cfg-${Date.now().toString(36)}`,
      },
      { status: 503 }
    );
  }

  try {
    const saved = await createPublicPilotRequest({
      name,
      email,
      company,
      role,
      candidates,
      note,
      source: "request-pilot",
      sourceUrl: req.headers.get("origin") || undefined,
      referrerUrl: req.headers.get("referer") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      ip,
    });

    try {
      await processEmailOutbox(10);
    } catch {
      // outbox retains rows
    }

    return NextResponse.json({
      success: true,
      publicReference: saved.publicReference,
      createdAt: saved.createdAt,
      workEmail: saved.workEmail,
      duplicate: Boolean(saved.duplicate),
      emailQueued: true,
      message:
        "Request received. A confirmation email is being sent. A member of the Fydell team will reply within one business day.",
    });
  } catch (err) {
    const errorId = `err-${Date.now().toString(36)}`;
    console.error("[pilot-request]", errorId, err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      {
        error: "Could not save your request. Please try again.",
        errorId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST with a JSON body over HTTPS." },
    { status: 405 }
  );
}
