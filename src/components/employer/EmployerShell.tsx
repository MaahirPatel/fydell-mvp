"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ClipboardList,
  FileText,
  House,
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
            className={`relative flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[13.5px] transition-colors ${
              active
                ? "bg-white/[0.07] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
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
            className={`flex items-center justify-center rounded-[6px] px-1 py-1.5 text-center text-[12px] leading-tight transition-colors ${
              active
                ? "bg-white/[0.08] font-medium text-[var(--text-primary)]"
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
}: {
  workspaceName: string;
  userEmail: string;
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

  const initials = (userEmail || workspaceName || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-default)] bg-white/[0.05] text-[11.5px] font-medium text-[var(--text-primary)]">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--text-secondary)]">
          {userEmail}
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
          className="absolute bottom-11 left-0 z-40 w-[228px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 shadow-[var(--shadow-pop)]"
        >
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
            {workspaceName}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-[var(--text-secondary)]">
            {userEmail}
          </p>
          <div className="mt-3">
            <SignOutButton className="inline-flex h-8 w-full items-center justify-center rounded-[6px] border border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.06] disabled:opacity-50" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TopBarActions() {
  const { open } = useInviteModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex h-8 items-center rounded-[8px] bg-[#eceef1] px-3.5 text-[13px] font-medium text-[#0a0b0d] transition-colors hover:bg-white"
    >
      Invite candidate
    </button>
  );
}

export default function EmployerShell({
  workspaceName,
  userEmail,
  catalog,
  children,
}: {
  workspaceName: string;
  userEmail: string;
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-white/[0.08] text-[11.5px] font-semibold text-[var(--text-primary)]">
                {workspaceInitial}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                {workspaceName}
              </span>
            </div>

            <div className="mt-4 flex-1">
              <SidebarNav />
            </div>

            <div className="mt-auto border-t border-[var(--border-subtle)] pt-2">
              <AccountMenu workspaceName={workspaceName} userEmail={userEmail} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-5 sm:px-8">
              {/* On a phone the sidebar is gone, and with it the only place
                  that said which workspace you are in. That matters more here
                  than the wordmark does. */}
              <Link
                href="/app/employer"
                className="inline-flex min-w-0 items-center gap-2 md:hidden"
              >
                <FydellMark width={18} />
                <span className="min-w-0 truncate text-[13.5px] font-medium text-[var(--text-primary)]">
                  {workspaceName}
                </span>
              </Link>
              <div className="hidden md:block" />
              <TopBarActions />
            </header>

            <MobileNav />

            <main className="min-w-0 flex-1 px-5 py-7 sm:px-8">{children}</main>
          </div>
        </div>
      </div>
    </InviteModalProvider>
    </ToastProvider>
  );
}
