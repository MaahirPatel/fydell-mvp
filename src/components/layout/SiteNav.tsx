"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";

const PRODUCT_MENU = [
  { label: "How it works", body: "From invitation to decision", href: "/product" },
  { label: "Demo", body: "Walk through an example evaluation", href: "/demo" },
  { label: "Desktop app", body: "Where candidates do the work", href: "/download" },
  { label: "Trust", body: "What is recorded, and what never is", href: "/trust" },
] as const;

const LINKS = [
  { label: "For Developers", href: "/developers" },
  { label: "For Employers", href: "/employers" },
  { label: "Pricing", href: "/pricing" },
] as const;

const linkClass = (active: boolean) =>
  `inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13.5px] font-medium text-[var(--text-primary)] transition-colors duration-100 ${
    active ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-hover)]"
  }`;

export default function SiteNav() {
  const pathname = usePathname();
  /*
   * Menus are stored as the route they were opened on rather than a boolean,
   * so navigating away closes them by derivation instead of by an effect that
   * fires a second render after the new route has already painted.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const [productOn, setProductOn] = useState<string | null>(null);
  const productOpen = productOn === pathname;
  const productRef = useRef<HTMLDivElement>(null);
  const [lifted, setLifted] = useState(false);

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

  useEffect(() => {
    if (!productOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!productRef.current?.contains(e.target as Node)) setProductOn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductOn(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [productOpen]);

  const productActive = PRODUCT_MENU.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

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
          <FydellLogo height={20} />
        </Link>

          <nav className="hidden items-center gap-1 min-[900px]:flex" aria-label="Primary">
            <div ref={productRef} className="relative">
              <button
                type="button"
                aria-expanded={productOpen}
                aria-haspopup="true"
                onClick={() => setProductOn(productOpen ? null : pathname)}
                className={linkClass(productActive || productOpen)}
              >
                Product
                <ChevronDown
                  aria-hidden
                  className={`h-3 w-3 transition-transform duration-150 ${productOpen ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
              </button>
              {productOpen ? (
                <div className="absolute left-1/2 top-[calc(100%+8px)] w-[300px] -translate-x-1/2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-pop)]">
                  {PRODUCT_MENU.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setProductOn(null)}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="block rounded-[7px] px-3 py-2.5 transition-colors duration-100 hover:bg-[var(--surface-hover)]"
                    >
                      <span className="block text-[13px] font-semibold text-[var(--text-primary)]">{item.label}</span>
                      <span className="mt-0.5 block text-[12px] text-[var(--text-tertiary)]">{item.body}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
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
          <Link href="/login" className={`${linkClass(pathname === "/login")} hidden sm:inline-flex`}>
            Log in
          </Link>
          <Link href="/get-started" className="l-btn l-btn-solid ml-1.5 hidden sm:inline-flex">
            Sign up
          </Link>
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
            <p className="pb-1 pt-5 text-[12px] font-[510] text-[var(--text-tertiary)]">Product</p>
            {PRODUCT_MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenedOn(null)}
                className="border-b border-[var(--border-default)] py-3.5 text-[16px] font-[510] tracking-[-0.012em] text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            {[...LINKS, { label: "Log in", href: "/login" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenedOn(null)}
                className="border-b border-[var(--border-default)] py-3.5 text-[16px] font-[510] tracking-[-0.012em] text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/get-started" onClick={() => setOpenedOn(null)} className="l-btn l-btn-lg l-btn-solid mt-6">
              Sign up
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
