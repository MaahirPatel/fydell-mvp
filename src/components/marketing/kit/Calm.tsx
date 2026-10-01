import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Plus, X } from "lucide-react";
import InView from "./InView";
import { Arrow } from "./Kit";
import s from "./calm.module.css";

/*
 * Text-first marketing sections. No product screenshots: each block answers
 * one question a visitor has (which path is mine, how does it work, what is
 * different, can I trust it) in large type, with painted art only as quiet
 * atmosphere. Layout follows the shared kit's container and type scale.
 */

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** The Fydell ring palette. Items cycle through it so each one is easy to tell apart. */
export type Tone = "violet" | "teal" | "coral" | "amber" | "blue";
const TONE_CLASS: Record<Tone, string> = { violet: s.tViolet, teal: s.tTeal, coral: s.tCoral, amber: s.tAmber, blue: s.tBlue };
const CYCLE: readonly Tone[] = ["teal", "violet", "coral", "amber", "blue"];
const toneAt = (i: number, tone?: Tone) => TONE_CLASS[tone ?? CYCLE[i % CYCLE.length]];

/** Lines are authored, like the kit's headings. */
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

/** Two (or three) large choices under the hero: "I am hiring", "I am an engineer". */
export function PathCards({ items }: { items: readonly { eyebrow: string; title: string; cta: string; href: string; icon?: ReactNode; tone?: Tone }[] }) {
  return (
    <div className={cx("l-container", s.pathsWrap)}>
      <div className={s.paths}>
        {items.map((p, i) => (
          <Link key={p.href} href={p.href} className={cx(s.path, toneAt(i, p.tone))}>
            <span className={s.pathTop}>
              {p.icon ? (
                <span aria-hidden className={s.tile}>
                  {p.icon}
                </span>
              ) : null}
              <span className={s.pathEyebrow}>{p.eyebrow}</span>
            </span>
            <span className={s.pathTitle}>{p.title}</span>
            <span className={s.pathCta}>
              {p.cta}
              <Arrow />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * A bento grid, the way Linear explains a product: each card is one idea,
 * a small real fragment of Fydell on a tinted tile, and two lines of copy.
 */
export function Bento({
  items,
}: {
  items: readonly { title: string; body: string; visual: ReactNode; label: string; wide?: boolean; tone?: Tone }[];
}) {
  return (
    <div className={s.bento}>
      {items.map((item, i) => (
        <InView key={item.title} className={cx(s.bentoCard, item.wide && s.bentoWide, toneAt(i, item.tone))}>
          <div role="img" aria-label={item.label} className={s.bentoArt}>
            {item.visual}
          </div>
          <div className={s.bentoText}>
            <h3 className={s.featTitle}>{item.title}</h3>
            <p className={s.featBody}>{item.body}</p>
          </div>
        </InView>
      ))}
    </div>
  );
}

/** A section heading: title on the left, a short lead on the right. */
export function CalmHead({ id, title, lead, link }: { id?: string; title: readonly string[]; lead?: ReactNode; link?: { href: string; label: string } }) {
  return (
    <div className={s.head}>
      <h2 id={id} className={s.h2}>
        <Lines lines={title} />
      </h2>
      {lead || link ? (
        <div className={s.headLead}>
          {lead ? <p>{lead}</p> : null}
          {link ? (
            <Link href={link.href} className={s.textLink}>
              {link.label}
              <Arrow />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CalmSection({ id, labelledBy, label, children }: { id?: string; labelledBy?: string; label?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} aria-label={label} className={s.section}>
      <div className={cx("l-container", s.sectionIn)}>{children}</div>
    </section>
  );
}

/** Numbered steps under a ruled line: 01, 02, 03. */
export function Steps({ items }: { items: readonly { title: string; body: string }[] }) {
  return (
    <ol className={s.steps} style={{ ["--cols" as string]: String(Math.min(items.length, 4)) }}>
      {items.map((step, i) => (
        <li key={step.title} className={cx(s.step, toneAt(i))}>
          <span className={s.stepDot}>{String(i + 1).padStart(2, "0")}</span>
          <h3 className={s.stepTitle}>{step.title}</h3>
          <p className={s.stepBody}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** A hairline grid of short points, each with an optional line icon. */
export function FeatureGrid({ items }: { items: readonly { icon?: ReactNode; title: string; body: string }[] }) {
  return (
    <div className={s.feats} style={{ ["--cols" as string]: String(items.length % 3 === 0 ? 3 : items.length === 4 ? 2 : Math.min(items.length, 3)) }}>
      {items.map((f, i) => (
        <div key={f.title} className={cx(s.feat, toneAt(i))}>
          {f.icon ? (
            <span aria-hidden className={s.tile}>
              {f.icon}
            </span>
          ) : null}
          <h3 className={s.featTitle}>{f.title}</h3>
          <p className={s.featBody}>{f.body}</p>
        </div>
      ))}
    </div>
  );
}

type Panel = {
  id: string;
  eyebrow: string;
  title: string;
  points: readonly string[];
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
};

/** The two audiences side by side: hiring teams on ink, engineers on paper. */
export function Audience({ dark, light }: { dark: Panel; light: Panel }) {
  return (
    <div className={s.audience}>
      {[dark, light].map((p, i) => (
        <div key={p.id} id={p.id} className={cx(s.panel, i === 0 ? s.panelDark : s.panelLight)}>
          <p className={s.panelEyebrow}>{p.eyebrow}</p>
          <h2 className={s.panelTitle}>{p.title}</h2>
          <ul className={s.panelList}>
            {p.points.map((pt) => (
              <li key={pt}>
                <Check aria-hidden className={s.panelCheck} />
                {pt}
              </li>
            ))}
          </ul>
          <div className={s.panelActions}>
            <Link href={p.primary.href} className={cx(s.pill, i === 0 ? s.pillOnDark : s.pillSolid)}>
              {p.primary.label}
            </Link>
            {p.secondary ? (
              <Link href={p.secondary.href} className={cx(s.pill, i === 0 ? s.pillGhostDark : s.pillGhost)}>
                {p.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** What Fydell does, and what it never does. */
export function TrustList({ yes, no }: { yes: readonly { strong: string; rest: string }[]; no: readonly { strong: string; rest: string }[] }) {
  return (
    <div className={s.trust}>
      <ul aria-label="What Fydell does">
        {yes.map((item) => (
          <li key={item.strong}>
            <Check aria-hidden className={s.yes} />
            <span>
              <b>{item.strong}</b> {item.rest}
            </span>
          </li>
        ))}
      </ul>
      <ul aria-label="What Fydell never does">
        {no.map((item) => (
          <li key={item.strong}>
            <X aria-hidden className={s.no} />
            <span>
              <b>{item.strong}</b> {item.rest}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Questions: heading on the left, an accordion on the right. The first one starts open. */
export function Questions({ id, title = ["Questions"], items, link }: { id: string; title?: readonly string[]; items: readonly { q: string; a: string }[]; link?: { href: string; label: string } }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={s.section}>
      <div className={cx("l-container", s.qa)}>
        <div className={s.qaHead}>
          <h2 id={`${id}-title`} className={s.h2}>
            <Lines lines={title} />
          </h2>
          {link ? (
            <Link href={link.href} className={s.textLink}>
              {link.label}
              <Arrow />
            </Link>
          ) : null}
        </div>
        <div className={s.qaList}>
          {items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>
                {item.q}
                <Plus aria-hidden className={s.plus} />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * A numbered, long-form walkthrough: one row per stage, number and title on
 * the left, what happens and what to notice on the right.
 */
export function Chapters({
  items,
}: {
  items: readonly { id: string; title: string; body: string; points?: readonly string[]; link?: { href: string; label: string } }[];
}) {
  return (
    <ol className={s.chapters}>
      {items.map((c, i) => (
        <li key={c.id} id={c.id} className={cx(s.chapter, toneAt(i))}>
          <div className={s.chapterHead}>
            <span className={s.stepDot}>{String(i + 1).padStart(2, "0")}</span>
            <h2 id={`${c.id}-title`} className={s.chapterTitle}>
              {c.title}
            </h2>
          </div>
          <div className={s.chapterBody}>
            <p>{c.body}</p>
            {c.points?.length ? (
              <ul>
                {c.points.map((pt) => (
                  <li key={pt}>
                    <Check aria-hidden className={s.panelCheck} />
                    {pt}
                  </li>
                ))}
              </ul>
            ) : null}
            {c.link ? (
              <Link href={c.link.href} className={s.textLink}>
                {c.link.label}
                <Arrow />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The last call to action, on Fydell violet. */
export function ClosingPanel({
  title,
  primary = { href: "/get-started", label: "Get started" },
  secondary = { href: "/contact", label: "Talk to us" },
}: {
  title: readonly string[];
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className={s.closing} aria-label="Get started">
      <div className="l-container">
        <div className={s.closingIn}>
          <h2 className={s.closingTitle}>
            <Lines lines={title} />
          </h2>
          <div className={s.closingActions}>
            <Link href={primary.href} className={cx(s.pill, s.pillOnDark, s.pillLg)}>
              {primary.label}
            </Link>
            <Link href={secondary.href} className={cx(s.pill, s.pillGhostDark, s.pillLg)}>
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
