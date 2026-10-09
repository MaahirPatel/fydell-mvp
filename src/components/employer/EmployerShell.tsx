"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FolderOpen,
  House,
  IdCard,
  LibraryBig,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  SquareTerminal,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import NotificationBell from "@/components/notifications/NotificationBell";
import AccountMenu from "@/components/workspace/AccountMenu";
import { type WorkspaceContexts } from "@/lib/workspace/account";
import { InviteModalProvider, useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole } from "./catalog-types";
import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_SETTINGS_ITEM,
  groupContainsPath,
  isNavItemActive,
  workspaceSection,
  type WorkspaceNavGroup,
  type WorkspaceNavItem,
  type WorkspaceNavLabel,
} from "@/lib/workspace/navigation";

const NAV_ICONS: Record<WorkspaceNavLabel, typeof House> = {
  Overview: House,
  Roles: BriefcaseBusiness,
  Assessments: ShieldCheck,
  Applicants: Users,
  Reviews: IdCard,
  "Work samples": SquareTerminal,
  "Task library": LibraryBig,
  Work: FolderOpen,
  Evidence: FileCheck2,
  "Work Receipts": ReceiptText,
  Outcomes: Activity,
  Team: UserCog,
  Settings,
};

const ICON_STROKE = 1.7;
const INSET_FOCUS = "focus-visible:outline-offset-[-2px]";

/**
 * The workbench is a work environment, not a document. It owns the whole
 * canvas inside the panel and manages its own scrolling regions, so the page
 * padding and reading width that every other surface needs would only shrink
 * it.
 */
function isFullCanvas(pathname: string): boolean {
  return /^\/app\/employer\/workbench\/[^/]+$/.test(pathname);
}

/** Closes a popover on an outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function NavRow({
  item,
  pathname,
  onNavigate,
}: {
  item: WorkspaceNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavItemActive(item, pathname);
  const Icon = NAV_ICONS[item.label];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex h-[30px] items-center gap-2 rounded-[6px] px-2 text-[14px] font-medium transition-colors duration-[var(--motion-fast)] ${INSET_FOCUS} ${
        active
          ? "bg-[var(--surface-deep)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: WorkspaceNavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const listId = useId();
  // Unset until the person toggles it, so More opens on its own whenever the
  // current page is one of its records.
  const [override, setOverride] = useState<boolean | null>(null);

  const rows = (
    <ul id={listId} className="flex flex-col gap-px">
      {group.items.map((item) => (
        <li key={item.href}>
          <NavRow item={item} pathname={pathname} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );

  switch (group.kind) {
    case "primary":
      return rows;
    case "collapsible": {
      const open = override ?? groupContainsPath(group, pathname);
      return (
        <div>
          <button
            type="button"
            onClick={() => setOverride(!open)}
            aria-expanded={open}
            aria-controls={listId}
            className={`flex h-7 w-full items-center gap-1 rounded-[6px] px-2 text-left text-[14px] font-medium text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] ${INSET_FOCUS}`}
          >
            {group.label}
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-[var(--motion-fast)] ${open ? "rotate-90" : ""}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
          {open ? rows : null}
        </div>
      );
    }
  }
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4" aria-label="Workspace">
      {WORKSPACE_NAV_GROUPS.map((group) => (
        <NavGroup
          key={group.kind === "primary" ? "primary" : group.label}
          group={group}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/**
 * Inviting is the one action available from anywhere in the workspace, so it
 * sits beside the workspace name the way a compose button does. It renders
 * once per layout: the rail on desktop, the top bar on a phone.
 */
function InviteIconButton({ onBeforeOpen }: { onBeforeOpen?: () => void }) {
  const { open } = useInviteModal();
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeOpen?.();
        open();
      }}
      aria-label="Invite candidate"
      title="Invite candidate"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-panel)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
    >
      <UserPlus className="h-4 w-4" strokeWidth={ICON_STROKE} aria-hidden />
    </button>
  );
}

function WorkspaceMark({ workspaceName }: { workspaceName: string }) {
  const mark = workspaceName.trim().charAt(0).toUpperCase() || "F";
  return (
    <span
      aria-hidden
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--control-solid)] text-[11px] font-semibold text-[var(--control-solid-ink)]"
    >
      {mark}
    </span>
  );
}

/**
 * Which workspace you are in and whether it holds real data. Live is the only
 * state a signed-in workspace can be in; the Sandbox is a separate place with
 * isolated demo data, reached from this menu.
 */
function WorkspaceSwitcher({
  workspaceName,
  onNavigate,
}: {
  workspaceName: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const choose = () => {
    setOpen(false);
    onNavigate?.();
  };
  const item =
    "flex h-8 items-center gap-2 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

  return (
    <div className="relative min-w-0 flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={workspaceName}
        className={`flex h-8 w-full min-w-0 items-center gap-2 rounded-[6px] px-1.5 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] ${INSET_FOCUS}`}
      >
        <WorkspaceMark workspaceName={workspaceName} />
        <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--text-primary)]">
          {workspaceName}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-teal)]" />
          Live
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[36px] z-50 w-[248px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-pop)]"
        >
          <Link href="/app/employer" role="menuitem" onClick={choose} className={item}>
            <WorkspaceMark workspaceName={workspaceName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[var(--text-primary)]">
                {workspaceName}
              </span>
              <span className="block text-[11px] text-[var(--text-tertiary)]">Live workspace</span>
            </span>
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          </Link>
          <Link href="/sandbox" role="menuitem" onClick={choose} className={`${item} mt-px`}>
            <span
              aria-hidden
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-[var(--border-strong)] text-[11px] font-semibold"
            >
              S
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-[var(--text-primary)]">Sandbox</span>
              <span className="block text-[11px] text-[var(--text-tertiary)]">Isolated demo data</span>
            </span>
          </Link>
          <div className="my-1 h-px bg-[var(--border-subtle)]" />
          <Link href="/app/employer/team" role="menuitem" onClick={choose} className={item}>
            Invite teammates
          </Link>
          <Link href="/app/employer/settings" role="menuitem" onClick={choose} className={item}>
            Workspace settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}

type ShellIdentity = {
  workspaceName: string;
  userEmail: string;
  userName: string;
  userAvatarUrl: string | null;
  contexts: WorkspaceContexts | null;
  /** Reviewers and viewers cannot invite, so they get no invite control. */
  canInvite: boolean;
};

/** Everything the rail holds. The phone sheet renders the same thing. */
function SidebarContent({
  identity,
  showInvite,
  onNavigate,
}: {
  identity: ShellIdentity;
  showInvite: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1.5">
        <WorkspaceSwitcher workspaceName={identity.workspaceName} onNavigate={onNavigate} />
        {showInvite && identity.canInvite ? <InviteIconButton onBeforeOpen={onNavigate} /> : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="mt-2 flex items-center gap-1 border-t border-[var(--border-subtle)] pt-2">
        <div className="min-w-0 flex-1">
          <AccountMenu
            person={{ name: identity.userName, email: identity.userEmail, avatarUrl: identity.userAvatarUrl }}
            context="organization"
            contexts={identity.contexts}
            placement="above"
            onNavigate={onNavigate}
          />
        </div>
        <Link
          href={WORKSPACE_SETTINGS_ITEM.href}
          onClick={onNavigate}
          aria-label="Settings"
          title="Settings"
          aria-current={pathname.startsWith(WORKSPACE_SETTINGS_ITEM.href) ? "page" : undefined}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] aria-[current=page]:bg-[var(--surface-selected)] aria-[current=page]:text-[var(--text-primary)] ${INSET_FOCUS}`}
        >
          <Settings className="h-4 w-4" strokeWidth={ICON_STROKE} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function TopBarIconLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof House;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
      <Icon className="h-4 w-4" strokeWidth={ICON_STROKE} aria-hidden />
    </Link>
  );
}

/** Where you are, and the few things that are true on every page. */
function TopBar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const section = workspaceSection(pathname);
  const deeper = pathname !== section.href;
  return (
    <header className="hidden h-11 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-4 md:flex">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <li className="min-w-0">
            <Link
              href="/app/employer"
              className="block truncate text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
            >
              {workspaceName}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-quaternary)]" strokeWidth={ICON_STROKE} />
          </li>
          <li className="min-w-0">
            {deeper ? (
              <Link
                href={section.href}
                className="block truncate font-medium text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
              >
                {section.label}
              </Link>
            ) : (
              <span aria-current="page" className="block truncate font-medium text-[var(--text-primary)]">
                {section.label}
              </span>
            )}
          </li>
        </ol>
      </nav>
      <div className="ml-auto flex items-center gap-0.5">
        <TopBarIconLink href="/trust" label="Trust and data handling" icon={ShieldCheck} />
        <TopBarIconLink href="/contact" label="Contact support" icon={CircleHelp} />
        <NotificationBell />
      </div>
    </header>
  );
}

/**
 * The same rail as a sheet. It closes on navigation, Escape and the backdrop,
 * holds focus while open, and gives focus back to the menu button on close.
 */
function MobileNavSheet({
  identity,
  onClose,
}: {
  identity: ShellIdentity;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--scrim)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
        className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col bg-[var(--surface-panel)] px-2 pb-3 pt-2 shadow-[var(--shadow-float)]"
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <X className="h-4 w-4" strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarContent identity={identity} showInvite={false} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}

function MobileTopBar({ identity }: { identity: ShellIdentity }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const pathname = usePathname();
  const section = workspaceSection(pathname);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={ICON_STROKE} aria-hidden />
        </button>
        <Link href="/app/employer" className="flex min-w-0 items-center gap-2">
          <WorkspaceMark workspaceName={identity.workspaceName} />
          <span className="min-w-0 truncate text-[14px] font-semibold text-[var(--text-primary)]">
            {identity.workspaceName}
          </span>
        </Link>
        <span aria-hidden className="text-[var(--text-quaternary)]">/</span>
        <span className="min-w-0 truncate text-[14px] text-[var(--text-secondary)]">{section.label}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell />
          {identity.canInvite ? <InviteIconButton /> : null}
        </div>
      </header>
      {open ? <MobileNavSheet identity={identity} onClose={close} /> : null}
    </>
  );
}

/**
 * List density for every employer page, including those still built on the
 * shared `PageHeader` and `PanelSection`: a 30px title with one secondary
 * line, 17px section headings and 15px body text. Scoped here so the
 * candidate app and the public site keep their own scale.
 */
const WORKSPACE_DENSITY = [
  "[&_h1.text-app-page]:text-[30px]",
  "[&_h1.text-app-page]:font-semibold",
  "[&_h1.text-app-page]:leading-[1.15]",
  "[&_h1.text-app-page]:tracking-[-0.025em]",
  "[&_h1.text-app-page+p]:mt-2",
  "[&_h1.text-app-page+p]:text-[16px]",
  "[&_h1.text-app-page+p]:text-[var(--text-secondary)]",
  "[&_h2.text-app-section]:text-[17px]",
  "[&_h2.text-app-section]:font-semibold",
  "[&_h2.text-app-section]:tracking-[-0.012em]",
  "[&_.text-app-body]:text-[15px]",
].join(" ");

/** Page padding and reading width, except where the workbench takes over. */
function PageCanvas({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isFullCanvas(pathname)) {
    return <main className="min-h-0 min-w-0 flex-1">{children}</main>;
  }
  return (
    <main className={`min-w-0 flex-1 px-4 py-6 sm:px-6 md:overflow-y-auto lg:px-10 lg:py-8 ${WORKSPACE_DENSITY}`}>
      <div className="mx-auto w-full max-w-[1240px]">{children}</div>
    </main>
  );
}

export default function EmployerShell({
  workspaceName,
  userEmail,
  userName = "",
  userAvatarUrl = null,
  contexts,
  catalog,
  canInvite = true,
  children,
}: {
  workspaceName: string;
  userEmail: string;
  userName?: string;
  userAvatarUrl?: string | null;
  contexts: WorkspaceContexts | null;
  catalog: CatalogRole[];
  canInvite?: boolean;
  children: React.ReactNode;
}) {
  const identity: ShellIdentity = { workspaceName, userEmail, userName, userAvatarUrl, contexts, canInvite };
  return (
    <ToastProvider>
      <InviteModalProvider catalog={catalog} canInvite={canInvite}>
        <div className="min-h-screen bg-[var(--surface-raised)] text-[var(--text-primary)] [--radius-frame:9px] [--radius-panel:8px] md:flex md:h-dvh md:min-h-0 md:overflow-hidden md:bg-[var(--surface-panel)]">
          <aside className="hidden w-[244px] shrink-0 flex-col px-2 pb-2 pt-2.5 md:flex">
            <SidebarContent identity={identity} showInvite />
          </aside>

          <MobileTopBar identity={identity} />

          {/* The inset sheet. On a phone it is simply the page. */}
          <div className="flex min-w-0 flex-1 flex-col bg-[var(--surface-raised)] md:my-2 md:mr-2 md:overflow-hidden md:rounded-[10px] md:border md:border-[var(--border-default)] md:shadow-[var(--shadow-panel)]">
            <TopBar workspaceName={workspaceName} />
            <PageCanvas>{children}</PageCanvas>
          </div>
        </div>
      </InviteModalProvider>
    </ToastProvider>
  );
}
