"use client";

import { Info } from "lucide-react";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import type { TeamMessage } from "@/lib/sandbox-demo/state";
import { cx, formatTime } from "./ui";
import s from "./demo.module.css";

/** A stable colour slot for a teammate, from their place in the scenario. */
export function teammateTone(scenario: DemoScenario, id: string): string {
  const i = scenario.teammates.findIndex((m) => m.id === id);
  return i < 0 ? "none" : String(i % 4);
}

export function Avatar({ scenario, id, large = false }: { scenario: DemoScenario; id: string; large?: boolean }) {
  const person = scenario.teammates.find((m) => m.id === id);
  return (
    <span className={cx(s.avatar, large && s.avatarLg)} data-tone={id === "you" ? "you" : teammateTone(scenario, id)} aria-hidden>
      {id === "you" ? "You" : (person?.initials ?? "?")}
    </span>
  );
}

/**
 * The team thread as submitted, for the report and the employer view. Every
 * message is shown as written; check-ins are labelled so a reviewer can tell
 * who started each exchange.
 */
export function Transcript({ scenario, messages }: { scenario: DemoScenario; messages: TeamMessage[] }) {
  const shown = messages.filter((m) => m.kind !== "notice" || m.from === "system");
  if (shown.length === 0) return <p className={s.meta}>Not observed. No messages were exchanged before submitting.</p>;
  return (
    <ol className={s.transcript} aria-label="Team conversation">
      {shown.map((m) => {
        if (m.from === "system") {
          return (
            <li key={m.id} className={cx(s.turn, s.turnNotice)}>
              <Info size={14} aria-hidden className="mt-0.5 shrink-0" />
              <span>{m.text}</span>
            </li>
          );
        }
        const person = scenario.teammates.find((p) => p.id === m.from);
        const to = m.to ? scenario.teammates.find((p) => p.id === m.to) : null;
        return (
          <li key={m.id} className={s.turn}>
            <Avatar scenario={scenario} id={m.from} />
            <div className={s.turnBody}>
              <p className={s.turnHead}>
                <span className={s.turnName}>{m.from === "you" ? "Candidate" : (person?.name ?? m.from)}</span>
                {m.from === "you" && to ? <span className={s.meta}>to {to.name}</span> : null}
                {m.from !== "you" && person ? <span className={s.meta}>{person.title}</span> : null}
                {m.kind === "checkin" ? <span className={s.checkinTag}>Check-in</span> : null}
                <time className={s.meta} dateTime={m.at}>
                  {formatTime(m.at)}
                </time>
              </p>
              <p className={s.turnText}>{m.text}</p>
              {m.from === "you" && m.status === "unavailable" ? <p className={s.turnNotice}>No reply arrived: {m.notice}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
