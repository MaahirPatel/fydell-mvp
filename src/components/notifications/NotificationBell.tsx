"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

function relative(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function fetchNotifications(): Promise<{ items: Item[]; unread: number } | null> {
  try {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { items: Item[]; unread: number };
  } catch {
    return null;
  }
}

/** Header bell for signed-in pages. Opening the list marks everything read. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetchNotifications().then((data) => {
      if (!alive) return;
      if (!data) {
        setFailed(true);
        return;
      }
      setItems(data.items);
      setUnread(data.unread);
      setFailed(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      await fetch("/api/notifications", { method: "POST" }).catch(() => undefined);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--control-solid)] px-1 text-[13px] font-medium leading-none text-[var(--control-solid-ink)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-10 z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[0_12px_32px_rgba(16,18,24,0.12)]"
        >
          <p className="border-b border-[var(--border-subtle)] px-4 py-3 text-[14px] font-medium text-[var(--text-primary)]">Notifications</p>
          {failed ? (
            <p className="px-4 py-5 text-[13px] text-[var(--text-secondary)]">Notifications could not be loaded. Try again in a moment.</p>
          ) : items === null ? (
            <p className="px-4 py-5 text-[13px] text-[var(--text-secondary)]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-[var(--text-secondary)]">
              Nothing yet. Invitations, follow-up questions and answers show up here.
            </p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {items.map((n) => {
                const content = (
                  <>
                    <span className="block text-[14px] text-[var(--text-primary)]">{n.title}</span>
                    {n.body ? <span className="mt-0.5 block text-[13px] text-[var(--text-secondary)]">{n.body}</span> : null}
                    <span className="mt-1 block text-[13px] text-[var(--text-tertiary)]">{relative(n.createdAt)}</span>
                  </>
                );
                const rowClass = `block px-4 py-3 ${n.readAt ? "" : "bg-[var(--surface-selected)]"}`;
                return (
                  <li key={n.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                    {n.href ? (
                      <Link href={n.href} onClick={() => setOpen(false)} className={`${rowClass} hover:bg-[var(--surface-hover)]`}>
                        {content}
                      </Link>
                    ) : (
                      <div className={rowClass}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
