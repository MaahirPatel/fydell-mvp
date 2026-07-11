import "server-only";
import { getMvpSession } from "./auth";
import { getCompanySession } from "@/lib/auth";
import { createWorkspaceIfMissing } from "./db";
import { getUserById } from "@/lib/platform-store";
import type { Workspace } from "./types";

export interface ManagerContext {
  userId: string;
  email: string;
  workspace: Workspace;
}

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
      runId: "loop-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

/**
 * Resolve the logged-in employer + their workspace for manager-scoped routes.
 * Accepts either the MVP session cookie OR the company platform session so
 * signup/login → /dashboard can invite candidates without a second auth system.
 */
export async function requireManager(): Promise<ManagerContext | null> {
  const mvp = await getMvpSession();
  if (mvp) {
    const workspace = await createWorkspaceIfMissing(mvp.userId);
    debugLog(
      "guard.ts:requireManager",
      "MVP session",
      { source: "mvp", userIdPrefix: mvp.userId.slice(0, 8) },
      "H1"
    );
    return { userId: mvp.userId, email: mvp.email, workspace };
  }

  const company = await getCompanySession();
  if (company) {
    const user = await getUserById(company.userId);
    const workspace = await createWorkspaceIfMissing(
      company.userId,
      user?.companyName || "Your workspace"
    );
    debugLog(
      "guard.ts:requireManager",
      "Company session bridged",
      { source: "company", userIdPrefix: company.userId.slice(0, 8), wsId: workspace.id },
      "H1"
    );
    return { userId: company.userId, email: company.email, workspace };
  }

  debugLog("guard.ts:requireManager", "No session", { source: null }, "H1");
  return null;
}
