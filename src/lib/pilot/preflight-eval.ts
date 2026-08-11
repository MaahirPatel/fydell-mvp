/** Pure preflight evaluation (no DB). */

export interface PreflightPayload {
  browserOk: boolean;
  desktopSuitable: boolean;
  networkOk: boolean;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  limitations: string[];
}

/** Evaluate real client-reported checks server-side (never invent pass). */
export function evaluatePreflight(raw: {
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  localStorageOk?: boolean;
  networkOk?: boolean;
}): PreflightPayload {
  const width = Math.max(0, Number(raw.viewportWidth) || 0);
  const height = Math.max(0, Number(raw.viewportHeight) || 0);
  const ua = String(raw.userAgent || "").slice(0, 500);
  const limitations: string[] = [];

  const browserOk = Boolean(ua) && !/bot|crawler|spider/i.test(ua);
  if (!browserOk) limitations.push("Unsupported or missing browser identity");

  const desktopSuitable = width >= 1024 && height >= 640;
  if (!desktopSuitable) {
    limitations.push(
      "Desktop viewport required (min 1024x640). Use a laptop or desktop before starting."
    );
  }

  const networkOk = raw.networkOk === true;
  if (!networkOk) limitations.push("API reachability check failed");

  if (raw.localStorageOk === false) {
    limitations.push("Local temporary storage unavailable; refresh recovery may be limited");
  }

  return {
    browserOk,
    desktopSuitable,
    networkOk,
    viewportWidth: width,
    viewportHeight: height,
    userAgent: ua,
    limitations,
  };
}
