import "server-only";
export {
  getSupabaseAdmin as createAdminSupabaseClient,
  isSupabaseConfigured,
  supabaseAdminStatus,
  type AdminClientStatus,
  type AdminClientFailure,
} from "@/lib/supabase";
