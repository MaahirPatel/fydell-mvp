import "server-only";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { DemoWorkspaceError } from "./store";

/**
 * Shared shape for the demo workspace API: the caller must be signed in, the
 * body is read as JSON, and every response says plainly that it was simulated.
 * The workspace is always the caller's own; no route accepts a workspace id.
 */
export async function demoRoute(req: Request, handle: (userId: string, body: unknown) => Promise<Record<string, unknown>>): Promise<NextResponse> {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the demo workspace." }, { status: 401 });
  let body: unknown = null;
  const text = await req.text().catch(() => "");
  if (text.length > 400_000) return NextResponse.json({ error: "The request is too large." }, { status: 413 });
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
    }
  }
  try {
    const result = await handle(user.id, body);
    return NextResponse.json({ ...result, demo: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DemoWorkspaceError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[employer-demo] request failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "The demo workspace could not complete that. Nothing outside the demo was changed." }, { status: 500 });
  }
}

export function badRequest(message: string): never {
  throw new DemoWorkspaceError(message, 400);
}
