"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "For engineers", href: "/candidates" },
  { label: "For employers", href: "/employers" },
] as const;

const linkClass = (active: boolean) =>
  `inline-flex h-8 items-center gap-1 rounded-full px-3 text-[14px] font-normal tracking-[-0.005em] text-[var(--text-primary)] transition-colors duration-100 ${
    active ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-hover)]"
  }`;

export default function SiteNav() {
  const pathname = usePathname();
  /*
   * The menu is stored as the route it was opened on rather than a boolean,
   * so navigating away closes it by derivation instead of by an effect that
   * fires a second render after the new route has already painted.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const [lifted, setLifted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createBrowserSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(!!data.session);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
        lifted || open
          ? "border-[var(--border-default)] bg-[var(--nav-scrim)] backdrop-blur-[16px] backdrop-saturate-150"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="l-container grid h-16 grid-cols-[1fr_auto] items-center gap-6 min-[900px]:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="inline-flex shrink-0 items-center justify-self-start rounded-[6px]" aria-label="Fydell home">
          <FydellLogo height={22} />
        </Link>

        <nav className="hidden items-center gap-1 min-[900px]:flex" aria-label="Primary">
          {LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end">
          {signedIn ? (
            <Link href="/app" className="l-btn l-btn-solid hidden sm:inline-flex">
              Open Fydell
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${linkClass(pathname === "/login")} hidden sm:inline-flex`}>
                Log in
              </Link>
              <Link href="/get-started" className="l-btn l-btn-solid ml-1.5 hidden sm:inline-flex">
                Get started
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[900px]:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} aria-hidden /> : <Menu className="h-4 w-4" strokeWidth={1.7} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-[var(--border-default)] bg-[var(--surface-canvas)] min-[900px]:hidden">
          <nav className="l-container flex flex-col pb-8 pt-2" aria-label="Mobile">
            {[...LINKS, ...(signedIn ? [] : [{ label: "Log in", href: "/login" }])].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenedOn(null)}
                className="border-b border-[var(--border-default)] py-3.5 text-[16px] font-[510] tracking-[-0.012em] text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href={signedIn ? "/app" : "/get-started"} onClick={() => setOpenedOn(null)} className="l-btn l-btn-lg l-btn-solid mt-6">
              {signedIn ? "Open Fydell" : "Get started"}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
