import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type Failure = { ok: false; status: number; error: string };

export const UUID = /^[0-9a-f-]{36}$/;

export async function passportIdFor(ownerId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
