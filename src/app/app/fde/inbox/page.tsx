"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function FdeInboxPage() {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fde/inbox", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load your inbox");
        setItems(data.items || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your inbox");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function markRead(id: string) {
    setPending(id);
    try {
      const res = await fetch("/api/fde/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update that item");
      setItems((prev) =>
        prev
          ? prev.map((item) => (item.id === id ? { ...item, read_at: data.item.read_at } : item))
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that item");
    } finally {
      setPending(null);
    }
  }

  const unreadCount = items?.filter((item) => !item.read_at).length ?? 0;

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Inbox</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Action Inbox
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-white/55">
        {items === null
          ? "Loading..."
          : unreadCount > 0
            ? `${unreadCount} unread — invites, sessions, and updates that need your attention.`
            : "You're all caught up."}
      </p>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : items === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-20 rounded-[14px] bg-white/5" />
          <div className="h-20 rounded-[14px] bg-white/5" />
        </div>
      ) : items.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            Nothing here yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Invites and simulation updates will show up here as soon as they happen.
          </p>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {items.map((item) => {
            const unread = !item.read_at;
            return (
              <li
                key={item.id}
                className={`flex flex-wrap items-start justify-between gap-4 px-5 py-4 text-[13px] ${
                  unread ? "bg-[#3B5BFF]/[0.05]" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      unread ? "bg-[#3B5BFF]" : "bg-transparent"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-white">{item.title}</p>
                    {item.body && <p className="mt-1 text-white/55">{item.body}</p>}
                    <p className="mt-1.5 text-[12px] text-white/35">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.action_url && (
                    <Link
                      href={item.action_url}
                      onClick={() => {
                        if (unread) markRead(item.id);
                      }}
                      className="rounded-[8px] bg-[#F1F2F4] px-3 py-1.5 text-[12.5px] font-semibold text-[#08090C] transition hover:bg-white"
                    >
                      Open
                    </Link>
                  )}
                  {unread && (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      disabled={pending === item.id}
                      className="text-[12.5px] font-medium text-white/45 transition hover:text-white disabled:opacity-50"
                    >
                      {pending === item.id ? "Marking..." : "Mark read"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
