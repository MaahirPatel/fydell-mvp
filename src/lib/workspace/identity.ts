/**
 * Who the signed-in person is, resolved from what they actually gave us.
 *
 * Signup writes `full_name` (and `display_name`) to `profiles` and mirrors the
 * name into auth user metadata, so both are real sources. An email local part
 * is a login, not a name, and is only used when no name was ever provided.
 *
 * These are pure functions so the same rule holds in the shell, in settings and
 * in any future surface, rather than each one inventing its own fallback.
 */

export interface ProfileIdentityRow {
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

/** The `user_metadata` shape Supabase returns for accounts created by signup. */
export interface AuthIdentityMetadata {
  full_name?: unknown;
  name?: unknown;
  avatar_url?: unknown;
  picture?: unknown;
}

function firstNonEmpty(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The name to show. Empty string means the person genuinely has no name on
 * record, which callers should render as the email rather than inventing one.
 */
export function displayNameFrom(
  profile: ProfileIdentityRow | null | undefined,
  metadata?: AuthIdentityMetadata | null
): string {
  return firstNonEmpty(
    profile?.full_name,
    profile?.display_name,
    asString(metadata?.full_name),
    asString(metadata?.name)
  );
}

/**
 * Only http(s) and data-free image URLs we stored ourselves or received from an
 * identity provider. Anything else returns null so the initials render instead
 * of a broken or hostile image reference.
 */
export function avatarUrlFrom(
  profile: ProfileIdentityRow | null | undefined,
  metadata?: AuthIdentityMetadata | null
): string | null {
  const candidate = firstNonEmpty(
    profile?.avatar_url,
    asString(metadata?.avatar_url),
    asString(metadata?.picture)
  );
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * One or two letters from the name the person gave. Falls back to the email
 * local part only when there is no name at all.
 */
export function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.split("@")[0] || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** What the account area needs, in one object. */
export interface MemberIdentity {
  name: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

export function memberIdentity(
  email: string,
  profile: ProfileIdentityRow | null | undefined,
  metadata?: AuthIdentityMetadata | null
): MemberIdentity {
  const name = displayNameFrom(profile, metadata);
  return {
    name,
    email,
    avatarUrl: avatarUrlFrom(profile, metadata),
    initials: initialsFrom(name, email),
  };
}
