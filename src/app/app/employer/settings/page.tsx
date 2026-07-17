import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import AppSignOutButton from "@/components/fde/AppSignOutButton";

export const dynamic = "force-dynamic";

export default async function EmployerSettingsPage() {
  const user = await getAuthenticatedUser();

  let organizationName = "Your workspace";
  let role = "member";
  if (user && isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("role, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    organizationName = (membership?.organizations as { name?: string } | null)?.name || organizationName;
    role = membership?.role || role;
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Settings</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Account &amp; workspace
      </h1>

      <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Workspace
        </h2>
        <dl className="mt-3 space-y-3 text-[13.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Organization</dt>
            <dd className="font-medium text-white">{organizationName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Your role</dt>
            <dd className="font-medium capitalize text-white">{role}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Account
        </h2>
        <dl className="mt-3 space-y-3 text-[13.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Email</dt>
            <dd className="font-medium text-white">{user?.email || "—"}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <AppSignOutButton />
        </div>
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Data processing &amp; retention
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-white/60">
          Session evidence, fit scores, and predictive hire estimates are stored for your hiring
          process and candidate Work Receipts. Export any session&apos;s audit package from Evidence
          Room. Enterprise DPA / subprocessors documentation is available on request for procurement.
          Your organization remains the controller for employment decisions made using Fydell outputs.
        </p>
      </section>
    </div>
  );
}
