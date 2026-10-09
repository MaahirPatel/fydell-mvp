"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { PRIMARY_LINKS, PRODUCT_ITEMS, RESOURCE_ITEMS } from "@/components/marketing/site/nav-data";
import NavDownload from "@/components/marketing/site/NavDownload";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const linkClass = (active: boolean) =>
  `h-9 items-center gap-1 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold tracking-[-0.006em] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
    active
      ? "text-[var(--mk-indigo)]"
      : "text-[var(--text-body)] hover:text-[var(--mk-indigo)]"
  }`;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export default function SiteNav() {
  const pathname = usePathname();
  /*
   * Menus are stored as the route they were opened on rather than booleans,
   * so navigating away closes them by derivation instead of by an effect that
   * fires a second render after the new route has already painted.
   */
  const [mobileOn, setMobileOn] = useState<string | null>(null);
  const [productOn, setProductOn] = useState<string | null>(null);
  const mobileOpen = mobileOn === pathname;
  const productOpen = productOn === pathname;
  const [lifted, setLifted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const productButton = useRef<HTMLButtonElement>(null);
  const productPanel = useRef<HTMLDivElement>(null);
  const productWrap = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const panelId = useId();

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
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOn(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!productOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProductOn(null);
        productButton.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (productWrap.current && !productWrap.current.contains(e.target as Node)) setProductOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [productOpen]);

  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const panelLinks = () => Array.from(productPanel.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);

  const openProduct = (focusFirst: boolean) => {
    setProductOn(pathname);
    if (focusFirst) requestAnimationFrame(() => panelLinks()[0]?.focus());
  };

  /* Hover opens only for a fine pointer; touch and keyboard use the button. */
  const onHover = (entering: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setProductOn(entering ? pathname : null), entering ? 80 : 180);
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    const links = panelLinks();
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? links.length - 1 : e.key === "ArrowDown" ? (at + 1) % links.length : (at - 1 + links.length) % links.length;
    e.preventDefault();
    links[next]?.focus();
  };

  const onWrapBlur = (e: React.FocusEvent) => {
    if (!productWrap.current?.contains(e.relatedTarget as Node | null)) setProductOn(null);
  };

  const productActive = pathname.startsWith("/products");

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
        lifted || mobileOpen || productOpen
          ? "border-[var(--border-default)] bg-[var(--nav-scrim)] backdrop-blur-[20px] backdrop-saturate-150"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="l-container grid h-16 grid-cols-[1fr_auto] items-center gap-6 min-[960px]:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="inline-flex shrink-0 items-center justify-self-start rounded-[6px]" aria-label="Fydell home">
          <FydellLogo height={20} />
        </Link>

        <nav className="hidden items-center gap-0.5 min-[960px]:flex" aria-label="Primary">
          <div ref={productWrap} className="relative" onPointerEnter={onHover(true)} onPointerLeave={onHover(false)} onBlur={onWrapBlur}>
            <button
              ref={productButton}
              type="button"
              aria-expanded={productOpen}
              aria-controls={panelId}
              onClick={() => (productOpen ? setProductOn(null) : openProduct(false))}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  openProduct(true);
                }
              }}
              className={`inline-flex ${linkClass(productActive || productOpen)}`}
            >
              Product
              <ChevronDown aria-hidden className={`h-3.5 w-3.5 text-[var(--text-tertiary)] transition-transform duration-150 ${productOpen ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
            <div
              ref={productPanel}
              id={panelId}
              hidden={!productOpen}
              onKeyDown={onPanelKey}
              className="absolute left-1/2 top-full w-[680px] -translate-x-1/2 pt-2"
            >
              <div className="grid grid-cols-[1fr_200px] overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(17,18,20,0.05),0_18px_40px_-18px_rgba(17,18,20,0.25)]">
                <div className="p-2">
                  <p className="px-3 pb-1 pt-2 text-app-meta font-medium text-[var(--text-tertiary)]">Product</p>
                  <ul className="grid grid-cols-2 gap-0.5">
                    {PRODUCT_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setProductOn(null)}
                          aria-current={isActive(pathname, item.href) ? "page" : undefined}
                          className="block rounded-[8px] px-3 py-2.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                        >
                          <span className="block text-[14px] font-medium tracking-[-0.006em] text-[var(--text-primary)]">{item.label}</span>
                          <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--text-secondary)]">{item.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-l border-[var(--border-subtle)] bg-[var(--surface-panel)] p-2">
                  <p className="px-3 pb-1 pt-2 text-app-meta font-medium text-[var(--text-tertiary)]">Resources</p>
                  <ul>
                    {RESOURCE_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setProductOn(null)}
                          className="block rounded-[8px] px-3 py-2 text-[14px] font-normal text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          {PRIMARY_LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`inline-flex ${linkClass(active)}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-1">
          {signedIn ? (
            <Link href="/app" className="l-btn l-btn-quiet h-9 px-4 text-[14px]">
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${linkClass(pathname === "/login")} hidden sm:inline-flex`}>
                Log in
              </Link>
              <Link href="/signup" className="l-btn l-btn-quiet ml-1 h-9 px-4 text-[14px]">
                Sign up
              </Link>
            </>
          )}
          <span className="hidden min-[960px]:flex">
            <NavDownload />
          </span>
          <button
            type="button"
            onClick={() => setMobileOn(mobileOpen ? null : pathname)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[960px]:hidden"
          >
            {mobileOpen ? <X className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden /> : <Menu className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-[var(--border-default)] bg-[var(--surface-canvas)] min-[960px]:hidden">
          <nav className="l-container flex flex-col pb-10 pt-4" aria-label="Mobile">
            <p className="text-[13px] font-medium text-[var(--text-tertiary)]">Product</p>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
              {PRODUCT_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setMobileOn(null)} className="block py-2.5">
                    <span className="block text-[16px] font-medium text-[var(--text-primary)]">{item.label}</span>
                    <span className="block text-[14px] leading-[1.45] text-[var(--text-secondary)]">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-4 border-t border-[var(--border-default)]">
              {[...PRIMARY_LINKS, { label: "Download", href: "/download" }, ...RESOURCE_ITEMS.slice(0, 2)].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOn(null)}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className="block border-b border-[var(--border-default)] py-3.5 text-[16px] font-normal tracking-[-0.012em] text-[var(--text-primary)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-2.5">
              {signedIn ? (
                <Link href="/app" onClick={() => setMobileOn(null)} className="l-btn l-btn-lg l-btn-solid">
                  Open workspace
                </Link>
              ) : (
                <>
                  <Link href="/signup" onClick={() => setMobileOn(null)} className="l-btn l-btn-lg l-btn-solid">
                    Sign up
                  </Link>
                  <Link href="/login" onClick={() => setMobileOn(null)} className="l-btn l-btn-lg l-btn-ghost">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
