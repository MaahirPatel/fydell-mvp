import Link from "next/link";
import type { ReactNode } from "react";
import RevealObserver from "./RevealObserver";
import s from "./site.module.css";

export function Arrow() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" className={s.arrow} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function Lines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line) => (
        <span key={line} className={s.line}>
          {line}{" "}
        </span>
      ))}
    </>
  );
}

export type Cta = { href: string; label: string; external?: boolean };

function CtaLink({ cta, className }: { cta: Cta; className: string }) {
  if (cta.external) {
    return (
      <a href={cta.href} className={className}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className}>
      {cta.label}
    </Link>
  );
}

function Actions({ primary, secondary, className }: { primary?: Cta; secondary?: Cta; className?: string }) {
  if (!primary && !secondary) return null;
  return (
    <div className={className ?? s.actions}>
      {primary ? <CtaLink cta={primary} className={`l-btn l-btn-lg l-btn-solid ${s.btn}`} /> : null}
      {secondary ? <CtaLink cta={secondary} className={`l-btn l-btn-lg ${s.btn} ${s.btnQuiet}`} /> : null}
    </div>
  );
}

/**
 * Page hero: a large left-aligned statement, one grey line with the actions
 * beside it, an optional facts line under the actions, then the product.
 */
export function SiteHero({
  title,
  lead,
  announcement,
  primary,
  secondary,
  supporting,
  meta,
  children,
}: {
  title: readonly string[];
  lead?: ReactNode;
  announcement?: Cta;
  primary?: Cta;
  secondary?: Cta;
  supporting?: Cta;
  meta?: ReactNode;
  align?: "left";
  children?: ReactNode;
}) {
  return (
    <section className={s.hero}>
      <div className={s.container}>
        {announcement ? (
          <Link href={announcement.href} className={`${s.announce} ${s.heroIn}`}>
            {announcement.label} <Arrow />
          </Link>
        ) : null}
        <h1 className={`${s.heroTitle} ${s.heroIn}`}>
          <Lines lines={title} />
        </h1>
        {lead || primary || secondary ? (
          <div className={`${s.heroRow} ${s.heroIn}`}>
            {lead ? <p className={s.heroLead}>{lead}</p> : null}
            {primary || secondary || supporting ? (
              <div className={s.heroCtas}>
                <Actions primary={primary} secondary={secondary} />
                {supporting ? (
                  <Link href={supporting.href} className={s.supporting}>
                    {supporting.label} <Arrow />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {meta ? <div className={`${s.heroMeta} ${s.heroIn}`}>{meta}</div> : null}
        {children ? <div className={`${s.heroVisual} ${s.heroIn}`}>{children}</div> : null}
      </div>
    </section>
  );
}

/**
 * One chapter of a page, opened by a hairline. `layout` varies the
 * composition: "stack" puts the title and copy side by side above a
 * full-width product view, "split" puts copy and view side by side, and
 * "text" is copy only.
 */
export function Feature({
  id,
  title,
  body,
  points,
  link,
  layout = "stack",
  flip = false,
  children,
}: {
  id: string;
  title: string;
  body: ReactNode;
  points?: readonly { title: string; body: string }[];
  link?: Cta;
  layout?: "stack" | "split" | "text";
  flip?: boolean;
  children?: ReactNode;
}) {
  const heading = (
    <h2 id={`${id}-title`} className={s.h2}>
      {title}
    </h2>
  );
  const copy = (
    <div className={s.featureCopy}>
      <div className={s.featureBody}>{typeof body === "string" ? <p>{body}</p> : body}</div>
      {link ? (
        <Link href={link.href} className={s.textLink}>
          {link.label} <Arrow />
        </Link>
      ) : null}
    </div>
  );
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={s.section}>
      <RevealObserver />
      <div className={s.container}>
        <div className={s.rule} data-reveal>
          {layout === "split" ? (
            <div className={flip ? s.splitFlip : s.split}>
              <div className={s.splitText}>
                {heading}
                {copy}
              </div>
              <div className={s.splitVisual}>{children}</div>
            </div>
          ) : (
            <>
              <div className={s.featureHead}>
                {heading}
                {copy}
              </div>
              {children ? <div className={s.stackVisual}>{children}</div> : null}
            </>
          )}
          {points?.length ? (
            <dl className={s.points} data-reveal="group">
              {points.map((p) => (
                <div key={p.title}>
                  <dt>{p.title}</dt>
                  <dd>{p.body}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SiteClosing({ title, body, primary, secondary }: { title: string; body?: string; primary: Cta; secondary?: Cta }) {
  return (
    <section className={s.closing} aria-labelledby="closing-title">
      <RevealObserver />
      <div className={s.container}>
        <div className={s.closingInner} data-reveal>
          <h2 id="closing-title" className={s.closingTitle}>
            {title}
          </h2>
          <div className={s.closingSide}>
            {body ? <p className={s.closingBody}>{body}</p> : null}
            <Actions primary={primary} secondary={secondary} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFaq({ title = "Questions", items }: { title?: string; items: readonly { q: string; a: string }[] }) {
  return (
    <section className={s.section} aria-labelledby="faq-title">
      <RevealObserver />
      <div className={s.container}>
        <div className={`${s.rule} ${s.faqGrid}`} data-reveal>
          <h2 id="faq-title" className={s.h2}>
            {title}
          </h2>
          <div className={s.faq}>
            {items.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Availability, written as a word and a small mark, never as a pill. */
export function Availability({ state, children }: { state: "available" | "beta" | "preview"; children: ReactNode }) {
  return (
    <p className={s.availability} data-state={state}>
      <span aria-hidden className={s.availabilityMark} />
      {children}
    </p>
  );
}
