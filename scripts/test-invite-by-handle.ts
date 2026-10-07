/**
 * Live dev-database check for invite-by-handle and notifications.
 *
 * Uses the most recent sample developer account (scripts/create-sample-accounts.ts).
 * Verifies: handle validation and uniqueness, server-side handle resolution,
 * notification write/read/mark-read, and that row-level security stops a
 * signed-out client from reading notifications.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-invite-by-handle.ts
 */
import { createClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ProfileInputError, updateIdentity } from "@/lib/profile/store";
import { normalizeHandle } from "@/lib/profile/handle";
import { resolveHandleCandidate } from "@/lib/eng/invitations";
import { listNotifications, markAllRead, notifyUser } from "@/lib/notifications/store";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run: not the development project.");
  const admin = createAdminSupabaseClient();

  console.log("handle rules");
  check("accepts @Maya_O", "handle" in normalizeHandle("@Maya_O"));
  check("rejects two characters", "error" in normalizeHandle("ab"));
  check("rejects reserved", "error" in normalizeHandle("admin"));
  check("rejects trailing underscore", "error" in normalizeHandle("maya_"));

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
  const developer = (users?.users ?? [])
    .filter((u) => u.email?.startsWith("sample.developer+"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const other = (users?.users ?? []).find((u) => u.id !== developer?.id && u.email?.startsWith("sample.employer+"));
  if (!developer || !other) throw new Error("Run scripts/create-sample-accounts.ts first.");

  console.log("profile handle");
  const saved = await updateIdentity(developer.id, { handle: "@Maya" });
  check("saves normalized handle", saved.handle === "maya", saved.handle);
  let taken = false;
  try {
    await updateIdentity(other.id, { handle: "maya" });
  } catch (err) {
    taken = err instanceof ProfileInputError && /taken/.test(err.message);
  }
  check("second account cannot take the same handle", taken);

  console.log("handle resolution");
  const resolved = await resolveHandleCandidate(admin, "@MAYA");
  check("resolves to the account email server-side", "email" in resolved && resolved.email === developer.email?.toLowerCase());
  check("carries user id for notification", "userId" in resolved && resolved.userId === developer.id);
  const missing = await resolveHandleCandidate(admin, "nobody_here_123");
  check("unknown handle is a clear error", "error" in missing);

  console.log("notifications");
  const wrote = await notifyUser(developer.id, { kind: "invitation_received", title: "Test invitation", body: "From the handle test", href: "/app/candidate" });
  check("writes a notification", wrote);
  const before = await listNotifications(developer.id);
  check("lists it as unread", before.unread >= 1 && before.items.some((n) => n.title === "Test invitation"));
  const badHref = await notifyUser(developer.id, { kind: "invitation_received", title: "Bad link", href: "https://evil.example" });
  check("rejects off-site links at the database", !badHref);
  await markAllRead(developer.id);
  check("mark all read clears unread", (await listNotifications(developer.id)).unread === 0);

  console.log("row-level security");
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", { auth: { persistSession: false } });
  const { data: leaked } = await anon.from("user_notifications").select("id").limit(1);
  check("signed-out client reads nothing", (leaked ?? []).length === 0);
  const { data: profiles } = await anon.from("engineer_profiles").select("owner_id").eq("handle", "maya");
  check("signed-out client cannot map handle to account", (profiles ?? []).length === 0);

  await admin.from("user_notifications").delete().eq("user_id", developer.id).eq("title", "Test invitation");

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll invite-by-handle checks passed.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
