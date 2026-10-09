import { redirect } from "next/navigation";
import { resolveAdminIdentity } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

/**
 * /admin redirects into the shared site login when signed out,
 * or into the ops overview when already authenticated.
 */
export default async function AdminEntryPage() {
  const admin = await resolveAdminIdentity();
  if (admin) redirect("/admin/overview");
  redirect(`/login?next=${encodeURIComponent("/admin/overview")}`);
}
