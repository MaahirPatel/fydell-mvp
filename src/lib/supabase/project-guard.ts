/**
 * Environment boundary for Supabase credentials.
 *
 * One careless environment variable is all it takes to point a staging server
 * at the production database, so the check lives in code rather than in a
 * runbook. The guard runs before any client is constructed and refuses to hand
 * back a client when the credentials disagree about which project they belong
 * to.
 *
 * It never logs or returns a key. Errors name project references only.
 */

/** fydell, production. Never a default, never implicit. */
export const PRODUCTION_PROJECT_REF = "qtrhwrcxthtqvkeerptp";

/** fydell-dev, the only project Wave 1 acceptance may write to. */
export const STAGING_PROJECT_REF = "btbmvrvynnrhapjdkunz";

/**
 * Production is reachable only when the deployment says so out loud. Anything
 * else (a laptop, CI, a preview build, an acceptance run) fails closed.
 */
const PRODUCTION_OPT_IN = "FYDELL_ALLOW_PRODUCTION_DB";

export class SupabaseProjectMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseProjectMismatchError";
  }
}

/** `https://<ref>.supabase.co` → `<ref>`. Returns null when unparseable. */
export function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Legacy Supabase keys are JWTs carrying a `ref` claim. Modern `sb_secret_…`
 * and `sb_publishable_…` keys carry no project reference, so this returns null
 * for them and the caller treats the binding as unverifiable rather than
 * mismatched.
 */
export function projectRefFromKey(key: string | undefined): string | null {
  if (!key) return null;
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const ref = payload?.ref;
    return typeof ref === "string" && ref ? ref : null;
  } catch {
    return null;
  }
}

function isServiceRoleKey(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 3) return value.startsWith("sb_secret_");
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * True when a value has the shape of a real service-role key (legacy JWT with
 * `role: service_role`, or a modern `sb_secret_…` secret). Placeholders such as
 * `paste-your-key-here` must not count as configured: treating them as ready
 * lets signup create Auth users and then fail on the first admin call.
 *
 * Never log or return the value.
 */
export function isPlausibleServiceRoleKey(value: string | undefined): boolean {
  if (!value) return false;
  if (value.startsWith("sb_secret_")) return value.length >= 24;
  return isServiceRoleKey(value);
}

/**
 * A service-role key in a NEXT_PUBLIC_ variable is shipped to the browser by
 * Next.js. That is unrecoverable once deployed, so it is a hard stop.
 */
function assertNoPublicServiceKey(env: NodeJS.ProcessEnv): void {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("NEXT_PUBLIC_") || !value) continue;
    if (isServiceRoleKey(value)) {
      throw new SupabaseProjectMismatchError(
        `${name} contains a service-role key. NEXT_PUBLIC_ variables are sent to the browser; move it to a server-only variable.`
      );
    }
  }
}

export interface ProjectBinding {
  url: string;
  ref: string;
  serviceKeyBound: boolean;
  anonKeyBound: boolean;
}

/**
 * Throws unless the URL, the anon key and the service key all resolve to the
 * same project, and that project is allowed in this environment.
 */
export function assertProjectBinding(
  env: NodeJS.ProcessEnv = process.env,
  options: { requireServiceKey?: boolean } = {}
): ProjectBinding {
  assertNoPublicServiceKey(env);

  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const urlRef = projectRefFromUrl(url);
  if (!url || !urlRef) {
    throw new SupabaseProjectMismatchError(
      "Supabase URL is missing or is not a https://<project-ref>.supabase.co URL."
    );
  }

  if (urlRef === PRODUCTION_PROJECT_REF && env[PRODUCTION_OPT_IN] !== "true") {
    throw new SupabaseProjectMismatchError(
      `Refusing to start against the production project (${PRODUCTION_PROJECT_REF}). ` +
        `Set ${PRODUCTION_OPT_IN}=true only in the production deployment.`
    );
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (options.requireServiceKey && !serviceKey) {
    throw new SupabaseProjectMismatchError("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  if (options.requireServiceKey && serviceKey && !isPlausibleServiceRoleKey(serviceKey)) {
    throw new SupabaseProjectMismatchError(
      "SUPABASE_SERVICE_ROLE_KEY is set but is not a service-role key."
    );
  }

  const serviceRef = projectRefFromKey(serviceKey);
  if (serviceRef && serviceRef !== urlRef) {
    throw new SupabaseProjectMismatchError(
      `Service-role key belongs to project ${serviceRef} but the URL points at ${urlRef}. ` +
        "Refusing to start: these must be the same project."
    );
  }
  if (serviceRef === PRODUCTION_PROJECT_REF && env[PRODUCTION_OPT_IN] !== "true") {
    throw new SupabaseProjectMismatchError(
      `Refusing to use a production service-role key (${PRODUCTION_PROJECT_REF}).`
    );
  }

  const anonRef = projectRefFromKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (anonRef && anonRef !== urlRef) {
    throw new SupabaseProjectMismatchError(
      `Anon key belongs to project ${anonRef} but the URL points at ${urlRef}. ` +
        "Refusing to start: these must be the same project."
    );
  }

  return {
    url,
    ref: urlRef,
    serviceKeyBound: serviceRef === urlRef,
    anonKeyBound: anonRef === urlRef,
  };
}
