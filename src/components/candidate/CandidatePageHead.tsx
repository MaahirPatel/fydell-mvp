import { Fragment, type ReactNode } from "react";
import s from "./candidate.module.css";

export type HeadMeta = { label: string; value: ReactNode };

/**
 * The one page header for candidate surfaces: where you are, what this is,
 * the facts that matter, and how far along it is.
 */
export function CandidatePageHead({
  eyebrow = [],
  title,
  lead,
  aside,
  meta = [],
  rail,
}: {
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
          {eyebrow.length ? (
            <p className={s.eyebrow}>
              {eyebrow.map((part, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span aria-hidden className={s.eyebrowSep} /> : null}
                  <span>{part}</span>
                </Fragment>
              ))}
            </p>
          ) : null}
          <h1 className={s.title}>{title}</h1>
          {lead ? <p className={s.lead}>{lead}</p> : null}
        </div>
        {aside}
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
