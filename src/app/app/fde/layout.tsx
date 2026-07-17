import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import FydellBrand from "@/components/brand/FydellBrand";
import AppSignOutButton from "@/components/fde/AppSignOutButton";

export const metadata = { title: "Fydell — FDE" };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/app/fde", label: "Home" },
  { href: "/app/fde/inbox", label: "Inbox" },
  { href: "/app/fde/invitations", label: "Invitations" },
  { href: "/app/fde/simulations", label: "Simulations" },
  { href: "/app/fde/receipts", label: "Work Receipts" },
  { href: "/app/fde/graph", label: "Graph" },
  { href: "/app/fde/feedback", label: "Feedback" },
  { href: "/app/fde/privacy", label: "Privacy" },
  { href: "/app/fde/settings", label: "Settings" },
];

export default async function FdeAppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/app/fde");
  }

  if (isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.account_type === "unresolved") {
      redirect("/signup/role");
    }
    if (profile?.account_type === "employer") {
      redirect("/app/employer");
    }
    if (profile?.account_type === "partner") {
      redirect("/account/setup-required?reason=partner_pending");
    }
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
            <p className="truncate text-[12.5px] text-white/80">{user.email}</p>
            <AppSignOutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4 sm:px-7">
            <div className="min-w-0 md:hidden">
              <FydellBrand markSize={24} wordmarkSize={16} />
            </div>
            <p className="hidden truncate text-[13px] text-white/55 md:block">{user.email}</p>
          </header>
          <nav className="flex min-w-0 gap-1 overflow-x-auto border-b border-white/[0.08] px-4 py-1.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] text-white/55"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-7 sm:px-7 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
