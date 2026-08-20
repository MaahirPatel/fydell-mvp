"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SquareTerminal,
  Users,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { initialsFrom } from "@/lib/workspace/identity";
import { ToastProvider } from "@/components/ui/Toast";
import SignOutButton from "./SignOutButton";
import { InviteModalProvider, useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole } from "./catalog-types";

/**
 * Permanent destinations, grouped by what the person is doing.
 *
 * The groups exist because the rail now holds the simulations themselves as
 * well as the records they produce, and an ungrouped list of six reads as a
 * pile. "Pilot cohort" and "Compare" are not here: a cohort belongs to an
 * evaluation and a comparison is something you do to two reports, so both are
 * contextual actions rather than places in the product.
 */
const NAV_GROUPS: {
  label: string | null;
  items: { href: string; label: string; icon: typeof House; exact: boolean }[];
}[] = [
  {
    label: null,
    items: [{ href: "/app/employer", label: "Home", icon: House, exact: true }],
  },
  {
    label: "Evaluate",
    items: [
      {
        href: "/app/employer/assessments",
        label: "Evaluations",
        icon: ClipboardList,
        exact: false,
      },
      {
        href: "/app/employer/workbench",
        label: "Simulations",
        icon: SquareTerminal,
        exact: false,
      },
      {
        href: "/app/employer/candidates",
        label: "Candidates",
        icon: Users,
        exact: false,
      },
    ],
  },
  {
    label: "Evidence",
    items: [
      { href: "/app/employer/reports", label: "Reports", icon: FileText, exact: false },
      { href: "/app/employer/proof", label: "Shortlist", icon: FileText, exact: false },
    ],
  },
];

const SETTINGS_ITEM = {
  href: "/app/employer/settings",
  label: "Settings",
  icon: Settings,
  exact: false,
};

/** Small screens get one flat row, so the grouping is desktop-only. */
const FLAT_NAV = [...NAV_GROUPS.flatMap((group) => group.items), SETTINGS_ITEM];

/**
 * The workbench is a work environment, not a document. It owns the whole
 * canvas beside the rail and manages its own scrolling regions, so the page
 * padding and reading width that every other surface needs would only shrink
 * it.
 */
function isFullCanvas(pathname: string): boolean {
  return /^\/app\/employer\/workbench\/[^/]+$/.test(pathname);
}

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
      {NAV_GROUPS.map((group, index) => (
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
              icon={item.icon}
              active={isActive(item.href, item.exact)}
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
      className="grid grid-cols-6 gap-0.5 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-2 md:hidden"
      aria-label="Workspace"
    >
      {FLAT_NAV.map(({ href, label, exact }) => {
        const active = isActive(href, exact);
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
  workspaceName,
  userEmail,
  userName,
  userAvatarUrl,
  userRole,
}: {
  workspaceName: string;
  userEmail: string;
  userName: string;
  userAvatarUrl: string | null;
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

  // The name given at signup, then the local part of the address. An address
  // is a login, not an identity, and it truncates to nothing in a 232px rail.
  const displayName = userName || userEmail.split("@")[0] || workspaceName;
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
        <Avatar name={displayName} email={userEmail} avatarUrl={userAvatarUrl} size={28} />
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
          <p className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-[12px] text-[var(--text-tertiary)]">
            Workspace
          </p>
          <p className="truncate text-[12.5px] text-[var(--text-primary)]">
            {workspaceName}
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
      {compact ? "Invite" : "Invite candidate"}
    </button>
  );
}

/** Settings sits with the account rather than with the working destinations. */
function SidebarSettingsLink() {
  const isActive = useIsActive();
  return (
    <NavLink
      href={SETTINGS_ITEM.href}
      label={SETTINGS_ITEM.label}
      icon={SETTINGS_ITEM.icon}
      active={isActive(SETTINGS_ITEM.href, SETTINGS_ITEM.exact)}
    />
  );
}

/**
 * Company context stays visible at the bottom of the rail, where workspace
 * switchers live in mature tools. "Pilot workspace" is a product state, not a
 * fabricated billing tier.
 */
function WorkspaceSummary({ workspaceName }: { workspaceName: string }) {
  const mark = workspaceName.trim().charAt(0).toUpperCase() || "F";
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-2">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[11px] font-semibold text-[var(--text-primary)]"
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium leading-tight text-[var(--text-primary)]">
          {workspaceName}
        </span>
        <span className="mt-0.5 block text-[11px] leading-tight text-[var(--text-tertiary)]">
          Pilot plan
        </span>
      </span>
    </div>
  );
}

function WorkspaceModeBar() {
  return (
    <div className="sticky top-0 z-50 flex h-7 items-center bg-[#263a5b] px-3 text-[11.5px] text-white">
      <span className="font-medium">Pilot workspace</span>
      <span className="mx-auto hidden text-white/78 sm:block">
        Candidate work is recorded, disclosed, and reviewed before publication.
      </span>
      <Link
        href="/trust"
        className="ml-auto text-white/86 underline-offset-2 hover:text-white hover:underline sm:ml-0"
      >
        Data boundaries
      </Link>
    </div>
  );
}

function WorkspaceSelector({ workspaceName }: { workspaceName: string }) {
  const mark = workspaceName.trim().charAt(0).toUpperCase() || "F";
  return (
    <Link
      href="/app/employer/settings"
      className="flex min-h-[52px] items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-panel)] text-[11px] font-semibold text-[var(--text-primary)]">
        {mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium leading-tight text-[var(--text-primary)]">
          {workspaceName}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-[var(--text-tertiary)]">
          Fydell pilot
        </span>
      </span>
      <ChevronDown
        className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
        strokeWidth={1.7}
        aria-hidden
      />
    </Link>
  );
}

function WorkspaceToolbar() {
  return (
    <header className="sticky top-7 z-30 hidden h-14 shrink-0 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-6 md:flex lg:px-10">
      <form
        action="/app/employer/candidates"
        method="get"
        className="flex h-8 w-full max-w-[360px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-deep)] px-3 transition-colors duration-[var(--motion-fast)] focus-within:bg-[var(--surface-hover)]"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        <input
          type="search"
          name="q"
          aria-label="Search candidates"
          placeholder="Search candidates"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
      </form>
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
        <Link
          href="/app/employer/settings"
          aria-label="Workspace settings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" strokeWidth={1.6} aria-hidden />
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
  userRole = "",
  catalog,
  children,
}: {
  workspaceName: string;
  userEmail: string;
  userName?: string;
  userAvatarUrl?: string | null;
  userRole?: string;
  catalog: CatalogRole[];
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
    <InviteModalProvider catalog={catalog}>
      <div className="min-h-screen bg-[var(--surface-raised)] text-[var(--text-primary)] [--radius-frame:9px] [--radius-panel:8px]">
        <WorkspaceModeBar />
        <div className="flex min-h-[calc(100vh-28px)]">
          <aside className="sticky top-7 hidden h-[calc(100vh-28px)] w-[224px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-2.5 md:flex">
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
              <div className="px-1">
                <SidebarInvite />
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-2">
                <WorkspaceSummary workspaceName={workspaceName} />
              </div>
              <div>
                <AccountMenu
                  workspaceName={workspaceName}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatarUrl={userAvatarUrl}
                  userRole={userRole}
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
            <header className="sticky top-7 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 md:hidden">
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
