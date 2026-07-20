"use client";

import {
  CHANNEL_NAME,
  CHANNEL_PARTICIPANTS,
  type ChatMessage,
  type InboxParticipant,
} from "@/lib/relay/inbox-seed";

export type { ChatMessage };

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

/**
 * Slack-style client inbox — a single channel (`#northbeam-ops`), not a
 * wizard. This is where ambiguity lives: the ops manager and VP disagree on
 * what to build, and neither the brief nor this thread resolves it for you.
 * Only the candidate composes here; the bounded reply simulator (never a
 * live model) answers questions strictly within canonical.json's facts.
 */
export default function ClientInbox({
  canonicalFacts,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  channelName,
  participants,
}: {
  canonicalFacts: string[];
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  channelName?: string;
  participants?: InboxParticipant[];
}) {
  const channel = channelName || CHANNEL_NAME;
  const people = participants || CHANNEL_PARTICIPANTS;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Client inbox</p>
        <p className="mt-1 truncate text-[13px] font-medium text-white">{channel}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/35">
          {people.filter((p) => p.id !== "you").map((p) => p.name).join(" · ")}
        </p>
      </div>

      {canonicalFacts.length > 0 && (
        <details className="border-b border-white/[0.06] px-3 py-2 open:pb-2.5">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">
            Known constraints ({canonicalFacts.length})
          </summary>
          <ul className="mt-1.5 space-y-1">
            {canonicalFacts.map((f) => (
              <li key={f} className="text-[11.5px] leading-relaxed text-white/50">
                · {f}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && <p className="text-[12.5px] text-white/35">No messages yet.</p>}
        {messages.map((m) => {
          const isCandidate = m.actor === "candidate";
          return (
            <div key={m.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-medium text-white/70">
                {initialsFor(m.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`truncate text-[12.5px] font-medium ${isCandidate ? "text-[#B8C4FF]" : "text-white/85"}`}>
                    {m.authorName}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-white/30">{timeLabel(m.at)}</span>
                </div>
                <p
                  className={`mt-0.5 max-w-[92%] rounded-[8px] px-2.5 py-1.5 text-[12.5px] leading-relaxed ${
                    isCandidate ? "bg-[#3B5BFF]/20 text-white/90" : "bg-white/[0.05] text-white/75"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex gap-2 border-t border-white/[0.06] p-3"
      >
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={`Message ${CHANNEL_NAME}…`}
          className="min-w-0 flex-1 rounded-[7px] border border-white/10 bg-black/30 px-3 py-2 text-[12.5px] text-white/85"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="inline-flex h-9 shrink-0 items-center rounded-[7px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C] disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
