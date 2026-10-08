import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import FydellMark from "@/components/brand/FydellMark";
import PassportCover from "@/components/passport/PassportCover";
import InView from "@/components/marketing/kit/InView";
import type { PassportData } from "@/lib/passport/view";
import s from "./exhibit.module.css";

/*
 * The homepage, composed as six chapters. Every visual is built from the
 * sample fixture (a fictional engineer and project) so the page shows the
 * product rather than describing it; nothing here is a score.
 */

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

type Line = { n: number; text: string };

function basename(path: string) {
  return path.split("/").pop() ?? path;
}

/** A long source line, cut after its keyword so it reads at display size. */
function shorten(text: string, max = 52) {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(" return ", max);
  return cut > 0 ? `${t.slice(0, cut + 7)} …` : `${t.slice(0, max)} …`;
}

/** The excerpt of the first sample finding, with the line that carries the claim marked. */
export function citedLines(passport: PassportData) {
  const e = passport.projects[0].evidence[0];
  const lines: Line[] = e.excerpt.map((text, i) => ({ n: e.startLine + i, text }));
  const key = lines.find((l) => /res\.status\s*</.test(l.text))?.n ?? lines[0].n;
  return { evidence: e, lines, key };
}

/* ------------------------------------------------------------------ */
/* 1 · Hero: the pieces of evidence converge into one Passport          */
/* ------------------------------------------------------------------ */

export function ExhibitHero({
  passport,
  title,
  lead,
  primary,
  secondary,
  label,
  caption,
}: {
  passport: PassportData;
  caption: string;
  title: readonly [string, string];
  lead: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  label: string;
}) {
  const project = passport.projects[0];
  const { evidence, lines, key } = citedLines(passport);
  const near = lines.filter((l) => l.n >= key - 1 && l.n <= key + 1);

  return (
    <section className={s.hero}>
      <div className={cx("l-container", s.heroIn)}>
        <h1 className={s.heroTitle}>
          <span className="block">{title[0]}</span> <span className={cx("block", s.dim)}>{title[1]}</span>
        </h1>
        <p className={s.heroLead}>{lead}</p>
        <div className={s.actions}>
          <Link href={primary.href} className={s.cta}>
            {primary.label}
          </Link>
          <Link href={secondary.href} className={s.more}>
            {secondary.label}
            <Chevron />
          </Link>
        </div>
      </div>

      <div className="l-container">
        <figure className={s.stageFig}>
          <div role="img" aria-label={label} className={s.stage}>
            <svg aria-hidden viewBox="0 0 1120 600" preserveAspectRatio="none" className={cx(s.frag, s.threads)}>
              <path d="M250 120 C 330 150, 360 190, 420 220" />
              <path d="M880 112 C 820 140, 780 170, 730 200" />
              <path d="M232 470 C 320 460, 370 430, 420 400" />
              <path d="M900 470 C 820 460, 780 430, 720 400" />
            </svg>

            <div className={cx(s.frag, s.fragCode)} style={{ "--r": "-3deg", "--dx": "-60px", "--dy": "-30px" } as CSSProperties}>
              <p>{evidence.path}</p>
              {near.map((l) => (
                <div key={l.n} className={l.n === key ? s.codeKey : undefined}>
                  <span>{l.n}</span>
                  <span>{shorten(l.text, 30)}</span>
                </div>
              ))}
            </div>

            <div className={cx(s.frag, s.fragCommit)} style={{ "--r": "2deg", "--dx": "60px", "--dy": "-40px" } as CSSProperties}>
              <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="8" r="2.6" />
                <path d="M1 8h4.4M10.6 8H15" />
              </svg>
              <span className={s.mono}>
                {project.revisionRef ?? "main"} @ {project.commitSha.slice(0, 7)}
              </span>
            </div>

            <div className={cx(s.frag, s.fragLimit)} style={{ "--r": "-1.5deg", "--dx": "-70px", "--dy": "40px" } as CSSProperties}>
              <i aria-hidden />
              Read from the code; not run
            </div>

            <div className={cx(s.frag, s.fragFinding)} style={{ "--r": "2.5deg", "--dx": "70px", "--dy": "50px" } as CSSProperties}>
              <p>{evidence.category} · Observation</p>
              <p>{evidence.finding.split(". ")[0]}.</p>
            </div>

            <div className={s.passport}>
              <PassportCover passport={passport} nameAs="p" badge={<span className={s.badge}>Example</span>} />
            </div>
          </div>
          <figcaption className={s.caption}>{caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Product reveal: one finding on a laptop, numbered like a spec    */
/* ------------------------------------------------------------------ */

const CALLOUTS = [
  { title: "A plain sentence.", body: "About the code, never the person." },
  { title: "The exact lines.", body: "Matched line for line, so anyone can check." },
  { title: "A pinned commit.", body: "The evidence can't drift under the reader." },
  { title: "Its limits.", body: "In the reading path, not the fine print." },
] as const;

function Pin({ n }: { n: number }) {
  return (
    <span aria-hidden className={s.pin}>
      {n}
    </span>
  );
}

export function Reveal({
  id,
  passport,
  title,
  lead,
  label,
}: {
  id?: string;
  passport: PassportData;
  title: string;
  lead: string;
  label: string;
}) {
  const project = passport.projects[0];
  const { evidence, lines, key } = citedLines(passport);

  return (
    <section id={id} className={s.reveal} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="l-container">
        <h2 id={id ? `${id}-title` : undefined} className={cx(s.h2, s.center)}>
          {title}
        </h2>
        <p className={cx(s.sub, s.center)}>{lead}</p>

        <figure className={s.revealFig}>
          <InView className={s.device}>
            <div className={s.bezel}>
              <div role="img" aria-label={label} className={s.screen}>
                <div className={s.screenBar}>
                  <span className={s.mono}>
                    <b>{project.repoFullName}</b> {project.revisionRef ?? "main"} @ {project.commitSha.slice(0, 7)}
                    <Pin n={3} />
                  </span>
                  <span>
                    {project.coverage.analyzedFiles} of {project.coverage.totalFiles} files read
                  </span>
                </div>
                <div className={s.screenBody}>
                  <div className={s.screenText}>
                    <div>
                      <p className={s.screenKicker}>
                        <Pin n={1} />
                        <span className="capitalize">{evidence.category}</span> · Observation
                      </p>
                      <p className={s.screenFinding}>{evidence.finding}</p>
                    </div>
                    <div>
                      <p className={s.screenKicker}>
                        <Pin n={4} />
                        Limits
                      </p>
                      <ul className={s.limits}>
                        {evidence.limitations.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={cx(s.screenCode, s.mono)}>
                    <p className={s.screenPath}>
                      <Pin n={2} />
                      {evidence.path} · lines {evidence.startLine}–{evidence.endLine}
                    </p>
                    {lines.map((l) => (
                      <div key={l.n} className={l.n === key ? s.codeKey : undefined}>
                        <span>{l.n}</span>
                        <span>{l.text || " "}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden className={s.base}>
              <i />
            </div>
            <div aria-hidden className={s.floor} />
          </InView>

          <ol className={s.callouts}>
            {CALLOUTS.map((c, i) => (
              <li key={c.title}>
                <span aria-hidden className={s.pinLg}>
                  {i + 1}
                </span>
                <p className={s.calloutTitle}>{c.title}</p>
                <p className={s.calloutBody}>{c.body}</p>
              </li>
            ))}
          </ol>
          <figcaption className="sr-only">{label}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · Why it's different: one line, magnified, and the chain behind it */
/* ------------------------------------------------------------------ */

export function EvidenceChain({
  passport,
  title,
  lead,
  label,
}: {
  passport: PassportData;
  title: string;
  lead: string;
  label: string;
}) {
  const project = passport.projects[0];
  const { evidence, lines, key } = citedLines(passport);
  const near = lines.filter((l) => l.n >= key - 1 && l.n <= key + 1);
  const chain = [
    { k: "Finding", v: "4xx other than 429 are not retried.", mono: false, tone: s.n1 },
    { k: "Lines", v: `${basename(evidence.path)} ${evidence.startLine}–${evidence.endLine}`, mono: true, tone: s.n2 },
    { k: "Commit", v: project.commitSha.slice(0, 7), mono: true, tone: s.n3 },
    { k: "Limit", v: "Read, not run.", mono: false, tone: s.n4 },
  ];

  return (
    <section id="evidence" className={s.dark} aria-labelledby="evidence-title">
      <div aria-hidden className={s.darkGlow} />
      <div className="l-container">
        <h2 id="evidence-title" className={cx(s.h2xl, s.center)}>
          {title}
        </h2>
        <p className={cx(s.sub, s.subDark, s.center)}>{lead}</p>

        <InView className={s.macroWrap}>
          <figure role="img" aria-label={label} className={cx(s.macro, s.mono)}>
            {near.map((l) => (
              <div key={l.n} className={l.n === key ? s.macroKey : undefined}>
                <span>{l.n}</span>
                <span>{shorten(l.text)}</span>
              </div>
            ))}
          </figure>

          <ol className={s.chain}>
            {chain.map((c) => (
              <li key={c.k}>
                <i aria-hidden className={c.tone} />
                <p className={s.chainK}>{c.k}</p>
                <p className={cx(s.chainV, c.mono && s.mono)}>{c.v}</p>
              </li>
            ))}
          </ol>
        </InView>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4 · The system, in three steps                                       */
/* ------------------------------------------------------------------ */

export function Steps({ id, passport, title }: { id?: string; passport: PassportData; title: readonly [string, string] }) {
  const project = passport.projects[0];
  const second = project.evidence[1] ?? project.evidence[0];
  const { analyzedFiles: read, totalFiles: total } = project.coverage;

  return (
    <section id={id} className={s.steps} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="l-container">
        <h2 id={id ? `${id}-title` : undefined} className={s.h2}>
          <span className="block">{title[0]}</span> <span className={cx("block", s.dim)}>{title[1]}</span>
        </h2>
        <ol className={s.stepGrid}>
          <li className={s.step}>
            <div aria-hidden className={s.stepFig}>
              <div className={cx(s.toggleRow, s.toggleOn)}>
                <span className={s.mono}>{project.repoFullName}</span>
                <i />
              </div>
              <div className={s.toggleRow}>
                <span>Uploaded ZIP · labelled as uploaded</span>
                <i />
              </div>
              <div className={s.toggleRow}>
                <span>Described in your words</span>
                <i />
              </div>
            </div>
            <StepText n="01" title="Choose the work." body="Only the projects you pick. Public code isn't required." />
          </li>
          <li className={s.step}>
            <div aria-hidden className={s.stepFig}>
              <div className={s.readRow}>
                <span>Files read</span>
                <span className={s.mono}>
                  {read} / {total}
                </span>
              </div>
              <div className={s.readBar}>
                <span style={{ flex: read }} />
                <span style={{ flex: Math.max(total - read, 0) }} />
              </div>
              <div className={s.miniFinding}>
                <p>{second.finding.split(", so ")[0].replace(/\.$/, "")}.</p>
                <p className={s.mono}>
                  {basename(second.path)} {second.startLine}–{second.endLine}
                </p>
              </div>
            </div>
            <StepText n="02" title="Fydell reads the code." body="Findings cite their lines. What wasn't read is named." />
          </li>
          <li className={s.step}>
            <div aria-hidden className={s.stepFig}>
              <div className={s.linkCard}>
                <div>
                  <span className={s.mono}>fydell.com/p/…</span>
                  <span className={s.revoke}>Revoke</span>
                </div>
                <p>1 project · pinned · expires in 30 days</p>
              </div>
            </div>
            <StepText n="03" title="Share on your terms." body="A scoped link with an expiry. Revoke it any time." />
          </li>
        </ol>
      </div>
    </section>
  );
}

function StepText({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className={s.stepText}>
      <p className={cx(s.mono, s.stepN)}>{n}</p>
      <h3 className={s.stepTitle}>{title}</h3>
      <p className={s.stepBody}>{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5 · For hiring teams: requirement-by-requirement review, on black    */
/* ------------------------------------------------------------------ */

type Fit = { requirement: string; reading: string; open: string };

function fitStatus(reading: string): { label: string; tone: string } {
  if (/^Supporting evidence:/.test(reading)) return { label: "Supporting evidence", tone: s.stSupport };
  if (/^Relevant but not yet/.test(reading)) return { label: "Not yet enough", tone: s.stNotYet };
  return { label: "Open question", tone: s.stOpen };
}

export function ReviewStage({
  id,
  passport,
  role,
  fit,
  kicker,
  title,
  lead,
  link,
  label,
}: {
  id?: string;
  passport: PassportData;
  role: string;
  fit: Record<string, Fit>;
  kicker: string;
  title: string;
  lead: string;
  link: { href: string; label: string };
  label: string;
}) {
  const evidence = passport.projects.flatMap((p) => p.evidence).filter((e) => fit[e.id]);

  return (
    <section id={id} className={s.black} aria-labelledby={id ? `${id}-title` : undefined}>
      <div aria-hidden className={s.blackGlow} />
      <div className="l-container">
        <p className={cx(s.kicker, s.center)}>{kicker}</p>
        <h2 id={id ? `${id}-title` : undefined} className={cx(s.h2xl, s.center)}>
          {title}
        </h2>
        <p className={cx(s.sub, s.subDark, s.center)}>{lead}</p>

        <InView className={s.reviewWrap}>
          <figure role="img" aria-label={label} className={s.review}>
            <div className={s.reviewHead}>
              <span>{role}</span>
              <span>Example application · {passport.displayName}</span>
            </div>
            <div className={s.reviewRows}>
              {evidence.map((e) => {
                const f = fit[e.id];
                const st = fitStatus(f.reading);
                return (
                  <div key={e.id} className={s.req}>
                    <div>
                      <p className={s.reqTitle}>{f.requirement}</p>
                      <p className={s.reqSub}>
                        <span className={s.mono}>
                          {basename(e.path)} {e.startLine}–{e.endLine}
                        </span>{" "}
                        · {f.open}
                      </p>
                    </div>
                    <span className={cx(s.status, st.tone)}>
                      <i aria-hidden />
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={s.reviewFoot}>
              <span>Fydell doesn&apos;t rank, reject or recommend.</span>
              <span className={s.decide}>
                <span className={s.decidePrimary}>Advance</span>
                <span>Hold</span>
                <span>Decline</span>
              </span>
            </div>
          </figure>
        </InView>
        <p className={s.center}>
          <Link href={link.href} className={cx(s.more, s.moreDark)}>
            {link.label}
            <Chevron />
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Closing                                                          */
/* ------------------------------------------------------------------ */

export function ExhibitClosing({
  title,
  primary,
  secondary,
  fineprint,
}: {
  title: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  fineprint: ReactNode;
}) {
  return (
    <section className={s.closing}>
      <div className={cx("l-container", s.center)}>
        <FydellMark width={72} className={s.closingMark} />
        <h2 className={s.closingTitle}>{title}</h2>
        <div className={s.actions}>
          <Link href={primary.href} className={s.cta}>
            {primary.label}
          </Link>
          <Link href={secondary.href} className={s.more}>
            {secondary.label}
            <Chevron />
          </Link>
        </div>
        <p className={s.fineprint}>{fineprint}</p>
      </div>
    </section>
  );
}
