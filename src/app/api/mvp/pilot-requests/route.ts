import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { savePilotRequest } from "@/lib/mvp/pilot-requests";

export const runtime = "nodejs";

type PilotBody = {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  candidates?: string;
  note?: string;
};

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  // #region agent log
  fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "dc0a6c",
    },
    body: JSON.stringify({
      sessionId: "dc0a6c",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function clean(value: unknown, max = 500): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "unknown";

  debugLog(
    "pilot-requests/route.ts:entry",
    "Pilot request API hit",
    {
      contentType,
      proto,
      supabaseConfigured: isSupabaseConfigured(),
      method: req.method,
    },
    "B"
  );

  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Send JSON over HTTPS. Form data is not accepted via query string." },
      { status: 415 }
    );
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

  if (!name || !email || !company || !role) {
    return NextResponse.json(
      { error: "Name, work email, company, and role are required." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid work email." }, { status: 400 });
  }

  try {
    const saved = await savePilotRequest({
      name,
      email,
      company,
      role,
      candidates,
      note,
      source: "request-pilot",
    });

    debugLog(
      "pilot-requests/route.ts:success",
      "Pilot request stored",
      {
        id: saved.id,
        storage: isSupabaseConfigured() ? "supabase" : "local-secure-file",
      },
      "C"
    );

    return NextResponse.json({
      ok: true,
      id: saved.id,
      message: "Request received. We will reply within one business day.",
    });
  } catch (err) {
    debugLog(
      "pilot-requests/route.ts:exception",
      "Unhandled error",
      { message: err instanceof Error ? err.message : "unknown" },
      "C"
    );
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not save your request securely. Please try again.",
      },
      { status: 500 }
    );
  }
}

/** Reject GET so query-string leaks are impossible. */
export async function GET() {
  debugLog(
    "pilot-requests/route.ts:get-rejected",
    "Rejected insecure GET",
    { rejected: true },
    "A"
  );
  return NextResponse.json(
    { error: "Method not allowed. Use POST with a JSON body over HTTPS." },
    { status: 405 }
  );
}
