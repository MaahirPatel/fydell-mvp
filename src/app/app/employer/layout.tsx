import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import EmployerShell from "@/components/employer/EmployerShell";
import { getEmployerCatalog } from "./_lib/catalog";

export const metadata = { title: "Employer | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/app/employer");
  }

  let workspaceName = "Your workspace";
  if (isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!membership?.organization_id) {
      // No org yet. Route the user to the setup flow that matches their
      // account type instead of assuming they are an employer.
      const { data: profile } = await admin
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.account_type === "unresolved") {
        redirect("/signup/role");
      }
      if (profile?.account_type === "fde") {
        redirect("/app/fde");
      }
      if (profile?.account_type === "partner") {
        redirect("/account/setup-required?reason=partner_pending");
      }
      redirect("/onboarding/employer");
    }

    const org = membership.organizations as { name?: string } | null;
    workspaceName = org?.name || workspaceName;
  }

  const catalog = await getEmployerCatalog();

  return (
    <EmployerShell workspaceName={workspaceName} userEmail={user.email || ""} catalog={catalog}>
      {children}
    </EmployerShell>
  );
}
