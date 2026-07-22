"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import LogoutButton from "@/components/admin/LogoutButton";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";

const NAV_GROUPS = [
  {
    label: "Ops",
    items: [
      { href: "/admin/overview", label: "Overview" },
      { href: "/admin/pilot-requests", label: "Pilot requests" },
      { href: "/admin/organizations", label: "Organizations" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/invitations", label: "Invitations" },
      { href: "/admin/repair", label: "Repair console" },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/admin/email", label: "Email center" },
      { href: "/admin/audit", label: "Audit log" },
      { href: "/admin/shadow", label: "Shadow-pilot audit" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/settings/security", label: "Security" },
      { href: "/admin/dashboard", label: "Legacy candidates" },
    ],
  },
];

export default function AdminShell({
  admin,
  children,
}: {
  admin: PlatformAdminContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = (admin.roles[0] || "admin").replaceAll("_", " ");

  return (
    <div className="min-h-screen bg-[#050609] text-[#F4F5F7]">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(900px 420px at 12% -10%, rgba(59,91,255,0.10), transparent 55%), radial-gradient(700px 360px at 100% 0%, rgba(16,185,129,0.05), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.08] bg-[#07080B]/90 px-4 py-5 backdrop-blur-sm md:flex">
          <div className="px-2 pt-1">
            <FydellBrand markSize={40} wordmarkSize={22} />
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto pb-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.1em] text-white/35">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/admin/overview" &&
                        pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
                          active
                            ? "bg-white/[0.09] text-white"
                            : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                        }`}
                        style={{ fontWeight: active ? 560 : 450 }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-white/[0.08] px-1 pt-4">
            <div>
              <p className="truncate text-[12.5px] text-white">{admin.email}</p>
              <p className="mt-1 text-[11px] capitalize text-white/50">{role}</p>
            </div>
            <LogoutButton />
            <Link
              href="/"
              className="block px-1 text-[12px] text-white/40 transition-colors hover:text-white/75"
            >
              ← Back to fydell.com
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/[0.08] bg-[#07080B]/85 px-4 py-3 backdrop-blur-sm md:hidden">
            <FydellBrand markSize={34} wordmarkSize={18} />
            <div className="w-[108px]">
              <LogoutButton />
            </div>
          </header>
          <div className="px-4 py-7 sm:px-7 lg:px-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
