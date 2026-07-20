import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import FydellBrand from "@/components/brand/FydellBrand";
import AppSignOutButton from "@/components/fde/AppSignOutButton";

export const metadata = { title: "Fydell — Employer" };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/app/employer", label: "Overview" },
  { href: "/app/employer/simulations", label: "Simulations" },
  { href: "/app/employer/missions", label: "Missions" },
  { href: "/app/employer/candidates", label: "Candidates" },
  { href: "/app/employer/attempts", label: "Attempts" },
  { href: "/app/employer/evidence", label: "Evidence" },
  { href: "/app/employer/decisions", label: "Decisions" },
  { href: "/app/employer/settings", label: "Settings" },
];

export default async function EmployerAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/app/employer");
  }

  let organizationName = "Your workspace";
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
      // No org yet — figure out *why* before dropping the user into the legacy
      // FP&A pilot onboarding flow, which is the wrong destination for anyone
      // who signed up through the FDE marketplace three-path picker.
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
      // account_type is "employer" (or unset, pre-marketplace legacy account) —
      // send to the matching setup flow so they can create their org.
      redirect("/onboarding/employer");
    }

    const org = membership.organizations as { name?: string } | null;
    organizationName = org?.name || organizationName;
  }

  return (
    <div className="fde-shell min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,91,255,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(59,91,255,0.06),transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/[0.08] bg-[#090B10]/90 px-3 py-4 backdrop-blur md:flex">
          <div className="px-2 pb-5">
            <FydellBrand markSize={28} wordmarkSize={18} />
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-[13px] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
                style={{ fontWeight: 450 }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto space-y-2 border-t border-white/[0.08] px-2 pt-4">
            <p className="truncate text-[12.5px] text-white/80">{organizationName}</p>
            <AppSignOutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between gap-3 border-b border-white/[0.08] px-4 sm:px-7">
            <div className="min-w-0 shrink-0 md:hidden">
              <FydellBrand markSize={24} wordmarkSize={16} />
            </div>
            <p className="hidden truncate text-[13px] text-white/55 md:block">
              Workspace: {organizationName}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/app/employer/simulations/generate"
                className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C]"
              >
                Create simulation
              </Link>
              <nav className="flex min-w-0 gap-1 overflow-x-auto md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 whitespace-nowrap rounded-[8px] px-2.5 py-1 text-[11px] text-white/55"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <div className="px-4 py-7 sm:px-7 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
