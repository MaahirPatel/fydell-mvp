"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import LogoutButton from "@/components/admin/LogoutButton";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";
import { hasPermission, type AdminPermission } from "@/lib/ops/admin-permissions";

type NavItem = { href: string; label: string; permission: AdminPermission | null };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Ops",
    items: [
      { href: "/admin/overview", label: "Overview", permission: null },
      { href: "/admin/activity", label: "Activity", permission: "ops.view" },
      { href: "/admin/operations", label: "Stuck work", permission: "ops.view" },
      { href: "/admin/cases", label: "Cases", permission: "ops.view" },
      { href: "/admin/pilot-requests", label: "Pilot requests", permission: "commercial.view" },
      { href: "/admin/organizations", label: "Organizations", permission: "accounts.view" },
      { href: "/admin/users", label: "Users", permission: "accounts.view" },
      { href: "/admin/invitations", label: "Invitations", permission: "invitations.manage" },
      { href: "/admin/data-requests", label: "Data requests", permission: "data_requests.handle" },
      { href: "/admin/repair", label: "Repair console", permission: null },
    ],
  },
  {
    label: "Delivery",
    items: [
      { href: "/admin/email", label: "Email center", permission: "notifications.view" },
      { href: "/admin/audit", label: "Audit log", permission: "audit.view" },
      { href: "/admin/shadow", label: "Shadow-pilot audit", permission: "reports.review" },
      { href: "/admin/proof", label: "Proof review", permission: "reports.review" },
      { href: "/admin/engineering", label: "Engineering review", permission: "reports.review" },
      { href: "/admin/reviews", label: "Report reviews", permission: "reports.review" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/admin/settings", label: "Settings", permission: "settings.manage" },
      { href: "/admin/settings/security", label: "Security", permission: null },
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
  const role = admin.roles.map((r) => r.replaceAll("_", " ")).join(", ") || "admin";
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.permission === null || hasPermission(admin.roles, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <div className="relative mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-5 md:flex">
          <div className="px-2 pt-1">
            <FydellBrand markSize={40} wordmarkSize={22} />
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-6 overflow-y-auto pb-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-app-meta font-medium text-[var(--text-tertiary)]">
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
                        className={`rounded-[var(--radius-control)] px-3 py-2 text-app-meta transition-colors duration-[var(--motion-fast)] ${
                          active
                            ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
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

          <div className="mt-auto space-y-3 border-t border-[var(--border-subtle)] px-1 pt-4">
            <div>
              <p className="truncate text-app-meta text-[var(--text-primary)]">
                {admin.email}
              </p>
              <p className="mt-1 text-app-caption capitalize text-[var(--text-tertiary)]">
                {role}
              </p>
            </div>
            <LogoutButton />
            <Link
              href="/"
              className="block px-1 text-app-meta text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
            >
              ← Back to fydell.com
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-3 md:hidden">
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
