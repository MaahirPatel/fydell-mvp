import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Check,
  FileText,
  FlaskConical,
  Lock,
  MessageSquare,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import InView from "./InView";
import { Arrow, type Art } from "./Kit";
import s from "./plain.module.css";

/*
 * Plain product pictures for the home page. Each one tells a single idea in a
 * few large words, on the same painted grounds as the rest of the site. They
 * replace full application screenshots, which asked a first-time visitor to
 * read code diffs, test names and checksums before they knew what Fydell is.
 */

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const ART_CLASS: Record<Art, string> = { lake: s.artLake, coast: s.artCoast, hills: s.artHills };

/** A painted ground holding plain cards. `label` describes the picture for screen readers. */
export function Scene({ art, label, children, wide = false }: { art: Art; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <InView className={cx(s.scene, ART_CLASS[art], wide && s.sceneWide)}>
      <div role="img" aria-label={label} className={s.sceneIn}>
        {children}
      </div>
    </InView>
  );
}

/** A section as two columns: words on one side, one plain picture on the other. */
export function Feature({
  id,
  title,
  lead,
  points,
  link,
  flip = false,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  points?: readonly string[];
  link?: { href: string; label: string };
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={s.feature}>
      <div className={cx("l-container", s.featureIn, flip && s.featureFlip)}>
        <div className={s.featureText}>
          <h2 id={`${id}-title`} className={s.featureTitle}>
            {title}
          </h2>
          <p className={s.featureLead}>{lead}</p>
          {points?.length ? (
            <ul className={s.points}>
              {points.map((p) => (
                <li key={p}>
                  <Check aria-hidden className={s.pointIcon} />
                  {p}
                </li>
              ))}
            </ul>
          ) : null}
          {link ? (
            <Link href={link.href} className={cx("l-link", s.featureLink)}>
              {link.label}
              <Arrow />
            </Link>
          ) : null}
        </div>
        <div className={s.featureArt}>{children}</div>
      </div>
    </section>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  return (
    <p className={s.step}>
      <span className={s.stepNum}>{n}</span>
      {label}
    </p>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone?: "green" | "amber" | "red" | "dark" }) {
  return <span className={cx(s.chip, tone && s[`chip_${tone}`])}>{children}</span>;
}

/* ------------------------------------------------------------------------ */
/* Hero: the whole product in three cards.                                   */
/* ------------------------------------------------------------------------ */

export function HeroFlow() {
  return (
    <div className="l-container">
      <Scene art="lake" wide label="How Fydell works: a candidate gets a real task, does the work, and the hiring team reviews the evidence and decides.">
        <div className={s.flow}>
          <div className={cx(s.card, s.flowCard)}>
            <Step n={1} label="The task" />
            <h3 className={s.cardTitle}>Alerts are being sent too many times</h3>
            <p className={s.cardBody}>A payment company&apos;s webhooks keep retrying. Find out why, fix it, and tell the team what you changed.</p>
            <div className={s.chips}>
              <Chip>About 1 hour</Chip>
              <Chip>Python</Chip>
              <Chip>Real codebase</Chip>
            </div>
          </div>

          <FlowArrow />

          <div className={cx(s.card, s.flowCard)}>
            <Step n={2} label="The work" />
            <ul className={s.events}>
              <Event icon={<FileText />} text="Read the incident brief" />
              <Event icon={<MessageSquare />} text="Asked the team a question" />
              <Event icon={<Bell />} text="The requirement changed" tone="amber" />
              <Event icon={<FlaskConical />} text="Ran the tests" meta="All passing" tone="green" />
              <Event icon={<Upload />} text="Sent the fix with a handoff" />
            </ul>
          </div>

          <FlowArrow />

          <div className={cx(s.card, s.flowCard)}>
            <Step n={3} label="The review" />
            <h3 className={s.cardTitle}>Your team decides</h3>
            <ul className={s.findings}>
              <Finding ok text="Asked before assuming" cite="Team thread, 14:02" />
              <Finding ok text="Capped retries, with tests" cite="retry_policy.py, lines 6–7" />
              <Finding text="Missed one header case" cite="Hidden check 9" />
            </ul>
            <div className={s.decision}>
              <span className={s.decisionPill}>
                <Check aria-hidden className={s.icon14} />
                Advance to interview
              </span>
              <span className={s.decisionNote}>No score. Every point cites the work.</span>
            </div>
          </div>
        </div>
      </Scene>
    </div>
  );
}

function FlowArrow() {
  return (
    <span aria-hidden className={s.flowArrow}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

function Event({ icon, text, meta, tone }: { icon: ReactNode; text: string; meta?: string; tone?: "green" | "amber" }) {
  return (
    <li className={s.event}>
      <span aria-hidden className={cx(s.eventIcon, tone && s[`eventIcon_${tone}`])}>
        {icon}
      </span>
      <span className={s.eventText}>{text}</span>
      {meta ? <span className={cx(s.eventMeta, tone && s[`eventMeta_${tone}`])}>{meta}</span> : null}
    </li>
  );
}

function Finding({ ok = false, text, cite }: { ok?: boolean; text: string; cite: string }) {
  return (
    <li className={s.finding}>
      <span aria-hidden className={cx(s.findingMark, ok ? s.findingOk : s.findingGap)}>
        {ok ? <Check /> : "!"}
      </span>
      <span className={s.findingText}>
        {text}
        <span className={s.cite}>{cite}</span>
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------------ */
/* Section pictures.                                                        */
/* ------------------------------------------------------------------------ */

export function BriefPicture() {
  return (
    <Scene art="coast" label="An incident brief with three clear goals, a teammate's answer, and a requirement update posted partway through.">
      <div className={s.stack}>
        <div className={cx(s.card, s.briefCard)}>
          <p className={s.kicker}>Incident brief</p>
          <h3 className={s.cardTitle}>Webhook retry storm</h3>
          <p className={s.cardBody}>A deleted endpoint was retried on every tick: 1.9 million requests in 90 minutes.</p>
          <p className={s.subhead}>What you need to do</p>
          <ul className={s.todo}>
            <li>Retry only temporary failures</li>
            <li>Wait 60 seconds, then double</li>
            <li>Stop after 8 attempts</li>
          </ul>
        </div>
        <div className={cx(s.card, s.bubble)}>
          <span aria-hidden className={s.avatar}>AM</span>
          <div>
            <p className={s.bubbleWho}>Alex Morgan · Engineering lead</p>
            <p className={s.bubbleText}>Treat 5xx, 408 and 429 as temporary. Everything else is permanent.</p>
          </div>
        </div>
        <div className={s.update}>
          <Bell aria-hidden className={s.icon16} />
          <span>
            <b>Update at 14:18</b> Honour the Retry-After header
          </span>
        </div>
      </div>
    </Scene>
  );
}

export function TrailPicture() {
  return (
    <Scene art="hills" label="A work trail listing what the candidate opened, asked, changed, tested and sent, with the list of what is and is never recorded.">
      <div className={cx(s.card, s.trailCard)}>
        <div className={s.cardHead}>
          <h3 className={s.cardHeadTitle}>Work trail</h3>
          <span className={s.cardHeadNote}>Shown to the candidate before they start</span>
        </div>
        <ul className={s.trail}>
          <TrailRow time="14:00" icon={<FileText />} text="Opened the incident brief" />
          <TrailRow time="14:02" icon={<MessageSquare />} text="Asked which failures are temporary" />
          <TrailRow time="14:09" icon={<Pencil />} text="Changed dispatcher.py" meta="+18 −6" />
          <TrailRow time="14:31" icon={<FlaskConical />} text="Ran the tests" meta="All passing" tone="green" />
          <TrailRow time="14:44" icon={<Upload />} text="Sent the work with a handoff" />
        </ul>
        <div className={s.recorded}>
          <p>
            <b>Recorded</b> Files, commands, tests, timing, messages
          </p>
          <p className={s.never}>
            <b>Never</b> Screen, webcam, microphone, keystrokes, browsing
          </p>
        </div>
      </div>
    </Scene>
  );
}

function TrailRow({ time, icon, text, meta, tone }: { time: string; icon: ReactNode; text: string; meta?: string; tone?: "green" }) {
  return (
    <li className={s.trailRow}>
      <span className={s.time}>{time}</span>
      <span aria-hidden className={s.trailIcon}>
        {icon}
      </span>
      <span className={s.trailText}>{text}</span>
      {meta ? <span className={cx(s.eventMeta, tone && s[`eventMeta_${tone}`])}>{meta}</span> : null}
    </li>
  );
}

const CHECKS: readonly { ok: boolean; text: string }[] = [
  { ok: true, text: "Waits 60 seconds after the first failure" },
  { ok: true, text: "Stops after 8 attempts" },
  { ok: true, text: "Never retries a deleted endpoint" },
  { ok: false, text: "Reads Retry-After in any letter case" },
];

export function ChecksPicture() {
  const total = 15;
  const passed = 14;
  return (
    <Scene art="lake" label="Hidden checks on the submitted code: 14 of 15 passed, with the one that failed named in plain words.">
      <div className={cx(s.card, s.checksCard)}>
        <div className={s.score}>
          <p className={s.scoreBig}>
            {passed}
            <span> of {total}</span>
          </p>
          <p className={s.scoreLabel}>hidden checks passed</p>
          <div className={s.bar} aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={i < passed ? s.barOk : s.barFail} />
            ))}
          </div>
        </div>
        <ul className={s.checks}>
          {CHECKS.map((c) => (
            <li key={c.text} className={s.check}>
              <span aria-hidden className={cx(s.findingMark, c.ok ? s.findingOk : s.findingFail)}>
                {c.ok ? <Check /> : <X />}
              </span>
              {c.text}
            </li>
          ))}
        </ul>
        <p className={s.footnote}>
          <Lock aria-hidden className={s.icon14} />
          Run on the sealed submission, in an isolated sandbox
        </p>
      </div>
    </Scene>
  );
}

export function ReportPicture() {
  return (
    <Scene art="coast" label="A report written by the hiring team: two observations and one gap, each citing the work, and the team's decision to advance.">
      <div className={cx(s.card, s.reportCard)}>
        <div className={s.cardHead}>
          <h3 className={s.cardHeadTitle}>Report · Candidate 04</h3>
          <span className={s.cardHeadNote}>Written by your team</span>
        </div>
        <ul className={s.reportList}>
          <ReportRow label="Observation" text="Retries back off and stop at the cap" cite="retry_policy.py, lines 6–7" />
          <ReportRow label="Observation" text="Asked before assuming which failures are temporary" cite="Team thread, 14:02" />
          <ReportRow label="Gap" tone="amber" text="Retry-After is only read in one letter case" cite="Hidden check 9" />
        </ul>
        <div className={s.choices}>
          <span className={cx(s.choice, s.choiceOn)}>
            <i aria-hidden />
            Advance
          </span>
          <span className={s.choice}>
            <i aria-hidden />
            Hold
          </span>
          <span className={s.choice}>
            <i aria-hidden />
            Decline
          </span>
        </div>
      </div>
    </Scene>
  );
}

function ReportRow({ label, text, cite, tone }: { label: string; text: string; cite: string; tone?: "amber" }) {
  return (
    <li className={s.reportRow}>
      <Chip tone={tone}>{label}</Chip>
      <p className={s.reportText}>{text}</p>
      <span className={s.cite}>{cite}</span>
    </li>
  );
}

export function PassportPicture() {
  return (
    <Scene art="hills" label="An Engineering Passport: findings from the engineer's own code, each linked to the exact file and lines, private until they share a link.">
      <div className={cx(s.card, s.passportCard)}>
        <div className={s.ppHead}>
          <span aria-hidden className={s.ppAvatar}>SR</span>
          <div className="min-w-0">
            <p className={s.ppName}>Sam Rivera</p>
            <p className={s.ppMeta}>
              <Lock aria-hidden className={s.icon14} />
              Engineering passport · private
            </p>
          </div>
        </div>
        <ul className={s.ppList}>
          <li>
            <div className={s.ppRow}>
              <p className={s.ppFinding}>Writes tests for their own code</p>
              <Chip tone="dark">Code we read</Chip>
            </div>
            <span className={s.citeLink}>payments-api/tests/test_charges.py, lines 12–48</span>
          </li>
          <li>
            <div className={s.ppRow}>
              <p className={s.ppFinding}>Handles errors instead of crashing</p>
              <Chip tone="dark">Code we read</Chip>
            </div>
            <span className={s.citeLink}>payments-api/app/client.py, lines 30–61</span>
          </li>
        </ul>
        <div className={s.ppShare}>
          <span>
            <b>Link for the platform team</b>
            <span className={s.ppShareOn}>On · you can turn it off any time</span>
          </span>
        </div>
      </div>
    </Scene>
  );
}
