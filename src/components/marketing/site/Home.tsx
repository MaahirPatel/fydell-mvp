import Link from "next/link";
import type { ReactNode } from "react";
import RevealObserver from "./RevealObserver";
import s from "./home.module.css";

export function ArrowRight() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  );
}

export function Announcement({ href, label, action }: { href: string; label: string; action: string }) {
  return (
    <Link href={href} className={s.announce}>
      <strong>{label}</strong>
      <span aria-hidden>·</span>
      {action}
      <span className={s.circle}>
        <ArrowUpRight />
      </span>
    </Link>
  );
}

/** The page's opening statement. Its parts settle in order on first paint (CSS only). */
export function CenteredHero({
  announcement,
  title,
  lead,
  actions,
  children,
}: {
  announcement?: ReactNode;
  title: string;
  lead: string;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={s.hero}>
      <div className={s.container}>
        {announcement ? <div className={s.heroIn}>{announcement}</div> : null}
        <h1 className={`${s.title} ${s.heroIn}`}>{title}</h1>
        <p className={`${s.lead} ${s.heroIn}`}>{lead}</p>
        <div className={`${s.ctas} ${s.heroIn}`}>{actions}</div>
        {children ? <div className={`${s.heroStage} ${s.heroIn}`}>{children}</div> : null}
      </div>
    </section>
  );
}

/** A section opened by a two-tone heading: the statement, then a quieter clause. */
export function ShowcaseSection({
  id,
  title,
  aside,
  more,
  children,
  after,
}: {
  id: string;
  title: string;
  aside: string;
  more?: { href: string; label: string };
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={s.section}>
      <RevealObserver />
      <div className={s.container}>
        <div className={s.head} data-reveal="group">
          <h2 id={`${id}-title`} className={s.h2}>
            {title} <span className={s.muted}>{aside}</span>
          </h2>
          {more ? (
            <Link href={more.href} className={s.more}>
              {more.label} <ArrowRight />
            </Link>
          ) : null}
        </div>
        <div data-reveal>{children}</div>
        {after}
      </div>
    </section>
  );
}

export function Tiles({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <dl className={s.tiles} data-reveal="group">
      {items.map((t) => (
        <div key={t.title} className={s.tile}>
          <dt className={s.tileTitle}>{t.title}</dt>
          <dd className={s.tileBody}>{t.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CenteredClosing({ title, actions }: { title: string; actions: ReactNode }) {
  return (
    <section className={s.closing} aria-labelledby="closing-title">
      <RevealObserver />
      <div className={s.container} data-reveal="group">
        <h2 id="closing-title" className={s.closingTitle}>
          {title}
        </h2>
        <div className={s.ctas}>{actions}</div>
      </div>
    </section>
  );
}
