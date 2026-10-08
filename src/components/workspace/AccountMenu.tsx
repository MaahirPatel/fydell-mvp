"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import Avatar from "@/components/profile/Avatar";
import SignOutButton from "@/components/employer/SignOutButton";
import { switchOrganization } from "@/lib/workspace/actions";
import { confirmLeave } from "@/lib/workspace/unsaved";
import {
  CREATE_ORGANIZATION_HREF,
  HELP_HREF,
  ORGANIZATION_HOME,
  PERSONAL_HOME,
  PUBLIC_PROFILE_PREVIEW_HREF,
  PUBLIC_PROFILE_SETUP_HREF,
  type WorkspaceContextKind,
  type WorkspaceContexts,
} from "@/lib/workspace/account";

export interface AccountMenuPerson {
  name: string;
  email: string;
  avatarUrl: string | null;
}

const ITEM =
  "flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[14px] font-normal text-[var(--text-primary)] outline-none transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] disabled:opacity-50";
const GROUP_LABEL = "px-2 pb-1 pt-1.5 text-[12px] text-[var(--text-tertiary)]";
const SEPARATOR = "my-1 h-px bg-[var(--border-subtle)]";

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>("[role^='menuitem']:not([disabled])"));
}

function ContextMark({ label, personal }: { label: string; personal?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-medium ${
        personal
          ? "border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-secondary)]"
          : "bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
      }`}
    >
      {label.trim().charAt(0).toUpperCase() || "W"}
    </span>
  );
}

/**
 * One account, several contexts. The menu moves between the personal
 * workspace and each organization the person belongs to, and holds the
 * account-level links every signed-in page needs. Switching an organization
 * goes through a server action that only accepts the caller's memberships.
 *
 * `contexts` is null where the page could not load them (pages outside the
 * `/app` layouts); the menu then offers only what it knows to be true.
 */
export default function AccountMenu({
  person,
  context,
  contexts,
  placement,
  onNavigate,
}: {
  person: AccountMenuPerson | null;
  context: WorkspaceContextKind;
  contexts: WorkspaceContexts | null;
  /** Where the menu opens relative to its trigger. */
  placement: "above" | "below";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrg, setPendingOrg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setError(null);
    if (returnFocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuItems(menu.current)[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(menu.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "Escape":
        // Closes only the menu, not a mobile navigation sheet around it.
        e.preventDefault();
        e.stopPropagation();
        close(true);
        return;
      case "Tab":
        close(false);
        return;
      case "ArrowDown":
        e.preventDefault();
        items[(index + 1) % items.length]?.focus();
        return;
      case "ArrowUp":
        e.preventDefault();
        items[(index - 1 + items.length) % items.length]?.focus();
        return;
      case "Home":
        e.preventDefault();
        items[0]?.focus();
        return;
      case "End":
        e.preventDefault();
        items[items.length - 1]?.focus();
        return;
    }
  };

  const followLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!confirmLeave()) {
      e.preventDefault();
      return;
    }
    close(false);
    onNavigate?.();
  };

  const openOrganization = (organizationId: string) => {
    if (!confirmLeave()) return;
    const alreadyActive = contexts?.activeOrganizationId === organizationId;
    if (alreadyActive) {
      close(false);
      onNavigate?.();
      router.push(ORGANIZATION_HOME);
      return;
    }
    setPendingOrg(organizationId);
    setError(null);
    startTransition(async () => {
      const result = await switchOrganization(organizationId);
      setPendingOrg(null);
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      close(false);
      onNavigate?.();
      router.push(ORGANIZATION_HOME);
      router.refresh();
    });
  };

  const name = person?.name || person?.email.split("@")[0] || "Your account";
  const organizations = contexts?.organizations ?? [];
  const activeOrg = organizations.find((o) => o.id === contexts?.activeOrganizationId) ?? null;
  const subtitle = context === "organization" ? (activeOrg?.name ?? "Organization") : "Personal";
  const settingsHref = context === "organization" ? "/app/employer/settings" : "/app/candidate/settings";

  const publicProfile =
    contexts === null
      ? { href: PUBLIC_PROFILE_SETUP_HREF, label: "Public profile and sharing" }
      : contexts.hasPublicProfile
        ? { href: PUBLIC_PROFILE_PREVIEW_HREF, label: "View my public profile" }
        : { href: PUBLIC_PROFILE_SETUP_HREF, label: "Set up your public profile" };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex h-10 w-full items-center gap-2 rounded-[6px] px-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
      >
        <Avatar name={name} url={person?.avatarUrl ?? ""} size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-[1.2] text-[var(--text-primary)]">{name}</span>
          <span className="block truncate text-[12px] leading-[1.3] text-[var(--text-tertiary)]">{subtitle}</span>
        </span>
        {placement === "above" ? (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
        )}
      </button>

      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className={`absolute left-0 z-50 w-full min-w-[248px] rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-pop)] ${
            placement === "above" ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"
          }`}
        >
          <div className="px-2 pb-1.5 pt-1">
            <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">{name}</p>
            {person?.email ? <p className="truncate text-[12px] text-[var(--text-tertiary)]">{person.email}</p> : null}
          </div>
          <div role="separator" className={SEPARATOR} />

          <div role="group" aria-label="Workspaces">
            <p aria-hidden className={GROUP_LABEL}>
              Workspaces
            </p>
            <Link
              href={PERSONAL_HOME}
              role="menuitemradio"
              aria-checked={context === "personal"}
              tabIndex={-1}
              onClick={followLink}
              className={ITEM}
            >
              <ContextMark label={name} personal />
              <span className="min-w-0 flex-1 truncate">Personal workspace</span>
              {context === "personal" ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden /> : null}
            </Link>
            {organizations.map((org) => {
              const current = context === "organization" && org.id === contexts?.activeOrganizationId;
              return (
                <button
                  key={org.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  tabIndex={-1}
                  disabled={pendingOrg !== null}
                  onClick={() => openOrganization(org.id)}
                  className={ITEM}
                >
                  <ContextMark label={org.name} />
                  <span className="min-w-0 flex-1 truncate">{pendingOrg === org.id ? `Opening ${org.name}` : org.name}</span>
                  {current ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden /> : null}
                </button>
              );
            })}
            {contexts !== null && organizations.length === 0 ? (
              <Link href={CREATE_ORGANIZATION_HREF} role="menuitem" tabIndex={-1} onClick={followLink} className={`${ITEM} text-[var(--text-secondary)]`}>
                Create an organization
              </Link>
            ) : null}
            {error ? (
              <p role="alert" className="px-2 py-1 text-[12px] text-[var(--status-attention-ink)]">
                {error}
              </p>
            ) : null}
          </div>

          <div role="separator" className={SEPARATOR} />
          <Link href={publicProfile.href} role="menuitem" tabIndex={-1} onClick={followLink} className={ITEM}>
            {publicProfile.label}
          </Link>
          <Link href={settingsHref} role="menuitem" tabIndex={-1} onClick={followLink} className={ITEM}>
            Settings
          </Link>
          <Link href={HELP_HREF} role="menuitem" tabIndex={-1} onClick={followLink} className={ITEM}>
            Help and support
          </Link>
          <Link href="/" role="menuitem" tabIndex={-1} onClick={followLink} className={ITEM}>
            Visit Fydell website
          </Link>

          <div role="separator" className={SEPARATOR} />
          <div
            role="none"
            onClickCapture={(e) => {
              if (!confirmLeave()) e.stopPropagation();
            }}
          >
            <SignOutButton role="menuitem" tabIndex={-1} className={`${ITEM} text-[var(--text-secondary)]`} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
