"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FydellMark from "@/components/brand/FydellMark";
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
  const pathname = usePathname();
  const role = (admin.roles[0] || "admin").replace("_", " ");

  return (
    <div className="min-h-screen bg-[#050609] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.08] bg-[#07080B] px-4 py-5 md:flex">
          <Link href="/admin/overview" className="flex items-center gap-2.5 px-2 py-1">
            <FydellMark width={26} />
            <div className="min-w-0">
              <p
                className="text-[17px] leading-none text-white"
                style={{ fontWeight: 600, letterSpacing: "-0.03em" }}
              >
                fydell
              </p>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-white/55">
                Operations
              </p>
            </div>
          </Link>

          <nav className="mt-8 flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/admin/overview" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[9px] px-3 py-2 text-[13px] transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/65 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  style={{ fontWeight: active ? 560 : 450 }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 border-t border-white/[0.08] px-1 pt-4">
            <div>
              <p className="truncate text-[12.5px] text-white">{admin.email}</p>
              <p className="mt-1 text-[11px] capitalize text-white/55">{role}</p>
            </div>
            <LogoutButton />
            <Link
              href="/"
              className="block px-1 text-[12px] text-white/45 transition-colors hover:text-white/80"
            >
              ← Back to fydell.com
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3 md:hidden">
            <Link href="/admin/overview" className="flex items-center gap-2">
              <FydellMark width={22} />
              <span className="text-[15px]" style={{ fontWeight: 600 }}>
                fydell ops
              </span>
            </Link>
            <div className="w-[108px]">
              <LogoutButton />
            </div>
          </header>
          <div className="px-5 py-7 sm:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
