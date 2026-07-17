import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import AppSignOutButton from "@/components/fde/AppSignOutButton";

export const dynamic = "force-dynamic";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  fde: "Forward Deployed Engineer",
  employer: "Employer",
  partner: "Partner",
  operator: "Operator",
};

export default async function FdeSettingsPage() {
  const user = await getAuthenticatedUser();

  let displayName: string | null = null;
  let accountType: string | null = null;
  if (user && isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, account_type")
      .eq("id", user.id)
      .maybeSingle();
    displayName = profile?.display_name || null;
    accountType = profile?.account_type || "fde";
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Settings</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Account
      </h1>

      <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Profile
        </h2>
        <dl className="mt-3 space-y-3 text-[13.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Name</dt>
            <dd className="font-medium text-white">{displayName || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Email</dt>
            <dd className="font-medium text-white">{user?.email || "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Account type</dt>
            <dd className="font-medium text-white">
              {accountType ? ACCOUNT_TYPE_LABEL[accountType] || accountType : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Session
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-white/55">
          Signing out ends your current browser session. It does not affect any in-progress
          Project Relay simulation — resume from Simulations when you sign back in.
        </p>
        <div className="mt-5">
          <AppSignOutButton />
        </div>
      </section>
    </div>
  );
}
