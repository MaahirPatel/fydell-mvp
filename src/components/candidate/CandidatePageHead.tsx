import { Fragment, type ReactNode } from "react";
import s from "./candidate.module.css";

export type HeadMeta = { label: string; value: ReactNode };

/**
 * The one page header for candidate surfaces: the title, who it belongs to,
 * one line on what it is, the primary action at the right, and the facts that
 * matter underneath.
 */
export function CandidatePageHead({
  eyebrow = [],
  title,
  lead,
  aside,
  meta = [],
  rail,
}: {
  /** Context such as organisation and role, shown under the title. */
  eyebrow?: readonly ReactNode[];
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  meta?: readonly HeadMeta[];
  rail?: ReactNode;
}) {
  return (
    <header className={s.head}>
      <div className={s.headTop}>
        <div className="min-w-0">
          <h1 className={s.title}>{title}</h1>
          {eyebrow.length ? (
            <p className={s.context}>
              {eyebrow.map((part, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span aria-hidden className={s.contextSep} /> : null}
                  <span>{part}</span>
                </Fragment>
              ))}
            </p>
          ) : null}
          {lead ? <p className={s.lead}>{lead}</p> : null}
        </div>
        {aside ? <div className="flex max-w-full flex-wrap items-center gap-2 sm:shrink-0">{aside}</div> : null}
      </div>
      {meta.length ? (
        <dl className={s.meta}>
          {meta.map((m) => (
            <div key={m.label} className={s.metaItem}>
              <dt className={s.metaLabel}>{m.label}</dt>
              <dd className={s.metaValue}>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rail ? <div className={s.railBox}>{rail}</div> : null}
    </header>
  );
}

export default CandidatePageHead;
