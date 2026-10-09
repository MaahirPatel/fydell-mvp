"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import type { JumpTarget } from "@/lib/workspace/jump-targets";

function matches(target: JumpTarget, query: string): boolean {
  const haystack = `${target.label} ${target.hint} ${target.keywords ?? ""}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** "Go to" search over a workspace's pages. Opens from the top bar or with Ctrl+K / Cmd+K. */
export default function QuickJump({ targets }: { targets: readonly JumpTarget[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const listId = useId();

  const results = useMemo(() => (query.trim() ? targets.filter((t) => matches(t, query)) : targets), [targets, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          return !v;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const trigger = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      const back = returnTo.current;
      returnTo.current = null;
      (back && back !== document.body && back.isConnected ? back : trigger)?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(target: JumpTarget | undefined) {
    if (!target) return;
    close();
    router.push(target.href);
    const hash = target.href.split("#")[1];
    if (!hash) return;
    const started = Date.now();
    const reveal = () => {
      const el = document.getElementById(hash);
      if (el && window.location.hash === `#${hash}`) el.scrollIntoView({ block: "start" });
      else if (Date.now() - started < 4000) window.setTimeout(reveal, 80);
    };
    window.setTimeout(reveal, 80);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      // The search field is the dialog's only control; keep focus inside the modal.
      e.preventDefault();
    }
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => {
          returnTo.current = opener.current;
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Control+K Meta+K"
        className="inline-flex h-8 items-center gap-2 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2.5 text-[13px] text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Go to</span>
        <kbd aria-hidden className="hidden rounded-[4px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-1 font-sans text-[11px] text-[var(--text-tertiary)] sm:inline">
          Ctrl K
        </kbd>
        <span className="sr-only sm:hidden">Go to a page</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <div aria-hidden className="absolute inset-0 bg-[var(--scrim)] animate-[fydell-fade-in_120ms_both]" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Go to a page"
            className="relative w-full max-w-[560px] overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-float)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 focus-within:shadow-[inset_0_-2px_0_var(--accent-line)]">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden />
              <input
                ref={input}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                aria-autocomplete="list"
                placeholder="Search pages and actions"
                className="h-12 w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none!"
              />
              <kbd aria-hidden className="shrink-0 rounded-[4px] border border-[var(--border-default)] px-1.5 text-[11px] text-[var(--text-tertiary)]">Esc</kbd>
            </div>
            <p role="status" className="sr-only">
              {results.length === 0 ? "No results" : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </p>
            <ul ref={list} id={listId} role="listbox" aria-label="Pages and actions" className="max-h-[52vh] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-[14px] text-[var(--text-secondary)]">Nothing matches &ldquo;{query}&rdquo;.</li>
              ) : (
                results.map((target, i) => (
                  <li
                    key={target.href + target.label}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(target)}
                    className={`flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2 ${i === active ? "bg-[var(--surface-hover)]" : ""}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-[var(--text-primary)]">{target.label}</span>
                      <span className="block truncate text-[13px] text-[var(--text-secondary)]">{target.hint}</span>
                    </span>
                    {i === active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.75} aria-hidden /> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
