"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import FydellMark from "@/components/brand/FydellMark";
import SignOutButton from "./SignOutButton";
import { InviteModalProvider, useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole } from "./catalog-types";

const NAV = [
  { href: "/app/employer", label: "Overview", exact: true },
  { href: "/app/employer/cohort", label: "Pilot cohort", exact: false },
  { href: "/app/employer/compare", label: "Compare", exact: false },
  { href: "/app/employer/assessments", label: "Simulations", exact: false },
  { href: "/app/employer/candidates", label: "Candidates", exact: false },
  { href: "/app/employer/reports", label: "Reports", exact: false },
  { href: "/app/employer/settings", label: "Settings", exact: false },
];

function Brand() {
  return (
    <Link href="/app/employer" className="inline-flex items-center gap-2" aria-label="Fydell">
      <FydellMark width={26} />
      <span className="text-[17px] font-semibold leading-none tracking-[-0.03em] text-white">
        fydell
      </span>
    </Link>
  );
}

function NavLinks({ className, itemClass }: { className: string; itemClass?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${itemClass || "relative flex items-center rounded-[6px] px-3 py-2 text-[13.5px]"} ${
              active
                ? "bg-white/[0.08] font-medium text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-full before:bg-[var(--fydell-evidence,#6b8cff)]"
                : "font-normal text-white/50 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function HeaderActions({ workspaceName, userEmail }: { workspaceName: string; userEmail: string }) {
  const { open } = useInviteModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const initial = (userEmail || workspaceName || "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => open()}
        className="inline-flex h-9 items-center rounded-[6px] bg-[var(--fydell-action,#e8eaed)] px-4 text-[13.5px] font-medium text-[#090A0D] transition hover:brightness-[0.97]"
      >
        Invite candidate
      </button>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-white/15 bg-white/[0.06] text-[13.5px] font-medium text-white hover:bg-white/[0.1]"
        >
          {initial}
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-60 rounded-[10px] border border-white/10 bg-[#0c0d12] p-3 shadow-lg"
          >
            <p className="truncate text-[13.5px] font-medium text-white">{workspaceName}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-white/45">{userEmail}</p>
            <div className="mt-3">
              <SignOutButton className="inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-white/15 bg-transparent text-[13.5px] font-medium text-white/80 hover:bg-white/[0.06] disabled:opacity-50" />
            </div>
          </div>
        )}
      </div>
    </div>
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
  return (
    <InviteModalProvider catalog={catalog}>
      <div className="min-h-screen bg-[var(--surface-canvas,#050507)] text-white">
        <div className="mx-auto flex min-h-screen max-w-[1440px]">
          <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.08] bg-[var(--surface-raised,#0c0d12)] px-3 py-5 md:flex">
            <div className="px-2 pb-6">
              <Brand />
            </div>
            <NavLinks className="flex flex-1 flex-col gap-1" />
            <div className="mt-auto border-t border-white/[0.08] px-2 pt-4">
              <p className="truncate text-[13px] font-medium text-white/70">{workspaceName}</p>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex h-14 items-center justify-between gap-3 border-b border-white/[0.08] bg-[var(--surface-canvas,#050507)] px-4 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="md:hidden">
                  <Brand />
                </div>
                <p className="hidden truncate text-[13.5px] text-white/45 md:block">
                  {workspaceName}
                </p>
              </div>
              <HeaderActions workspaceName={workspaceName} userEmail={userEmail} />
            </header>

            <NavLinks
              className="flex gap-1 overflow-x-auto border-b border-white/[0.08] bg-[var(--surface-raised,#0c0d12)] px-3 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              itemClass="relative flex shrink-0 items-center whitespace-nowrap rounded-[6px] px-3 py-1.5 text-[13px]"
            />

            <main className="px-4 py-8 sm:px-8">{children}</main>
          </div>
        </div>
      </div>
    </InviteModalProvider>
  );
}
