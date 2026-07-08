import "server-only";
import { getMvpSession } from "./auth";
import { createWorkspaceIfMissing } from "./db";
import type { Workspace } from "./types";

export interface ManagerContext {
  userId: string;
  email: string;
  workspace: Workspace;
}

/**
 * Resolve the logged-in employer + their workspace for manager-scoped routes.
 * Returns null when there is no session so callers can return 401. The
 * workspace is created on demand so a brand-new account is never workspace-less.
 */
export async function requireManager(): Promise<ManagerContext | null> {
  const session = await getMvpSession();
  if (!session) return null;
  const workspace = await createWorkspaceIfMissing(session.userId);
  return { userId: session.userId, email: session.email, workspace };
}
