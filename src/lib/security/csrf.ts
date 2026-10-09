import "server-only";
import { checkOrigin } from "./origin-check";

/** Returns null when the request may proceed, otherwise a reason. */
export function checkCsrf(req: Request): string | null {
  return checkOrigin(req);
}

export function csrfGuard(req: Request): Response | null {
  return checkCsrf(req) ? Response.json({ error: "Request blocked for security reasons." }, { status: 403 }) : null;
}
