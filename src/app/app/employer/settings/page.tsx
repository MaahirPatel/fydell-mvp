import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import SignOutButton from "@/components/employer/SignOutButton";

export const metadata = { title: "Settings | Fydell" };
export const dynamic = "force-dynamic";

export default async function EmployerSettingsPage() {
  const user = await getAuthenticatedUser();

  let workspaceName = "Your workspace";
  let memberRole = "member";
  if (user && isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("role, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    workspaceName =
      (membership?.organizations as { name?: string } | null)?.name || workspaceName;
    memberRole = membership?.role || memberRole;
  }

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-[15px] text-slate-500">Your workspace and account details.</p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Workspace
        </h2>
        <dl className="mt-3 space-y-3 text-[15px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Company</dt>
            <dd className="font-medium text-slate-900">{workspaceName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Your role</dt>
            <dd className="font-medium capitalize text-slate-900">{memberRole}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Account
        </h2>
        <dl className="mt-3 space-y-3 text-[15px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user?.email || "Not signed in"}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Data retention
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
          Candidate submissions, scores and reports are stored so your team can review them
          during hiring. Your organization stays responsible for employment decisions made
          using Fydell results.
        </p>
      </section>
    </div>
  );
}
