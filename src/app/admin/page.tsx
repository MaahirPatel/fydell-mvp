import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * /admin redirects into the shared site login when signed out,
 * or into the ops overview when already authenticated.
 */
export default async function AdminEntryPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/overview");
  redirect("/login?next=admin");
}
