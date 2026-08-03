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
  { href: "/app/employer/assessments", label: "Simulations", exact: false },
  { href: "/app/employer/simulations/new", label: "New simulation", exact: false },
  { href: "/app/employer/candidates", label: "Candidates", exact: false },
  { href: "/app/employer/reports", label: "Reports", exact: false },
  { href: "/app/employer/settings", label: "Settings", exact: false },
];

function Brand() {
  return (
    <Link href="/app/employer" className="inline-flex items-center gap-2" aria-label="Fydell">
      <FydellMark width={26} />
      <span
        className="text-[17px] leading-none text-slate-900"
        style={{ fontWeight: 600, letterSpacing: "-0.04em" }}
      >
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
            className={`${itemClass || "flex items-center rounded-lg px-3 py-2 text-[14px]"} ${
              active
                ? "bg-blue-50 font-semibold text-blue-700"
                : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
        className="inline-flex h-9 items-center rounded-lg bg-[#3157D5] px-4 text-[13.5px] font-semibold text-white transition hover:bg-[#2848b8]"
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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-300"
        >
          {initial}
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <p className="truncate text-[13.5px] font-medium text-slate-900">{workspaceName}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{userEmail}</p>
            <div className="mt-3">
              <SignOutButton className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-[13.5px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" />
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
      <div className="min-h-screen bg-[#F6F7F9] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-[1440px]">
          <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 md:flex">
            <div className="px-2 pb-6">
              <Brand />
            </div>
            <NavLinks className="flex flex-1 flex-col gap-1" />
            <div className="mt-auto border-t border-slate-200 px-2 pt-4">
              <p className="truncate text-[13px] font-medium text-slate-700">{workspaceName}</p>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="md:hidden">
                  <Brand />
                </div>
                <p className="hidden truncate text-[14px] text-slate-500 md:block">
                  {workspaceName}
                </p>
              </div>
              <HeaderActions workspaceName={workspaceName} userEmail={userEmail} />
            </header>

            <NavLinks
              className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              itemClass="flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-[13.5px]"
            />

            <main className="px-4 py-8 sm:px-8">{children}</main>
          </div>
        </div>
      </div>
    </InviteModalProvider>
  );
}
