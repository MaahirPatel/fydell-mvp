import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Desktop version-gate declaration (DESK-19).
 *
 * The desktop client calls this before starting a session clock. It declares
 * the minimum supported desktop build; a client below the minimum is blocked
 * with an explicit message (never a silent failure, never mid-assessment).
 *
 * Values come from the environment so a release can declare them without a
 * code change. When no minimum is declared the platform answers 404 and the
 * client reports the gate as "unknown" — it proceeds, visibly, rather than
 * pretending a declaration exists.
 *
 *   FYDELL_DESKTOP_MIN_VERSION     e.g. "0.2.0"      (required to declare)
 *   FYDELL_DESKTOP_LATEST_VERSION  e.g. "0.3.1"      (optional)
 *   FYDELL_DESKTOP_DOWNLOAD_URL    e.g. "https://…"  (optional)
 *
 * This endpoint declares versions only. Authenticity (signed installers,
 * rollback protection) is release infrastructure, not this route — see the
 * release-pipeline notes in docs/fydell-build-plan.md.
 */
export async function GET() {
  const minSupportedVersion = (process.env.FYDELL_DESKTOP_MIN_VERSION || "").trim();
  if (!minSupportedVersion) {
    return NextResponse.json(
      { error: "Desktop versions are not declared by this platform" },
      { status: 404 }
    );
  }
  const latestVersion = (process.env.FYDELL_DESKTOP_LATEST_VERSION || "").trim();
  const downloadUrl = (process.env.FYDELL_DESKTOP_DOWNLOAD_URL || "").trim();
  return NextResponse.json({
    minSupportedVersion,
    ...(latestVersion ? { latestVersion } : {}),
    ...(downloadUrl ? { downloadUrl } : {}),
  });
}
