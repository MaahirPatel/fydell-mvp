"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BriefcaseBusiness,
  CircleHelp,
  ChevronDown,
  FileCheck2,
  FolderOpen,
  House,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { initialsFrom } from "@/lib/workspace/identity";
import { ToastProvider } from "@/components/ui/Toast";
import SignOutButton from "./SignOutButton";
import { InviteModalProvider, useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole } from "./catalog-types";
import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_ITEMS,
  WORKSPACE_SETTINGS_ITEM,
  workspaceSection,
} from "@/lib/workspace/navigation";

/**
 * Permanent destinations, grouped by what the person is doing.
 *
 * The groups exist because the rail now holds the simulations themselves as
 * well as the records they produce, and an ungrouped list of six reads as a
 * pile. "Pilot cohort" and "Compare" are not here: a cohort belongs to an
 * evaluation and a comparison is something you do to two reports, so both are
 * contextual actions rather than places in the product.
 */
const NAV_ICONS = {
  Home: House,
  Roles: BriefcaseBusiness,
  Candidates: Users,
  Work: FolderOpen,
  Evidence: FileCheck2,
  "Work Receipts": ReceiptText,
  Outcomes: Activity,
  Settings,
} satisfies Record<string, typeof House>;

/**
 * The workbench is a work environment, not a document. It owns the whole
 * canvas beside the rail and manages its own scrolling regions, so the page
 * padding and reading width that every other surface needs would only shrink
 * it.
 */
function isFullCanvas(pathname: string): boolean {
  return /^\/app\/employer\/workbench\/[^/]+$/.test(pathname);
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-[7px] text-[13.5px] transition-colors duration-[var(--motion-fast)] ${
        active
          ? "bg-[var(--surface-intelligence)] font-medium text-[var(--evidence-generated)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden />
      {label}
    </Link>
  );
}

function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav className="flex flex-1 flex-col gap-4" aria-label="Workspace">
      {WORKSPACE_NAV_GROUPS.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-2.5 pb-1 text-[12px] font-medium text-[var(--text-tertiary)]">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={NAV_ICONS[item.label]}
              active={isActive(item.href, Boolean(item.exact))}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

function MobileNav() {
  const isActive = useIsActive();
  return (
    /* A scrolling strip hid Settings off the right edge at 390px with nothing
       to say it was there. Fixed columns keep every destination visible, and
       labels wrap rather than truncate so none of them become guesses. */
    <nav
      className="grid grid-cols-4 gap-0.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-2 md:hidden"
      aria-label="Workspace"
    >
      {WORKSPACE_NAV_ITEMS.map(({ href, label, exact }) => {
        const active = isActive(href, Boolean(exact));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center rounded-[var(--radius-control)] px-1 py-1.5 text-center text-[11px] leading-tight transition-colors duration-[var(--motion-fast)] ${
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

/**
 * The person's own picture when they have one, their initials when they do
 * not. A broken image URL falls back to initials rather than to a gap.
 */
function Avatar({
  name,
  email,
  avatarUrl,
  size,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = initialsFrom(name, email);
  const box = { width: size, height: size };

  if (avatarUrl && !failed) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={box}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full border border-[var(--border-default)] object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={box}
      className="flex shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-panel)] text-[11.5px] font-medium text-[var(--text-primary)]"
    >
      {initials}
    </span>
  );
}

function AccountMenu({
  userEmail,
  userName,
  userAvatarUrl,
}: {
  userEmail: string;
  userName: string;
  userAvatarUrl: string | null;
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

  // The name given at signup, then the local part of the address. An address
  // is a login, not an identity, and it truncates to nothing in a 232px rail.
  const displayName = userName || userEmail.split("@")[0] || "Account";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
      >
        <Avatar name={displayName} email={userEmail} avatarUrl={userAvatarUrl} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight text-[var(--text-primary)]">
            {displayName}
          </span>
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
          <div className="flex items-center gap-2.5">
            <Avatar
              name={displayName}
              email={userEmail}
              avatarUrl={userAvatarUrl}
              size={32}
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {displayName}
              </p>
              <p className="truncate text-[12.5px] text-[var(--text-secondary)]">
                {userEmail}
              </p>
            </div>
          </div>
          <Link
            href="/app/employer/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-3 flex h-8 items-center rounded-[var(--radius-control)] border-t border-[var(--border-subtle)] px-2 text-[12.5px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            Account settings
          </Link>
          <div className="mt-1">
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
function SidebarInvite({ compact = false }: { compact?: boolean }) {
  const { open } = useInviteModal();
  return (
    <button
      type="button"
      onClick={() => open()}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--control-solid-hover)] active:bg-[var(--control-solid-active)] ${
        compact ? "w-auto" : "w-full"
      }`}
    >
      <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      Invite candidate
    </button>
  );
}

/** Settings sits with the account rather than with the working destinations. */
function SidebarSettingsLink() {
  const isActive = useIsActive();
  return (
    <NavLink
      href={WORKSPACE_SETTINGS_ITEM.href}
      label={WORKSPACE_SETTINGS_ITEM.label}
      icon={NAV_ICONS.Settings}
      active={isActive(WORKSPACE_SETTINGS_ITEM.href, false)}
    />
  );
}

function WorkspaceModeBar() {
  return (
    <div className="sticky top-0 z-50 flex h-8 items-center border-b border-[var(--border-subtle)] bg-[var(--surface-deep)] px-3 text-[11.5px] text-[var(--text-secondary)]">
      <span className="font-medium text-[var(--text-primary)]">Live workspace</span>
      <span className="mx-auto hidden sm:block">
        Real roles, candidate work, evidence, and outcomes.
      </span>
      <Link
        href="/sandbox"
        className="ml-auto text-[var(--action-ink)] underline-offset-2 hover:underline sm:ml-0"
      >
        Explore Sandbox
      </Link>
    </div>
  );
}

function WorkspaceSelector({ workspaceName }: { workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mark = workspaceName.trim().charAt(0).toUpperCase() || "F";

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-panel)] text-[11px] font-semibold text-[var(--text-primary)]">
          {mark}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium leading-tight text-[var(--text-primary)]">
            {workspaceName}
          </span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-[var(--text-tertiary)]">
            Pilot · Live
          </span>
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
          className="absolute left-0 top-[56px] z-50 w-[240px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-1.5 shadow-[var(--shadow-pop)]"
        >
          <Link
            href="/app/employer"
            role="menuitem"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-[12.5px] hover:bg-[var(--surface-hover)]"
          >
            <span className="block font-medium text-[var(--text-primary)]">{workspaceName}</span>
            <span className="mt-0.5 block text-[11.5px] text-[var(--text-tertiary)]">Live workspace</span>
          </Link>
          <Link
            href="/sandbox"
            role="menuitem"
            className="mt-1 block rounded-[var(--radius-control)] px-3 py-2 text-[12.5px] hover:bg-[var(--surface-hover)]"
          >
            <span className="block font-medium text-[var(--text-primary)]">Demo Sandbox</span>
            <span className="mt-0.5 block text-[11.5px] text-[var(--text-tertiary)]">Isolated demo data</span>
          </Link>
          <Link
            href="/app/employer/settings"
            role="menuitem"
            className="mt-1 block border-t border-[var(--border-subtle)] px-3 py-2 text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Workspace settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceToolbar() {
  const pathname = usePathname();
  const section = workspaceSection(pathname);
  return (
    <header className="sticky top-8 z-30 hidden h-14 shrink-0 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 md:flex lg:px-10">
      <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">{section.label}</p>
      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/trust"
          aria-label="Trust and data handling"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-[12.5px] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          <span className="hidden xl:inline">Data handling</span>
        </Link>
        <Link
          href="/how-it-works"
          aria-label="Product guide"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <CircleHelp className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        </Link>
        <div className="ml-1">
          <SidebarInvite compact />
        </div>
      </div>
    </header>
  );
}

/** Page padding and reading width, except where the workbench takes over. */
function MainSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isFullCanvas(pathname)) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }
  return (
    /* The rail governs the width, so 1280 to 1440 is used fully. The cap only
       binds past about 1736px, where a four-item metric row stretched across
       the full canvas stops being scannable. */
    <main className="min-w-0 flex-1 bg-[var(--surface-raised)] px-5 py-7 sm:px-8 lg:px-12 lg:py-9">
      <div className="mx-auto w-full max-w-[1320px]">{children}</div>
    </main>
  );
}

export default function EmployerShell({
  workspaceName,
  userEmail,
  userName = "",
  userAvatarUrl = null,
  catalog,
  children,
}: {
  workspaceName: string;
  userEmail: string;
  userName?: string;
  userAvatarUrl?: string | null;
  catalog: CatalogRole[];
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
    <InviteModalProvider catalog={catalog}>
      <div className="min-h-screen bg-[var(--surface-raised)] text-[var(--text-primary)] [--radius-frame:9px] [--radius-panel:8px]">
        <WorkspaceModeBar />
        <div className="flex min-h-[calc(100vh-32px)]">
          <aside className="sticky top-8 hidden h-[calc(100vh-32px)] w-[224px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-2.5 md:flex">
            <Link
              href="/app/employer"
              className="flex h-9 items-center gap-2.5 rounded-[6px] px-2 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
            >
              <FydellMark width={18} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.024em] text-[var(--text-primary)]">
                fydell
              </span>
            </Link>

            <div className="mt-1 border-b border-[var(--border-subtle)] pb-2">
              <WorkspaceSelector workspaceName={workspaceName} />
            </div>

            <div className="mt-3 flex-1">
              <SidebarNav />
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <SidebarSettingsLink />
              <div className="border-t border-[var(--border-subtle)] pt-2">
                <AccountMenu
                  userEmail={userEmail}
                  userName={userName}
                  userAvatarUrl={userAvatarUrl}
                />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <WorkspaceToolbar />
            {/* Below md the rail is gone, so the top bar carries the things it
                held: which workspace you are in, and the one global action.
                On desktop both live in the rail and a bar here would be an
                empty 56px strip above every page. */}
            <header className="sticky top-8 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 md:hidden">
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

            <MainSurface>{children}</MainSurface>
          </div>
        </div>
      </div>
    </InviteModalProvider>
    </ToastProvider>
  );
}
