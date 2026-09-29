import Link from "next/link";
import type { ReactNode } from "react";
import s from "./kit.module.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="13" height="13" className="l-arrow" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/** Title lines are passed separately so breaks are authored, like Linear's. */
function Lines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={line} className="block">
          {line}
          {i < lines.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function Hero({
  title,
  lead,
  aside,
  actions,
  compact = false,
  children,
}: {
  title: readonly string[];
  lead: ReactNode;
  aside?: { href: string; strong?: string; label: string };
  actions?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={compact ? s.heroCompact : s.hero}>
      <div className={cx("l-container", s.heroIn)}>
        <h1 className={cx("l-hero", s.heroTitle)}>
          <Lines lines={title} />
        </h1>
        <div className={s.heroRow}>
          <p className={s.heroLead}>{lead}</p>
          {aside ? (
            <Link href={aside.href} className={cx("l-link", s.heroAside)}>
              {aside.strong ? <b>{aside.strong}</b> : null}
              {aside.label}
              <Arrow />
            </Link>
          ) : null}
        </div>
        {actions ? <div className={s.heroActions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** The product, shown large and lit from below. `label` names the example. */
export function Stage({ children, label, hero = false }: { children: ReactNode; label: string; hero?: boolean }) {
  return (
    <div className="l-container">
      <figure className={cx(s.stage, hero && s.stageIn)}>
        <div className={s.frame} role="img" aria-label={label}>
          {children}
        </div>
        <figcaption className={s.caption}>{label}</figcaption>
      </figure>
    </div>
  );
}

/** A section visual: framed, dissolving into the ground at the bottom. */
export function Visual({ children, label, fade = true }: { children: ReactNode; label: string; fade?: boolean }) {
  return (
    <figure className={s.headVisual}>
      <div className={cx(fade && s.fade)}>
        <div className={s.frame} role="img" aria-label={label}>
          {children}
        </div>
      </div>
      <figcaption className={s.caption}>{label}</figcaption>
    </figure>
  );
}

export function Section({
  id,
  tight = false,
  children,
  labelledBy,
}: {
  id?: string;
  tight?: boolean;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section id={id} className={tight ? s.sectionTight : s.section} aria-labelledby={labelledBy}>
      <div className="l-container">{children}</div>
    </section>
  );
}

export function SectionHead({
  title,
  lead,
  link,
  id,
}: {
  title: readonly string[];
  lead: ReactNode;
  link?: { href: string; label: string };
  id?: string;
}) {
  return (
    <div className={s.head}>
      <h2 id={id} className={cx("l-h2", s.headTitle)}>
        <Lines lines={title} />
      </h2>
      <div className={s.headLead}>
        <p className="l-lead">{lead}</p>
        {link ? (
          <Link href={link.href} className={cx("l-link", s.headLink)}>
            {link.label}
            <Arrow />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** A 48px paragraph whose first sentence is bright and the rest recedes. */
export function Statement({ lead, rest }: { lead: string; rest: string }) {
  return (
    <h2 className={s.statement}>
      <b>{lead}</b> {rest}
    </h2>
  );
}

export function Trio({ items }: { items: readonly { fig: ReactNode; title: string; body: string }[] }) {
  return (
    <div className={s.trio}>
      {items.map((item) => (
        <div key={item.title} className={s.trioItem}>
          <div className={s.trioFig} aria-hidden>
            {item.fig}
          </div>
          <h3 className={s.trioTitle}>{item.title}</h3>
          <p className={s.trioBody}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Details({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <div className={s.details}>
      {items.map((item) => (
        <div key={item.title}>
          <h3 className={s.detailTitle}>{item.title}</h3>
          <p className={s.detailBody}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: readonly { title: string; body: string; meta?: string; tone?: "blue" | "red" }[];
}) {
  return (
    <ol className={s.timeline} style={{ ["--cols" as string]: String(Math.min(items.length, 5)) }}>
      {items.map((item) => (
        <li key={item.title} className={s.tlItem}>
          <span aria-hidden className={cx(s.tlDot, item.tone === "blue" && s.tlDotBlue, item.tone === "red" && s.tlDotRed)} />
          <h3 className={s.tlTitle}>{item.title}</h3>
          <p className={s.tlBody}>{item.body}</p>
          {item.meta ? <p className={s.tlMeta}>{item.meta}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function Ledger({
  yes,
  no,
}: {
  yes: { title: string; items: readonly { strong: string; rest: string }[] };
  no: { title: string; items: readonly { strong: string; rest: string }[] };
}) {
  return (
    <div className={s.ledger}>
      {[yes, no].map((col, i) => (
        <div key={col.title} className={cx(s.ledgerCol, i === 1 && s.ledgerColNo)}>
          <p className={s.ledgerHead}>
            <i aria-hidden />
            {col.title}
          </p>
          <ul className={s.ledgerList}>
            {col.items.map((item) => (
              <li key={item.strong}>
                <b>{item.strong}</b> {item.rest}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className={s.faq}>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export type Plan = {
  name: string;
  price: string;
  per?: string;
  note: string;
  features: readonly string[];
  cta: { href: string; label: string };
  featured?: boolean;
};

export function Plans({ plans }: { plans: readonly Plan[] }) {
  return (
    <div className={s.plans}>
      {plans.map((plan) => (
        <div key={plan.name} className={cx(s.plan, plan.featured && s.planFeatured)}>
          <p className={s.planName}>{plan.name}</p>
          <p className={s.planPrice}>
            {plan.price}
            {plan.per ? <span>{plan.per}</span> : null}
          </p>
          <p className={s.planNote}>{plan.note}</p>
          <Link href={plan.cta.href} className={cx("l-btn l-btn-lg", plan.featured ? "l-btn-solid" : "l-btn-ghost", s.planCta)}>
            {plan.cta.label}
          </Link>
          <ul className={s.planList}>
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h || i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className={s.prose}>{children}</div>;
}

export function Closing({
  title,
  primary = { href: "/get-started", label: "Get started" },
  secondary = { href: "/contact", label: "Contact sales" },
}: {
  title: readonly string[];
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className={s.closing}>
      <div className="l-container">
        <div className={s.closingRule} aria-hidden />
        <div className={s.closingRow}>
          <h2 className={cx("l-cta", s.closingTitle)}>
            <Lines lines={title} />
          </h2>
          <div className={s.closingActions}>
            <Link href={primary.href} className="l-btn l-btn-lg l-btn-solid">
              {primary.label}
            </Link>
            <Link href={secondary.href} className="l-btn l-btn-lg l-btn-ghost">
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
