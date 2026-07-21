"use client";

import { useMemo, useState } from "react";
import {
  CHANNEL_NAME,
  CHANNEL_PARTICIPANTS,
  type ChatMessage,
  type InboxParticipant,
} from "@/lib/relay/inbox-seed";

export type { ChatMessage };

const FILE_RE = /\b([\w./-]+\.(?:csv|py|md|json|ya?ml|txt))\b/gi;

function initialsFor(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MessageBody({
  text,
  onOpenFile,
}: {
  text: string;
  onOpenFile?: (path: string) => void;
}) {
  const parts = useMemo(() => {
    const out: { type: "text" | "file"; value: string }[] = [];
    let last = 0;
    const re = new RegExp(FILE_RE.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      out.push({ type: "file", value: m[1] });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: "text", value: text.slice(last) });
    if (out.length === 0) out.push({ type: "text", value: text });
    return out;
  }, [text]);

  return (
    <p className="mt-0.5 max-w-[92%] whitespace-pre-wrap rounded-[8px] bg-white/[0.05] px-2.5 py-1.5 text-[12.5px] leading-relaxed text-[#F4F5F7]/90">
      {parts.map((p, i) =>
        p.type === "file" && onOpenFile ? (
          <button
            key={`${p.value}-${i}`}
            type="button"
            onClick={() => {
              const path = p.value.includes("/") ? p.value : `data/${p.value}`;
              onOpenFile(path);
            }}
            className="font-medium text-[#B8C4FF] underline underline-offset-2"
          >
            {p.value}
          </button>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </p>
  );
}

export default function ClientInbox({
  canonicalFacts,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  channelName,
  participants,
  onOpenFile,
}: {
  canonicalFacts: string[];
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  channelName?: string;
  participants?: InboxParticipant[];
  onOpenFile?: (path: string) => void;
}) {
  const channel = channelName || CHANNEL_NAME;
  const people = participants || CHANNEL_PARTICIPANTS;
  const [query, setQuery] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);

  const attachments = ["data/shipments.csv", "data/carriers.csv", "data/delays_manual_tracking.csv"];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.authorName.toLowerCase().includes(q) ||
        m.authorRole.toLowerCase().includes(q)
    );
  }, [messages, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <p className="truncate text-[13px] font-medium text-[#F4F5F7]">{channel}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#687182]">
          {people
            .filter((p) => p.id !== "you")
            .map((p) => p.name)
            .join(" · ")}
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="mt-2 w-full rounded-[7px] border border-white/10 bg-[#0B0F16] px-2.5 py-1.5 text-[12px] text-white/80 placeholder:text-[#687182]"
        />
      </div>

      {canonicalFacts.length > 0 && (
        <details className="border-b border-white/[0.06] px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
            Known constraints ({canonicalFacts.length})
          </summary>
          <ul className="mt-1.5 space-y-1">
            {canonicalFacts.map((f) => (
              <li key={f} className="text-[11.5px] leading-relaxed text-[#9AA3B2]">
                · {f}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <p className="text-[12.5px] text-[#687182]">No messages match.</p>
        )}
        {filtered.map((m) => {
          const isCandidate = m.actor === "candidate";
          return (
            <div key={m.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-medium text-white/70">
                {initialsFor(m.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={`truncate text-[12.5px] font-medium ${
                      isCandidate ? "text-[#B8C4FF]" : "text-[#F4F5F7]"
                    }`}
                  >
                    {m.authorName}
                  </span>
                  <span className="text-[10.5px] text-[#687182]">{m.authorRole}</span>
                  <span className="shrink-0 text-[10.5px] text-[#687182]">{timeLabel(m.at)}</span>
                </div>
                {isCandidate ? (
                  <p className="mt-0.5 max-w-[92%] rounded-[8px] bg-[#6470FF]/20 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-white/90">
                    {m.text}
                  </p>
                ) : (
                  <MessageBody text={m.text} onOpenFile={onOpenFile} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative border-t border-white/[0.06] p-3">
        {attachOpen && (
          <div className="absolute bottom-full left-3 mb-1 w-[240px] rounded-[8px] border border-white/12 bg-[#10141D] p-1 shadow-xl">
            {attachments.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => {
                  onDraftChange(`${draft}${draft ? " " : ""}@${path.split("/").pop()}`);
                  setAttachOpen(false);
                }}
                className="block w-full rounded-[6px] px-2.5 py-1.5 text-left text-[12px] text-[#9AA3B2] hover:bg-white/[0.05] hover:text-white"
              >
                {path}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex items-end gap-2"
        >
          <button
            type="button"
            onClick={() => setAttachOpen((v) => !v)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-white/12 text-[#9AA3B2] hover:bg-white/[0.05]"
            aria-label="Attach or reference a file"
          >
            📎
          </button>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Message Northbeam…"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-[8px] border border-white/10 bg-[#0B0F16] px-3 py-2 text-[12.5px] text-white/85 placeholder:text-[#687182]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex h-9 shrink-0 items-center rounded-[8px] bg-[#6470FF] px-3.5 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
