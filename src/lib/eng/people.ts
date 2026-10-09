import "server-only";
import type { Admin } from "./context";
import { displayNameFrom } from "@/lib/workspace/identity";

interface ProfileNameRow {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
}

// Every column, so an optional name column missing from one environment cannot fail the read.
const ALL = "*";

function label(row: ProfileNameRow): string | null {
  return displayNameFrom(row) || row.email || null;
}

/** Display names for team members by user id, falling back to their email. */
export async function namesById(db: Admin, ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  const { data } = await db.from("profiles").select(ALL).in("id", unique);
  for (const row of (data ?? []) as ProfileNameRow[]) {
    const name = label(row);
    if (name) out.set(row.id, name);
  }
  return out;
}

/**
 * Display names for team members recorded by email (report reviewers,
 * approvals). Keys are the emails as given; unknown emails map to themselves.
 */
export async function namesByEmail(db: Admin, emails: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(emails.filter((e): e is string => Boolean(e && e.includes("@"))))];
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;
  const lower = new Map(unique.map((e) => [e.toLowerCase(), e]));
  const { data } = await db.from("profiles").select(ALL).in("email", [...lower.keys()]);
  for (const row of (data ?? []) as ProfileNameRow[]) {
    const original = row.email ? lower.get(row.email.toLowerCase()) : undefined;
    const name = label(row);
    if (original && name) out[original] = name;
  }
  for (const e of unique) out[e] ??= e;
  return out;
}
