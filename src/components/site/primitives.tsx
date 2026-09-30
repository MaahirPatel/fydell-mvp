import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, FileCode2, FlaskConical, MessageSquare, Check, X } from "lucide-react";
import s from "./site.module.css";
import Reveal from "./Reveal";

export { s as siteStyles };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.container, className)}>{children}</div>;
}

/** Standard section rhythm: 168px above on desktop, 104px on mobile. */
export function Section({
  children,
  id,
  className,
  tight,
  ariaLabel,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  tight?: boolean;
  ariaLabel?: string;
}) {
  return (
    <section id={id} className={cx(s.section, tight && s.sectionTight, className)} aria-label={ariaLabel}>
      <Container>{children}</Container>
    </section>
  );
}

/** A tinted band that breaks the page into chapters. */
export function Band({
  children,
  tone = "neutral",
  id,
}: {
  children: ReactNode;
  tone?: "neutral" | "lavender" | "rose";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cx(s.band, tone === "lavender" && s.bandLavender, tone === "rose" && s.bandRose)}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Title + lead in two columns. Title stays left-aligned, max two lines. */
export function SectionHead({
  title,
  lead,
  as: H = "h2",
  stacked,
  id,
}: {
  title: ReactNode;
  lead?: ReactNode;
  as?: "h1" | "h2";
  stacked?: boolean;
  id?: string;
}) {
  return (
    <Reveal className={stacked ? s.headStack : s.head}>
      <H className={s.title} data-r="" style={{ "--i": 0 } as CSSProperties} id={id}>
        {title}
      </H>
      {lead ? (
        <p className={s.lead} data-r="" style={{ "--i": 1 } as CSSProperties}>
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "gradient";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size,
  className,
  style,
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: "sm";
  className?: string;
  style?: CSSProperties;
  "data-hero"?: string;
}) {
  const v = { primary: s.btnPrimary, secondary: s.btnSecondary, ghost: s.btnGhost, gradient: s.btnGradient }[variant];
  const external = /^https?:/.test(href);
  const cls = cx(s.btn, v, size === "sm" && s.btnSm, className);
  if (external)
    return (
      <a href={href} className={cls} style={style} {...rest}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls} style={style} {...rest}>
      {children}
    </Link>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={s.arrowLink}>
      {children}
      <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

/** Every product visual is labelled as an example. */
export function Caption({ children }: { children: ReactNode }) {
  return <p className={s.caption}>Example: {children}</p>;
}

/**
 * The product frame: soft layered shadow, hairline gradient top edge, and
 * optional window chrome. Wrap in <Stage> to put a colour wash behind it.
 */
export function Frame({
  title,
  right,
  children,
  label,
  className,
  style,
  chrome = true,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  /** Accessible description of the whole visual. */
  label: string;
  className?: string;
  style?: CSSProperties;
  chrome?: boolean;
}) {
  return (
    <div className={cx(s.frame, className)} role="img" aria-label={label} style={style}>
      {chrome ? (
        <div className={s.chrome} aria-hidden>
          <span className={s.lights}>
            <i />
            <i />
            <i />
          </span>
          <span className={s.chromeTitle}>{title}</span>
          <span style={{ minWidth: 42, display: "flex", justifyContent: "flex-end" }}>{right}</span>
        </div>
      ) : null}
      <div aria-hidden>{children}</div>
    </div>
  );
}

export function Stage({
  children,
  quiet,
  className,
}: {
  children: ReactNode;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(s.stage, className)}>
      <div className={cx(s.wash, quiet && s.washQuiet)} aria-hidden />
      {children}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "passed" | "failed" | "changed" | "neutral" | "blue";
  children: ReactNode;
}) {
  const t = {
    passed: s.pillPassed,
    failed: s.pillFailed,
    changed: s.pillChanged,
    neutral: s.pillNeutral,
    blue: s.pillBlue,
  }[tone];
  return <span className={cx(s.pill, t)}>{children}</span>;
}

/** Evidence a finding stands on: a file and line, a test, or a message. */
export function CitationChip({
  kind,
  children,
  failed,
}: {
  kind: "file" | "test" | "message";
  children: ReactNode;
  failed?: boolean;
}) {
  const Icon = kind === "file" ? FileCode2 : kind === "test" ? FlaskConical : MessageSquare;
  return (
    <span className={cx(s.chip, failed && s.chipFailed)}>
      <Icon size={12} strokeWidth={1.5} aria-hidden />
      {children}
    </span>
  );
}

export function FeatureTrio({
  items,
}: {
  items: { title: string; body: ReactNode; art: ReactNode; glow: "teal" | "blue" | "violet" | "red" }[];
}) {
  const glow = { teal: s.glowTeal, blue: s.glowBlue, violet: s.glowViolet, red: s.glowRed };
  return (
    <Reveal className={s.trio}>
      {items.map((item, i) => (
        <div key={item.title} className={s.trioItem} data-r="" style={{ "--i": i } as CSSProperties}>
          <div className={cx(s.tile, glow[item.glow])}>{item.art}</div>
          <div className={s.trioText}>
            <h3 className={s.h3}>{item.title}</h3>
            <p className={s.body}>{item.body}</p>
          </div>
        </div>
      ))}
    </Reveal>
  );
}

export function CheckItem({ children, never }: { children: ReactNode; never?: boolean }) {
  return (
    <li>
      {never ? (
        <X size={16} strokeWidth={1.75} aria-hidden style={{ color: "var(--text-quaternary)" }} />
      ) : (
        <Check size={16} strokeWidth={1.75} aria-hidden style={{ color: "var(--fy-teal-ink)" }} />
      )}
      <span>{children}</span>
    </li>
  );
}

export { cx };

/** Inner-page hero: left-aligned title, one supporting line, optional actions. */
export function PageHero({
  title,
  lead,
  actions,
  children,
}: {
  title: ReactNode;
  lead: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const i = (n: number) => ({ "--i": n }) as CSSProperties;
  return (
    <section className={s.hero} aria-labelledby="page-title">
      <div className={s.heroWash} aria-hidden />
      <Container>
        <div className={s.heroCopy}>
          <h1 id="page-title" className={cx(s.display, s.displayPage)} data-hero="" style={i(0)}>
            {title}
          </h1>
          <p className={s.lead} data-hero="" style={i(1)}>
            {lead}
          </p>
          {actions ? (
            <div className={s.actions} data-hero="" style={i(2)}>
              {actions}
            </div>
          ) : null}
        </div>
        {children ? (
          <Reveal className={s.heroVisual}>
            <div data-hero-visual="">{children}</div>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}

export function ClosingCTA({
  title,
  lead,
  primary,
  secondary,
}: {
  title: ReactNode;
  lead: ReactNode;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  const i = (n: number) => ({ "--i": n }) as CSSProperties;
  return (
    <section className={s.closing}>
      <div className={s.wash} aria-hidden />
      <Container>
        <Reveal className={s.headStack}>
          <h2 className={s.title} data-r="" style={i(0)}>
            {title}
          </h2>
          <p className={s.lead} data-r="" style={i(1)}>
            {lead}
          </p>
          <div className={s.actions} data-r="" style={{ ...i(2), marginTop: 8 }}>
            <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
            {secondary ? (
              <ButtonLink href={secondary.href} variant="ghost">
                {secondary.label}
              </ButtonLink>
            ) : null}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Question-and-answer list, open by default so nothing hides behind a click. */
export function FAQ({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <Reveal as="dl" className={s.faq}>
      {items.map((item, n) => (
        <div key={item.q} className={s.faqItem} data-r="row" style={{ "--i": n } as CSSProperties}>
          <dt className={s.h3}>{item.q}</dt>
          <dd className={s.body}>{item.a}</dd>
        </div>
      ))}
    </Reveal>
  );
}
