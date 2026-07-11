import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";
import LogoutButton from "@/components/admin/LogoutButton";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";

const NAV = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/pilot-requests", label: "Pilot Requests" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/invitations", label: "Invitations" },
  { href: "/admin/email", label: "Email Center" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/settings/security", label: "Security / MFA" },
  { href: "/admin/dashboard", label: "Legacy candidates" },
];

export default function AdminShell({
  admin,
  children,
}: {
  admin: PlatformAdminContext;
  children: React.ReactNode;
}) {
  const role = admin.roles[0] || "admin";

  return (
    <div className="min-h-screen bg-[#050609] text-[#F4F5F7]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="hidden w-[232px] shrink-0 border-r border-white/[0.08] px-4 py-6 md:flex md:flex-col">
          <div className="px-2">
            <FydellBrand markSize={22} wordmarkSize={16} className="gap-2" />
            <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-white/50">
              Admin
            </p>
          </div>
          <nav className="mt-7 flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[8px] px-2.5 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-white/[0.08] px-2 pt-4">
            <p className="truncate text-[12px] text-white">{admin.email}</p>
            <p className="mt-1 text-[11px] capitalize text-white/50">
              {role.replace("_", " ")} · MFA pending
            </p>
            <div className="mt-3">
              <LogoutButton variant="dark" />
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3 md:hidden">
            <FydellBrand markSize={20} wordmarkSize={15} className="gap-2" />
            <LogoutButton variant="dark" />
          </header>
          <div className="px-5 py-7 sm:px-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
