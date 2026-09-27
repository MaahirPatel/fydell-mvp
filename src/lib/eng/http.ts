import "server-only";
import { NextResponse } from "next/server";
import { AttemptError } from "./attempts";
import { ReportError } from "./reports";
import { jsonError } from "./context";

/**
 * Library functions throw authored, user-facing messages. Anything else is an
 * unexpected fault: it is logged with a reference and the caller gets a
 * generic message rather than a database error string.
 */
export function errorResponse(err: unknown, scope: string): NextResponse {
  if (err instanceof ReportError) return jsonError(err.status, err.message, { problems: err.problems });
  if (err instanceof AttemptError) return jsonError(err.status, err.message);
  if (err instanceof Error && !/^Could not .*: /.test(err.message) && err.message.length < 400) {
    return jsonError(400, err.message);
  }
  const reference = `ENG-${Date.now().toString(36).toUpperCase()}`;
  console.error(`[eng:${scope}] ${reference}`, err);
  return jsonError(500, `Something went wrong on our side. Reference ${reference}.`);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function ok<T extends Record<string, unknown>>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
