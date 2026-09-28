/**
 * Desktop version declaration served at GET /api/desktop/version (DESK-19).
 *
 * The desktop client checks this before the server clock starts: a build
 * below `minSupportedVersion` is blocked with an explicit "update required"
 * screen, and a newer `latestVersion` is shown as a dismissible notice. The
 * client never restarts an in-progress assessment on its own.
 *
 * Operators raise the minimum only when the platform API stops supporting an
 * older client (set FYDELL_DESKTOP_MIN_VERSION). The default is the oldest
 * version the current API supports.
 */

/** Oldest desktop build the current platform API supports. */
export const DEFAULT_MIN_SUPPORTED_VERSION = "0.1.0";

const SEMVER = /^\d+\.\d+\.\d+$/;

export interface DesktopVersionDeclaration {
  minSupportedVersion: string;
  latestVersion?: string;
  downloadUrl?: string;
}

function compare(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/**
 * Reads and validates the declaration. Invalid operator settings are dropped
 * (and reported) rather than served: a malformed minimum must never block
 * every candidate, and a download link must be HTTPS.
 */
export function desktopVersionDeclaration(env: Record<string, string | undefined> = process.env): {
  declaration: DesktopVersionDeclaration;
  problems: string[];
} {
  const problems: string[] = [];
  let minimum = DEFAULT_MIN_SUPPORTED_VERSION;
  const configuredMin = env.FYDELL_DESKTOP_MIN_VERSION?.trim();
  if (configuredMin) {
    if (SEMVER.test(configuredMin)) minimum = configuredMin;
    else problems.push(`FYDELL_DESKTOP_MIN_VERSION is not x.y.z: ${configuredMin}`);
  }

  const declaration: DesktopVersionDeclaration = { minSupportedVersion: minimum };

  const latest = env.FYDELL_DESKTOP_LATEST_VERSION?.trim();
  if (latest) {
    if (!SEMVER.test(latest)) problems.push(`FYDELL_DESKTOP_LATEST_VERSION is not x.y.z: ${latest}`);
    else if (compare(latest, minimum) < 0) problems.push("FYDELL_DESKTOP_LATEST_VERSION is below the minimum");
    else declaration.latestVersion = latest;
  }

  const download = env.FYDELL_DESKTOP_DOWNLOAD_URL?.trim();
  if (download) {
    try {
      const url = new URL(download);
      if (url.protocol === "https:") declaration.downloadUrl = url.toString();
      else problems.push("FYDELL_DESKTOP_DOWNLOAD_URL must use HTTPS");
    } catch {
      problems.push("FYDELL_DESKTOP_DOWNLOAD_URL is not a URL");
    }
  }
  return { declaration, problems };
}
