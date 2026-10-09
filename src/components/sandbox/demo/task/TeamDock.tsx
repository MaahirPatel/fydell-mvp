"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Info, PanelRightClose, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DemoScenario, DemoTeammate } from "@/lib/sandbox-demo/catalog-types";
import type { TeamMessage } from "@/lib/sandbox-demo/state";
import { CHECKIN_RULES, CHECKIN_TRIGGERS, MESSAGE_CHAR_LIMIT } from "@/lib/sandbox-demo/team";
import { checkinSenderId } from "@/lib/sandbox-demo/team-client";
import { formatClock } from "@/components/simulations/workspace/lib";
import { Composer } from "@/components/simulations/workspace/TeamPanel";
import t from "./task.module.css";

const UNKNOWN: DemoTeammate = { id: "", name: "Teammate", title: "", initials: "?", knows: [], wontShare: "" };

export function teammate(scenario: DemoScenario, id: string): DemoTeammate {
  return scenario.teammates.find((c) => c.id === id) ?? UNKNOWN;
}

export function TeammateAvatar({ scenario, id, size = 26 }: { scenario: DemoScenario; id: string; size?: number }) {
  const i = scenario.teammates.findIndex((c) => c.id === id);
  return (
    <span aria-hidden className={t.avatar} data-tone={i < 0 ? "none" : String(i % 4)} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      {teammate(scenario, id).initials}
    </span>
  );
}

function CheckinLabel() {
  return <span className={t.checkin}>Check-in</span>;
}

function Message({ scenario, message, onRetry }: { scenario: DemoScenario; message: TeamMessage; onRetry: (id: string) => void }) {
  if (message.from === "system") {
    return (
      <li className="flex items-start gap-2 text-app-meta leading-[1.5] text-[var(--text-tertiary)]">
        <Info aria-hidden size={13} className="mt-[3px] shrink-0" />
        <span>{message.text}</span>
      </li>
    );
  }
  if (message.from === "you") {
    const to = message.to ? teammate(scenario, message.to) : null;
    return (
      <li className="grid gap-1">
        <p className="flex items-baseline justify-between gap-2 text-app-meta text-[var(--text-tertiary)]">
          <span>
            <span className="font-medium text-[var(--text-secondary)]">You</span>
            {to ? ` to ${to.name}` : ""}
          </span>
          <time dateTime={message.at}>{formatClock(message.at)}</time>
        </p>
        <p className={cn("whitespace-pre-wrap rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[14.5px] leading-[1.55] text-[var(--text-primary)]", message.status === "sending" && "opacity-80")}>
          {message.text}
        </p>
        {message.status === "sending" ? <p className="text-app-meta text-[var(--text-tertiary)]">Sending</p> : null}
        {message.status === "unavailable" ? (
          <div role="alert" className="grid gap-1.5 rounded-[8px] bg-[var(--sim-attention-bg)] px-3 py-2">
            <p className="text-app-meta leading-[1.5] text-[var(--text-primary)]">
              No reply. {message.notice ?? "The teammate service did not answer."} Your message is kept here.
            </p>
            <div>
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2.5 text-app-meta font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                <RotateCw aria-hidden size={12} />
                Retry
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  }
  const from = teammate(scenario, message.from);
  return (
    <li className="grid gap-1.5">
      <div className="flex items-center gap-2 text-app-meta">
        <TeammateAvatar scenario={scenario} id={message.from} size={24} />
        <span className="font-medium text-[var(--text-primary)]">{from.name}</span>
        <span className="min-w-0 truncate text-[var(--text-tertiary)]">{from.title}</span>
        {message.kind === "checkin" ? <CheckinLabel /> : null}
        <time dateTime={message.at} className="ml-auto shrink-0 text-[var(--text-tertiary)]">
          {formatClock(message.at)}
        </time>
      </div>
      <p className="whitespace-pre-wrap pl-8 text-[14.5px] leading-[1.6] text-[var(--text-body)]">{message.text}</p>
    </li>
  );
}

function Typing({ scenario, who }: { scenario: DemoScenario; who: string }) {
  return (
    <li className="flex items-center gap-2 text-app-meta text-[var(--text-secondary)]">
      <TeammateAvatar scenario={scenario} id={who} size={24} />
      <span>{teammate(scenario, who).name.split(" ")[0]} is writing</span>
      <span className={t.dots} aria-hidden>
        <span />
        <span />
        <span />
      </span>
    </li>
  );
}

function RecipientPicker({ scenario, value, onChange }: { scenario: DemoScenario; value: string; onChange: (id: string) => void }) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const ids = scenario.teammates.map((m) => m.id);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = ids[(i + delta + ids.length) % ids.length];
    onChange(next);
    refs.current.get(next)?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Send to" className="grid grid-cols-2 gap-1.5">
      {ids.map((id, i) => {
        const checked = value === id;
        const person = teammate(scenario, id);
        return (
          <button
            key={id}
            ref={(el) => {
              if (el) refs.current.set(id, el);
              else refs.current.delete(id);
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-[8px] border px-2 py-1.5 text-left",
              checked ? "border-[var(--accent-line)] bg-[var(--surface-selected)]" : "border-[var(--border-default)] hover:bg-[var(--surface-hover)]",
            )}
          >
            <TeammateAvatar scenario={scenario} id={id} size={24} />
            <span className="grid min-w-0">
              <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">{person.name}</span>
              <span className="truncate text-app-meta text-[var(--text-tertiary)]">{person.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The docked team panel: who the teammates are, what they can see, when they
 * check in, the thread and the composer.
 */
export function TeamDock({
  scenario,
  team,
  typing,
  messageInFlight,
  onSend,
  onRetry,
  onCollapse,
  collapseLabel,
}: {
  scenario: DemoScenario;
  team: TeamMessage[];
  typing: string[];
  messageInFlight: boolean;
  onSend: (to: string, text: string) => void;
  onRetry: (id: string) => void;
  onCollapse: () => void;
  collapseLabel: string;
}) {
  const [to, setTo] = useState<string>(() => checkinSenderId(scenario, "kickoff"));
  const kickoff = teammate(scenario, checkinSenderId(scenario, "kickoff"));
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const tooLong = draft.trim().length > MESSAGE_CHAR_LIMIT;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [team.length, typing.length]);

  const send = () => {
    if (tooLong || !draft.trim()) return;
    onSend(to, draft);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--border-default)] pl-4 pr-2">
        <h2 className="text-[13.5px] font-semibold text-[var(--text-primary)]">Simulated teammates</h2>
        <div className="flex -space-x-1.5" aria-hidden>
          {scenario.teammates.map(({ id }) => (
            <span key={id} className="rounded-full ring-2 ring-[var(--surface-panel)]">
              <TeammateAvatar scenario={scenario} id={id} size={20} />
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={collapseLabel}
          className="ml-auto grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <PanelRightClose aria-hidden size={15} />
        </button>
      </div>
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <p className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">
          AI teammates that answer from the scenario&apos;s facts and what they can see of your work in this demo: your changed files and test results. They
          never edit your files.
        </p>
        <details className="group mt-1.5">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[4px] text-app-meta font-medium text-[var(--accent-ink)] hover:underline">
            <ChevronRight aria-hidden size={13} className="transition-transform group-open:rotate-90" />
            When do teammates check in?
          </summary>
          <ul className="mt-2 grid gap-1.5 pl-1">
            {CHECKIN_TRIGGERS.map((trigger) => (
              <li key={trigger} className="flex items-start gap-2 text-app-meta leading-[1.5] text-[var(--text-body)]">
                <TeammateAvatar scenario={scenario} id={checkinSenderId(scenario, trigger)} size={18} />
                <span>{CHECKIN_RULES[trigger]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-app-meta leading-[1.5] text-[var(--text-tertiary)]">Each check-in happens at most once. Fewer messages never count against you.</p>
        </details>
      </div>

      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {team.length || typing.length ? (
          <ol aria-label="Team thread" aria-live="polite" className="grid gap-4">
            {team.map((m) => (
              <Message key={m.id} scenario={scenario} message={m} onRetry={onRetry} />
            ))}
            {typing.map((who, i) => (
              <Typing key={`${who}-${i}`} scenario={scenario} who={who} />
            ))}
          </ol>
        ) : (
          <p className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
            {kickoff.name.split(" ")[0]} checks in when you open the task. Ask any teammate about their area; the Brief lists what each one can help
            with.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <Composer
        id="demo-team-composer"
        label={`Message to ${teammate(scenario, to).name}`}
        placeholder={`Message ${teammate(scenario, to).name.split(" ")[0]}`}
        value={draft}
        disabled={false}
        busy={messageInFlight || tooLong}
        sendLabel="Send"
        maxLength={MESSAGE_CHAR_LIMIT + 200}
        onChange={setDraft}
        onSend={send}
      >
        <RecipientPicker scenario={scenario} value={to} onChange={setTo} />
        {tooLong ? (
          <p role="alert" className="text-app-meta text-[var(--sim-error)]">
            Keep messages under {MESSAGE_CHAR_LIMIT} characters.
          </p>
        ) : null}
      </Composer>
    </div>
  );
}
