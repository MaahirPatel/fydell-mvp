"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { ToastProvider } from "@/components/ui/Toast";
import SignOutButton from "./SignOutButton";
import { InviteModalProvider, useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole } from "./catalog-types";

/**
 * Five permanent destinations.
 *
 * "Pilot cohort" and "Compare" left primary navigation. A cohort belongs to an
 * evaluation and a comparison is something you do to two reports, so both are
 * contextual actions rather than places in the product.
 */
const NAV = [
  { href: "/app/employer", label: "Home", icon: House, exact: true },
  {
    href: "/app/employer/assessments",
    label: "Evaluations",
    icon: ClipboardList,
    exact: false,
  },
  {
    href: "/app/employer/candidates",
    label: "Candidates",
    icon: Users,
    exact: false,
  },
  { href: "/app/employer/reports", label: "Reports", icon: FileText, exact: false },
  {
    href: "/app/employer/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
  },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  reviewer: "Reviewer",
  viewer: "Viewer",
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="Workspace">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-[7px] text-[13.5px] transition-colors duration-[var(--motion-fast)] ${
              active
                ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--fydell-evidence)]"
              />
            ) : null}
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const isActive = useIsActive();
  return (
    /* A scrolling strip hid Settings off the right edge at 390px with nothing
       to say it was there. Five fixed columns fit, so nothing is hidden. */
    <nav
      className="grid grid-cols-5 gap-0.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-2 md:hidden"
      aria-label="Workspace"
    >
      {NAV.map(({ href, label, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center rounded-[var(--radius-control)] px-1 py-1.5 text-center text-[12px] leading-tight transition-colors duration-[var(--motion-fast)] ${
              active
                ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({
  workspaceName,
  userEmail,
  userName,
  userRole,
}: {
  workspaceName: string;
  userEmail: string;
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Prefer a real name, then the local part of the address. An address is a
  // login, not an identity, and it truncates to nothing in a 232px rail.
  const displayName = userName || userEmail.split("@")[0] || workspaceName;
  const initials = (displayName || "?").charAt(0).toUpperCase();
  const roleLabel = userRole ? ROLE_LABEL[userRole] ?? userRole.replaceAll("_", " ") : "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] text-[12px] font-medium text-[var(--text-primary)]">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight text-[var(--text-primary)]">
            {displayName}
          </span>
          {roleLabel ? (
            <span className="mt-0.5 block truncate text-[11.5px] capitalize leading-tight text-[var(--text-tertiary)]">
              {roleLabel}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
          strokeWidth={1.7}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-[52px] left-0 z-40 w-[228px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 shadow-[var(--shadow-pop)]"
        >
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
            {workspaceName}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--text-secondary)]">
            {userEmail}
          </p>
          <div className="mt-3">
            <SignOutButton className="inline-flex h-8 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] disabled:opacity-50" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inviting is the one action available from anywhere in the workspace, so it
 * lives in the rail rather than the top bar. It used to render in both the top
 * bar and the page header, which read as two different buttons.
 */
function SidebarInvite() {
  const { open } = useInviteModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--control-solid-hover)] active:bg-[var(--control-solid-active)]"
    >
      <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      Invite candidate
    </button>
  );
}

export default function EmployerShell({
  workspaceName,
  userEmail,
  userName = "",
  userRole = "",
  catalog,
  children,
}: {
  workspaceName: string;
  userEmail: string;
  userName?: string;
  userRole?: string;
  catalog: CatalogRole[];
  children: React.ReactNode;
}) {
  const workspaceInitial = (workspaceName || "W").charAt(0).toUpperCase();

  return (
    <ToastProvider>
    <InviteModalProvider catalog={catalog}>
      <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-3 md:flex">
            <div className="flex items-center gap-2.5 rounded-[6px] px-2 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-selected)] text-[11.5px] font-semibold text-[var(--text-primary)]">
                {workspaceInitial}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                {workspaceName}
              </span>
            </div>

            <div className="mt-4 flex-1">
              <SidebarNav />
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <div className="px-1">
                <SidebarInvite />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-2">
                <AccountMenu
                  workspaceName={workspaceName}
                  userEmail={userEmail}
                  userName={userName}
                  userRole={userRole}
                />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Below md the rail is gone, so the top bar carries the things it
                held: which workspace you are in, and the one global action.
                On desktop both live in the rail and a bar here would be an
                empty 56px strip above every page. */}
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-5 md:hidden">
              <Link href="/app/employer" className="inline-flex min-w-0 items-center gap-2">
                <FydellMark width={18} />
                <span className="min-w-0 truncate text-[13.5px] font-medium text-[var(--text-primary)]">
                  {workspaceName}
                </span>
              </Link>
              <div className="w-[150px] shrink-0">
                <SidebarInvite />
              </div>
            </header>

            <MobileNav />

            {/* The rail governs the width, so 1280 to 1440 is used fully. The
                cap only binds past about 1736px, where a four-item metric row
                stretched across the full canvas stops being scannable. */}
            <main className="min-w-0 flex-1 px-5 py-7 sm:px-8">
              <div className="mx-auto w-full max-w-[1440px]">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </InviteModalProvider>
    </ToastProvider>
  );
}
