import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { displayNameFrom } from "@/lib/workspace/identity";

const MAX_NAME = 80;

function emailLocal(email: string): string {
  return email.split("@")[0] ?? "";
}

/**
 * The name to put on an engineer's profile and passport: the one they chose
 * on their profile, else the one they typed at signup, else (only when no
 * name was ever given) their email's local part. A GitHub login is never a
 * name; it is stored separately as the account it came from.
 */
export async function accountDisplayName(userId: string, email: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const [{ data: engineer }, { data: profile }] = await Promise.all([
    admin.from("engineer_profiles").select("display_name").eq("owner_id", userId).maybeSingle(),
    admin.from("profiles").select("full_name, display_name").eq("id", userId).maybeSingle(),
  ]);
  const local = emailLocal(email);
  const chosen = ((engineer as { display_name?: string | null } | null)?.display_name ?? "").trim();
  // Rows created before signup seeding carry the email local part; that is not a choice.
  if (chosen && chosen !== local) return chosen.slice(0, MAX_NAME);
  const given = displayNameFrom(profile as { full_name?: string | null; display_name?: string | null } | null);
  return (given || chosen || local).slice(0, MAX_NAME);
}

/**
 * Creates the engineer profile with the signup name, or replaces a name that
 * was only ever the email local part. A name the engineer chose is kept.
 */
export async function seedEngineerProfileName(userId: string, email: string, name: string): Promise<void> {
  const trimmed = name.trim().slice(0, MAX_NAME);
  if (!trimmed) return;
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("engineer_profiles").select("display_name").eq("owner_id", userId).maybeSingle();
  if (!existing) {
    await admin.from("engineer_profiles").upsert({ owner_id: userId, display_name: trimmed }, { onConflict: "owner_id", ignoreDuplicates: true });
    return;
  }
  const current = ((existing as { display_name?: string | null }).display_name ?? "").trim();
  if (!current || current === emailLocal(email)) {
    await admin.from("engineer_profiles").update({ display_name: trimmed }).eq("owner_id", userId);
  }
}
