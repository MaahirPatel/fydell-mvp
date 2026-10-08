"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleHelp, Link2, Menu, Settings, X, type LucideIcon } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import NotificationBell from "@/components/notifications/NotificationBell";
import AccountMenu from "@/components/workspace/AccountMenu";
import { HELP_HREF, PERSONAL_HOME } from "@/lib/workspace/account";
import { useCandidateAccount } from "./CandidateAccount";
import { CANDIDATE_NAV, SECTION_HREF, SECTION_LABEL, SHARE_HREF } from "./nav";
import type { CandidateSection } from "./section";

export type CandidateCrumb = { label: string; href?: string };

const WIDTH = {
  narrow: "max-w-[680px]",
  default: "max-w-[880px]",
  wide: "max-w-[1120px]",
} as const;

const ROW =
  "flex h-[30px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[14px] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]";
const ROW_IDLE = "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";
const ROW_ACTIVE = "bg-[var(--surface-deep)] text-[var(--text-primary)]";

function NavRow({
  href,
  label,
  icon: Icon,
  active = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`${ROW} ${active ? ROW_ACTIVE : ROW_IDLE}`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`} strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}

function SidebarBody({ current, onNavigate }: { current: CandidateSection; onNavigate?: () => void }) {
  const account = useCandidateAccount();
  return (
    <div className="flex h-full flex-col px-2 pb-2 pt-2">
      <AccountMenu
        person={account ? { name: account.name, email: account.email, avatarUrl: account.avatarUrl } : null}
        context="personal"
        contexts={account?.contexts ?? null}
        placement="below"
        onNavigate={onNavigate}
      />
      <Link
        href={SHARE_HREF}
        onClick={onNavigate}
        className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] shadow-[0_1px_2px_rgba(16,18,24,0.18)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--control-solid-hover)] active:bg-[var(--control-solid-active)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)]"
      >
        <Link2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        Share profile
      </Link>

      <nav aria-label="Personal workspace" className="mt-5 flex flex-col gap-px">
        {CANDIDATE_NAV.map((item) => (
          <NavRow key={item.key} href={item.href} label={item.label} icon={item.icon} active={current === item.key} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-px pt-6">
        <NavRow href={SECTION_HREF.settings} label="Settings" icon={Settings} active={current === "settings"} onNavigate={onNavigate} />
        <NavRow href={HELP_HREF} label="Help" icon={CircleHelp} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function Breadcrumb({ current, crumbs }: { current: CandidateSection; crumbs: readonly CandidateCrumb[] }) {
  const deeper = crumbs.length > 0;
  const sectionIcon = current === "settings" ? Settings : (CANDIDATE_NAV.find((n) => n.key === current)?.icon ?? Settings);
  const SectionIcon = sectionIcon;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-1 text-[13px]">
        <li className="flex shrink-0 items-center">
          {deeper ? (
            <Link
              href={SECTION_HREF[current]}
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] px-1.5 font-medium text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <SectionIcon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
              {SECTION_LABEL[current]}
            </Link>
          ) : (
            <span aria-current="page" className="inline-flex h-7 items-center gap-1.5 px-1.5 font-medium text-[var(--text-primary)]">
              <SectionIcon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
              {SECTION_LABEL[current]}
            </span>
          )}
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-quaternary)]" strokeWidth={1.75} aria-hidden />
              {c.href && !last ? (
                <Link href={c.href} className="truncate rounded-[6px] px-1.5 py-1 font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate px-1.5 font-medium text-[var(--text-primary)]">
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Below md the sidebar becomes a sheet behind the menu button, with every destination in it. */
function MobileNav({ current }: { current: CandidateSection }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const button = opener.current;
    panel.current?.querySelector<HTMLElement>("a[aria-current='page'], a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] md:hidden"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div aria-hidden className="absolute inset-0 bg-[rgba(16,20,32,0.28)] animate-[fydell-fade-in_120ms_both]" onClick={close} />
          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[min(288px,86vw)] flex-col border-r border-[var(--border-default)] bg-[var(--surface-panel)] shadow-[var(--shadow-float)]"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3">
              <Link
                href={PERSONAL_HOME}
                onClick={close}
                aria-label="Personal workspace overview"
                className="inline-flex items-center rounded-[6px] px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
              >
                <FydellLogo height={18} />
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarBody current={current} onNavigate={close} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * The signed-in engineer's workspace: a grey sidebar with the four
 * destinations, and the page in a white inset panel under a slim bar that
 * says where you are. Below md the sidebar moves into a sheet.
 */
export default function CandidateWorkspace({
  current,
  width,
  crumbs = [],
  action,
  children,
}: {
  current: CandidateSection;
  width: keyof typeof WIDTH;
  crumbs?: readonly CandidateCrumb[];
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-panel)] text-[var(--text-primary)] md:flex">
      <a
        href="#candidate-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-[6px] focus:bg-[var(--surface-raised)] focus:px-3 focus:py-2 focus:text-[13px] focus:shadow-[var(--shadow-pop)]"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 overflow-y-auto md:block">
        <SidebarBody current={current} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pr-2">
        <header className="sticky top-0 z-30 bg-[var(--surface-panel)] md:pt-2">
          <div className="flex h-12 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 sm:px-4 md:h-11 md:rounded-t-[10px] md:border-x md:border-t md:border-x-[var(--border-default)] md:border-t-[var(--border-default)] md:px-4">
            <MobileNav current={current} />
            <Breadcrumb current={current} crumbs={crumbs} />
            <div className="flex shrink-0 items-center gap-1">
              {action}
              <NotificationBell />
            </div>
          </div>
        </header>
        <div className="flex-1 bg-[var(--surface-raised)] md:mb-2 md:rounded-b-[10px] md:border-x md:border-b md:border-[var(--border-default)]">
          <main id="candidate-main" tabIndex={-1} className="px-5 pb-16 pt-6 focus:outline-none sm:px-8 md:pt-8 lg:px-10">
            <div className={`w-full ${WIDTH[width]}`}>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
