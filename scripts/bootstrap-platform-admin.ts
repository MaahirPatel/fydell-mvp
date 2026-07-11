/**
 * Bootstrap the initial Fydell platform administrator.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-platform-admin.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BOOTSTRAP_ADMIN_EMAIL (default admin@fydell.com)
 *
 * Never prints invitation links or passwords.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@fydell.com").trim().toLowerCase();

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;

  let user = listed.users.find((u) => (u.email || "").toLowerCase() === email);

  if (!user) {
    const invited = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: "Fydell Admin" },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.fydell.com"}/login`,
    });
    if (invited.error || !invited.data.user) {
      throw invited.error || new Error("Invite failed");
    }
    user = invited.data.user;
    console.log(`Invited ${email} via Supabase Auth (no password generated).`);
  } else {
    console.log(`Found existing Auth user for ${email}.`);
  }

  const { data: existingRoles } = await admin
    .from("platform_user_roles")
    .select("id, role, is_active")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .eq("is_active", true);

  if (existingRoles && existingRoles.length > 0) {
    console.log("super_admin role already active. Idempotent success.");
  } else {
    const { error } = await admin.from("platform_user_roles").insert({
      user_id: user.id,
      role: "super_admin",
      is_active: true,
    });
    if (error) throw error;
    console.log("Granted super_admin platform role.");
  }

  await admin.from("audit_logs").insert({
    actor_email: email,
    actor_user_id: user.id,
    action: "platform_role_granted",
    entity_type: "platform_user_roles",
    entity_id: user.id,
    after_data: { role: "super_admin" },
    metadata: { source: "bootstrap-script" },
  });

  console.log("Bootstrap complete. Accept the invite email if newly invited, then sign in at /admin.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
