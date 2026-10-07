/**
 * Turns a caught error into text that is safe to show a user.
 *
 * Domain errors thrown on purpose ("Consent is required", "Session not
 * found") read well and pass through. Anything that looks like it came from
 * the database, the network, or a programming fault is replaced with the
 * caller's fallback and logged server-side, so table names, constraint names,
 * stack details and provider messages never reach the browser.
 */
const INTERNAL =
  /violates|constraint|relation "|column |syntax error|PGRST|JWT|supabase|postgres|duplicate key|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|socket|TypeError|ReferenceError|Cannot read prop|undefined|is not a function|unexpected token|stack|at \S+ \(|\bSQL\b|permission denied|service[_ ]role|api[_ ]key|secret/i;

const MAX_PUBLIC_LENGTH = 300;

export function publicErrorMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (message && message.length <= MAX_PUBLIC_LENGTH && !INTERNAL.test(message)) return message;
  if (err !== undefined) console.error(`[api] ${fallback}:`, err);
  return fallback;
}
