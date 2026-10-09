"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileChartColumn, Globe, House, Inbox, UserRound, type LucideIcon } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import AccountMenu from "@/components/workspace/AccountMenu";
import type { CandidateAccount } from "@/components/candidate/CandidateAccount";
import type { DeskInvitation } from "@/lib/desk/data";

type DeskSection = "home" | "inbox" | "reports" | "profile";

const NAV: { key: DeskSection; label: string; href: string; icon: LucideIcon }[] = [
  { key: "home", label: "Home", href: "/app/desk", icon: House },
  { key: "inbox", label: "Inbox", href: "/app/desk/inbox", icon: Inbox },
  { key: "reports", label: "Reports", href: "/app/desk/reports", icon: FileChartColumn },
  { key: "profile", label: "Profile", href: "/app/desk/profile", icon: UserRound },
];

function sectionFor(path: string): DeskSection | null {
  if (path.startsWith("/app/desk/inbox") || path.startsWith("/app/desk/invitations")) return "inbox";
  if (path.startsWith("/app/desk/reports")) return "reports";
  if (path.startsWith("/app/desk/profile")) return "profile";
  if (path.startsWith("/app/desk/tasks/")) return null;
  return "home";
}

function expiresIn(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "Expires today";
  return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
}

function InboxButton({ invitations, email }: { invitations: DeskInvitation[]; email: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const count = invitations.length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={count > 0 ? `Inbox, ${count} new ${count === 1 ? "invitation" : "invitations"}` : "Inbox"}
        className="relative inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
      >
        <Inbox className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Inbox</span>
        {count > 0 ? (
          <span aria-hidden className="min-w-[18px] rounded-full bg-[var(--fy-accent)] px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
            {count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Inbox"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-pop)]"
        >
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Invitations</p>
            <p className="mt-0.5 truncate text-app-meta text-[var(--text-tertiary)]">Sent to {email}</p>
          </div>
          {count === 0 ? (
            <p className="px-4 py-5 text-app-body text-[var(--text-secondary)]">No invitations waiting. When a hiring team invites {email}, it appears here.</p>
          ) : (
            <ul className="max-h-[320px] divide-y divide-[var(--border-subtle)] overflow-y-auto">
              {invitations.slice(0, 6).map((inv) => (
                <li key={inv.key}>
                  <Link
                    href={inv.href ?? `/app/desk/inbox#${inv.key}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-[var(--surface-hover)]"
                  >
                    <span className="block truncate text-app-body font-medium text-[var(--text-primary)]">{inv.title}</span>
                    <span className="block truncate text-app-meta text-[var(--text-tertiary)]">
                      {[inv.organization, inv.kind === "engineering" ? "Engineering task" : "Simulation", expiresIn(inv.expiresAt)].filter(Boolean).join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-[var(--border-subtle)] p-1.5">
            <Link
              href="/app/desk/inbox"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center justify-center rounded-[6px] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              Open inbox
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The installed app's window: its own navigation, an inbox in the corner and
 * the signed-in person at the bottom of the sidebar. It has no marketing
 * header or footer; the website is one link away in the account menu.
 */
export default function DeskShell({
  account,
  invitations,
  children,
}: {
  account: CandidateAccount;
  invitations: DeskInvitation[];
  children: React.ReactNode;
}) {
  const path = usePathname() ?? "/app/desk";
  const current = sectionFor(path);
  const title = path.startsWith("/app/desk/tasks/") ? "Task" : (NAV.find((n) => n.key === current)?.label ?? "Home");

  return (
    <div className="flex h-dvh flex-col bg-[var(--surface-panel)] text-[var(--text-primary)] md:flex-row">
      <a
        href="#desk-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-[6px] focus:bg-[var(--surface-raised)] focus:px-3 focus:py-2 focus:text-[13px] focus:shadow-[var(--shadow-pop)]"
      >
        Skip to content
      </a>

      <aside className="hidden w-[240px] shrink-0 flex-col px-2 pb-2 pt-3 md:flex">
        <Link href="/app/desk" aria-label="Fydell home" className="flex h-9 items-center rounded-[6px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]">
          <FydellLogo height={18} />
        </Link>
        <nav aria-label="Fydell app" className="mt-5 flex flex-col gap-px">
          {NAV.map((item) => {
            const active = item.key === current;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[14px] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] ${
                  active ? "bg-[var(--surface-deep)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`} strokeWidth={1.75} aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.key === "inbox" && invitations.length > 0 ? (
                  <span className="min-w-[18px] rounded-full bg-[var(--fy-accent)] px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
                    {invitations.length}
                    <span className="sr-only"> new</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-px pt-6">
          <Link
            href="/app/candidate"
            className="flex h-8 items-center gap-2.5 rounded-[6px] px-2 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Globe className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
            Full workspace
          </Link>
        </div>
        <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
          <AccountMenu
            person={{ name: account.name, email: account.email, avatarUrl: account.avatarUrl }}
            context="personal"
            contexts={account.contexts}
            placement="above"
          />
          <p className="truncate px-2 pt-1 text-app-meta text-[var(--text-tertiary)]" title={account.email}>
            {account.email}
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--surface-raised)] md:rounded-[10px] md:border md:border-[var(--border-default)]">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-4 md:px-5">
            <Link href="/app/desk" aria-label="Fydell home" className="md:hidden">
              <FydellLogo height={16} />
            </Link>
            <p className="hidden text-[14px] font-semibold text-[var(--text-primary)] md:block">{title}</p>
            <div className="ml-auto flex items-center gap-1">
              <InboxButton invitations={invitations} email={account.email} />
            </div>
          </header>
          <main id="desk-main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 pt-6 focus:outline-none sm:px-8 md:pt-8 lg:px-10">
            <div className="mx-auto w-full max-w-[1040px]">{children}</div>
          </main>
          <nav aria-label="Fydell app" className="grid shrink-0 grid-cols-4 border-t border-[var(--border-subtle)] md:hidden">
            {NAV.map((item) => {
              const active = item.key === current;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
