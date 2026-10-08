"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { engFetch } from "@/components/eng/api";
import { cn } from "@/lib/cn";
import type { CollaborationView, TeamMessageRequest, TeamMessageView, TeammateView } from "@/lib/eng/authored/collaboration-types";
import { formatClock, newClientMsgId } from "./lib";
import type { CollaborationState } from "./useCollaboration";
import { readCollaboration } from "./useCollaboration";

type Pending = { clientMsgId: string; teammateId: string; body: string; state: "sending" | "failed"; error: string | null };

const MAX_BODY = 4000;

export function Composer({
  label,
  placeholder,
  value,
  disabled,
  busy,
  sendLabel,
  onChange,
  onSend,
  id,
  children,
  maxLength = MAX_BODY,
}: {
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  busy: boolean;
  sendLabel: string;
  onChange: (v: string) => void;
  onSend: () => void;
  id: string;
  children?: React.ReactNode;
  /** Character limit for the message. Defaults to the team thread's limit. */
  maxLength?: number;
}) {
  return (
    <div className="grid shrink-0 gap-2 border-t border-[var(--border-default)] bg-[var(--surface-panel)] p-3">
      {children}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy && value.trim()) onSend();
          }
        }}
        className="sim-scroll max-h-[200px] min-h-[76px] w-full resize-y rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[15px] leading-[1.5] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--text-tertiary)]">Enter to send, Shift+Enter for a new line</p>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || busy || !value.trim()}
          className="h-8 rounded-[6px] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-45"
        >
          {sendLabel}
        </button>
      </div>
    </div>
  );
}

function TeammateLine({ teammate }: { teammate: TeammateView | undefined }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="font-medium text-[var(--text-primary)]">{teammate?.name ?? "Teammate"}</span>
      <span className="text-[12px] text-[var(--text-tertiary)]">Simulated teammate</span>
    </span>
  );
}

function MessageItem({ message, teammates }: { message: TeamMessageView; teammates: Map<string, TeammateView> }) {
  const from = message.teammateId ? teammates.get(message.teammateId) : undefined;
  const to = message.toTeammateId ? teammates.get(message.toTeammateId) : undefined;
  if (message.sender === "candidate") {
    return (
      <li className="grid gap-1">
        <p className="flex items-baseline justify-between gap-2 text-[12.5px] text-[var(--text-tertiary)]">
          <span>
            <span className="font-medium text-[var(--text-secondary)]">You</span>
            {to ? ` to ${to.name}` : ""}
          </span>
          <time dateTime={message.createdAt}>{formatClock(message.createdAt)}</time>
        </p>
        <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)]">{message.body}</p>
      </li>
    );
  }
  if (message.kind === "scenario_event") {
    return (
      <li className="grid gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--sim-scenario-bg)] px-3 py-2.5">
        <p className="flex items-baseline justify-between gap-2 text-[12.5px]">
          <TeammateLine teammate={from} />
          <time dateTime={message.createdAt} className="shrink-0 text-[var(--text-tertiary)]">
            {formatClock(message.createdAt)}
          </time>
        </p>
        <p className="whitespace-pre-wrap text-[14.5px] leading-[1.55] text-[var(--text-body)]">{message.body}</p>
        {message.answeredFrom === "scenario_notes" ? <p className="text-[12px] text-[var(--text-tertiary)]">Model unavailable, answered from scenario notes</p> : null}
      </li>
    );
  }
  return (
    <li className="grid gap-1">
      <p className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <TeammateLine teammate={from} />
        <time dateTime={message.createdAt} className="shrink-0 text-[var(--text-tertiary)]">
          {formatClock(message.createdAt)}
        </time>
      </p>
      <p className="whitespace-pre-wrap text-[15px] leading-[1.6] text-[var(--text-body)]">{message.body}</p>
      {message.answeredFrom === "scenario_notes" ? <p className="text-[12px] text-[var(--text-tertiary)]">Model unavailable, answered from scenario notes</p> : null}
    </li>
  );
}

/**
 * Messages with the simulated teammates. Teammates answer from the scenario
 * and never edit files. Each send carries a client id, so a retry after a
 * network failure never duplicates a message.
 */
export function TeamPanel({ base, state, onView }: { base: string; state: CollaborationState; onView: (view: CollaborationView) => void }) {
  const view = state.view;
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const teammates = useMemo(() => new Map((view?.teammates ?? []).map((t) => [t.id, t])), [view?.teammates]);
  const recipient = (selected && teammates.get(selected)) || view?.teammates[0] || null;
  const messages = useMemo(() => [...(view?.messages ?? [])].sort((a, b) => a.seq - b.seq), [view?.messages]);
  const sending = pending.some((p) => p.state === "sending");

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length]);

  const deliver = async (item: Pending) => {
    setPending((list) => list.map((p) => (p.clientMsgId === item.clientMsgId ? { ...p, state: "sending", error: null } : p)));
    const body: TeamMessageRequest = { teammateId: item.teammateId, body: item.body, clientMsgId: item.clientMsgId };
    const res = await engFetch<unknown>(`${base}/team`, { body });
    if (res.ok === false) {
      const error = res.status === 0 ? "Not sent. Check your connection, then retry." : res.error;
      setPending((list) => list.map((p) => (p.clientMsgId === item.clientMsgId ? { ...p, state: "failed", error } : p)));
      return;
    }
    const next = readCollaboration(res.data);
    if (next) onView(next);
    setPending((list) => list.filter((p) => p.clientMsgId !== item.clientMsgId));
  };

  const send = () => {
    if (!recipient || !draft.trim()) return;
    const item: Pending = { clientMsgId: newClientMsgId(), teammateId: recipient.id, body: draft.trim(), state: "sending", error: null };
    setPending((list) => [...list, item]);
    setDraft("");
    void deliver(item);
  };

  if (state.status === "loading") {
    return <p className="p-4 text-[13.5px] text-[var(--text-secondary)]">Loading team chat</p>;
  }
  if (state.status === "unavailable" || !view) {
    return <p className="p-4 text-[14px] leading-[1.6] text-[var(--text-secondary)]">Team chat is not available for this task. Work from the brief, and state any assumption in your handoff.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {view.eventDisclosure ? <p className="mb-4 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">{view.eventDisclosure}</p> : null}
        {messages.length || pending.length ? (
          <ol aria-label="Team thread" className="grid gap-4">
            {messages.map((m) => (
              <MessageItem key={m.id} message={m} teammates={teammates} />
            ))}
            {pending.map((p) => (
              <li key={p.clientMsgId} className="grid gap-1">
                <p className="text-[12.5px] text-[var(--text-tertiary)]">
                  <span className="font-medium text-[var(--text-secondary)]">You</span> to {teammates.get(p.teammateId)?.name ?? "teammate"}
                </p>
                <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)] opacity-80">{p.body}</p>
                {p.state === "sending" ? (
                  <p className="text-[12.5px] text-[var(--text-tertiary)]">Waiting for a reply from {teammates.get(p.teammateId)?.name ?? "your teammate"}</p>
                ) : (
                  <p role="alert" className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--sim-error)]">
                    {p.error}
                    <button type="button" onClick={() => void deliver(p)} className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setPending((list) => list.filter((x) => x.clientMsgId !== p.clientMsgId))}
                      className="text-[var(--text-secondary)] underline underline-offset-2"
                    >
                      Discard
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">No messages yet. Choose a teammate below and ask about anything in their area.</p>
        )}
        {state.stale ? <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">Could not refresh the thread. Retrying.</p> : null}
        <div ref={endRef} />
      </div>

      {view.open ? (
        <Composer
          id="sim-team-composer"
          label={recipient ? `Message to ${recipient.name}` : "Message"}
          placeholder={recipient ? `Message ${recipient.name}` : "Message"}
          value={draft}
          disabled={!recipient}
          busy={sending}
          sendLabel="Send"
          onChange={setDraft}
          onSend={send}
        >
          <div role="radiogroup" aria-label="Send to" className="flex flex-wrap gap-1.5">
            {view.teammates.map((t, i) => {
              const checked = recipient?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  title={t.responsibilities}
                  onClick={() => setSelected(t.id)}
                  onKeyDown={(e) => {
                    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                    if (!delta) return;
                    e.preventDefault();
                    const next = view.teammates[(i + delta + view.teammates.length) % view.teammates.length];
                    setSelected(next.id);
                    const sibling = delta > 0 ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
                    const target = sibling instanceof HTMLElement ? sibling : (e.currentTarget.parentElement?.children[delta > 0 ? 0 : view.teammates.length - 1] as HTMLElement | undefined);
                    target?.focus();
                  }}
                  className={cn(
                    "flex max-w-full flex-col items-start rounded-[8px] border px-2.5 py-1 text-left",
                    checked ? "border-[var(--accent-line)] bg-[var(--surface-selected)]" : "border-[var(--border-default)] hover:bg-[var(--surface-hover)]",
                  )}
                >
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">{t.name}</span>
                  <span className="max-w-[220px] truncate text-[11.5px] text-[var(--text-tertiary)]">{t.title}</span>
                </button>
              );
            })}
          </div>
        </Composer>
      ) : (
        <p className="shrink-0 border-t border-[var(--border-default)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">This thread is closed. You can still read it.</p>
      )}
    </div>
  );
}
