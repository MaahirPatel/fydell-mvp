import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { withNext } from "@/lib/auth/safe-next";
import { emailDomain, slugifyOrganization } from "@/lib/org/reserved";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import EmployerShell from "@/components/employer/EmployerShell";
import { getEmployerCatalog } from "./_lib/catalog";

export const metadata = { title: "Workspace" };
export const dynamic = "force-dynamic";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

function defaultWorkspaceName(email: string): string {
  const domain = emailDomain(email);
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return "My workspace";
  return domain;
}

async function ensureDefaultOrganization(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  email: string
): Promise<string | null> {
  const name = defaultWorkspaceName(email);
  const slug = `${slugifyOrganization(name)}-${randomBytes(3).toString("hex")}`;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      status: "active",
      pilot_stage: "setup",
      created_by: userId,
      owner_id: userId,
      owner_email: email,
      billing_email: email,
    })
    .select("id, name")
    .single();

  if (orgErr || !org) return null;

  const { error: memErr } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    invited_by: userId,
    joined_at: new Date().toISOString(),
  });

  if (memErr) {
    await admin.from("organizations").delete().eq("id", org.id);
    return null;
  }

  return org.name as string;
}

export default async function EmployerAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    const requested = (await headers()).get("x-pathname") || "/app/employer";
    redirect(withNext("/login", requested));
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
      // No org yet. Route by account type; employers (or missing type) get a
      // default workspace instead of a missing onboarding route.
      const { data: profile } = await admin
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();

      const accountType = profile?.account_type as string | null | undefined;

      if (accountType === "unresolved") {
        redirect("/signup/role");
      }
      if (accountType === "fde") {
        redirect("/app/candidate");
      }
      if (accountType === "partner") {
        redirect("/account/setup-required?reason=partner_pending");
      }

      // employer, missing, or unknown → create a default organization and continue
      const createdName = await ensureDefaultOrganization(
        admin,
        user.id,
        user.email || ""
      );
      if (!createdName) {
        redirect("/account/setup-required?reason=org_create_failed");
      }
      workspaceName = createdName;
    } else {
      const org = membership.organizations as { name?: string } | null;
      workspaceName = org?.name || workspaceName;
    }
  }

  const catalog = await getEmployerCatalog();

  return (
    <EmployerShell workspaceName={workspaceName} userEmail={user.email || ""} catalog={catalog}>
      {children}
    </EmployerShell>
  );
}
