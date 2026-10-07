import Link from "next/link";
import type { ReactNode } from "react";
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

/** Centred page hero: optional announcement, headline, lead, actions, then the product. */
export function SiteHero({
  title,
  lead,
  announcement,
  primary,
  secondary,
  supporting,
  eyebrow,
  align = "center",
  children,
}: {
  title: readonly string[];
  lead?: ReactNode;
  announcement?: Cta;
  primary?: Cta;
  secondary?: Cta;
  supporting?: Cta;
  eyebrow?: ReactNode;
  align?: "center" | "left";
  children?: ReactNode;
}) {
  return (
    <section className={align === "left" ? s.heroLeft : s.hero}>
      <div className={s.container}>
        <div className={s.heroText}>
          {announcement ? (
            <Link href={announcement.href} className={s.announce}>
              {announcement.label} <Arrow />
            </Link>
          ) : null}
          {eyebrow ? <div className={s.eyebrow}>{eyebrow}</div> : null}
          <h1 className={s.heroTitle}>
            <Lines lines={title} />
          </h1>
          {lead ? <p className={s.heroLead}>{lead}</p> : null}
          {primary || secondary ? (
            <div className={s.heroActions}>
              {primary ? <CtaLink cta={primary} className="l-btn l-btn-lg l-btn-solid" /> : null}
              {secondary ? <CtaLink cta={secondary} className={`l-btn l-btn-lg ${s.btnQuiet}`} /> : null}
            </div>
          ) : null}
          {supporting ? (
            <Link href={supporting.href} className={s.supporting}>
              {supporting.label} <Arrow />
            </Link>
          ) : null}
        </div>
        {children ? <div className={s.heroVisual}>{children}</div> : null}
      </div>
    </section>
  );
}

/**
 * One chapter of a page. `layout` varies the composition: "stack" puts the
 * text above a full-width product view, "split" puts them side by side, and
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
  const text = (
    <div className={s.featureText}>
      <h2 id={`${id}-title`} className={s.h2}>
        {title}
      </h2>
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
      <div className={s.container}>
        {layout === "split" ? (
          <div className={flip ? s.splitFlip : s.split}>
            {text}
            <div className={s.splitVisual}>{children}</div>
          </div>
        ) : (
          <>
            <div className={layout === "stack" ? s.stackHead : undefined}>{text}</div>
            {children ? <div className={s.stackVisual}>{children}</div> : null}
          </>
        )}
        {points?.length ? (
          <dl className={s.points}>
            {points.map((p) => (
              <div key={p.title}>
                <dt>{p.title}</dt>
                <dd>{p.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

export function SiteClosing({ title, body, primary, secondary }: { title: string; body?: string; primary: Cta; secondary?: Cta }) {
  return (
    <section className={s.closing} aria-labelledby="closing-title">
      <div className={s.container}>
        <div className={s.closingInner}>
          <div>
            <h2 id="closing-title" className={s.h2}>
              {title}
            </h2>
            {body ? <p className={s.closingBody}>{body}</p> : null}
          </div>
          <div className={s.heroActions}>
            <CtaLink cta={primary} className="l-btn l-btn-lg l-btn-solid" />
            {secondary ? <CtaLink cta={secondary} className={`l-btn l-btn-lg ${s.btnQuiet}`} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFaq({ title = "Questions", items }: { title?: string; items: readonly { q: string; a: string }[] }) {
  return (
    <section className={s.section} aria-labelledby="faq-title">
      <div className={s.container}>
        <div className={s.faqGrid}>
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
