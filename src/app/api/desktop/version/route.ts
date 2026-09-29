import { NextResponse } from "next/server";
import { desktopVersionDeclaration } from "@/lib/desktop/version-policy";

export const dynamic = "force-dynamic";

/**
 * GET: which desktop builds the platform supports (DESK-19). Public: it
 * reveals nothing but version numbers and the published download page.
 * Contract: desktop/src-tauri/src/version.rs.
 */
export async function GET() {
  const { declaration, problems } = desktopVersionDeclaration();
  if (problems.length) console.error("[desktop/version] ignoring invalid settings:", problems);
  return NextResponse.json(declaration, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
