/** Mirrors engineer_profiles_handle_shape: 3 to 30 characters, lowercase. */
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])$/;

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "fydell",
  "help",
  "login",
  "me",
  "null",
  "official",
  "root",
  "security",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "team",
  "undefined",
]);

export type HandleResult = { handle: string } | { error: string };

/** Accepts "@Maya_O" or "maya_o" and returns the stored form, or why it is not allowed. */
export function normalizeHandle(raw: string): HandleResult {
  const handle = raw.trim().replace(/^@/, "").toLowerCase();
  if (handle.length < 3) return { error: "Handles are at least 3 characters." };
  if (handle.length > 30) return { error: "Handles are at most 30 characters." };
  if (!HANDLE_RE.test(handle)) {
    return { error: "Use lowercase letters, numbers, and underscores, starting and ending with a letter or number." };
  }
  if (RESERVED.has(handle)) return { error: "That handle is reserved. Choose another." };
  return { handle };
}

/** True when the input looks like an @handle rather than an email address. */
export function looksLikeHandle(raw: string): boolean {
  const value = raw.trim();
  return !value.includes("@") || (value.startsWith("@") && !value.slice(1).includes("@"));
}
