"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  FileCode2,
  FlaskConical,
  GitBranch,
  Inbox,
  Link2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { CodeBlock } from "./CodeBlock";
import DesktopWorkspaceMock from "./DesktopWorkspaceMock";
import { DesktopShowcase } from "./DesktopShowcase";
import HeroSimWorkspace from "./HeroSimWorkspace";
import ProofStrip from "@/components/marketing/ProofStrip";
import { Kicker } from "@/components/marketing/ui";
import { DEMO_LABEL, DEMO_TASK, EVIDENCE_RECORDS, type CodeLine } from "@/lib/marketing/demo-fixture";
import s from "./fydell-home.module.css";

/* ---------------------------------------------------------------- hooks -- */

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Counts 0..max-1 on an interval while active; loops unless told to hold. */
function useTicker(active: boolean, ms: number, max: number, loop = true) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setTick((v) => (v + 1 >= max ? (loop ? 0 : max - 1) : v + 1));
    }, ms);
    return () => window.clearInterval(id);
  }, [active, ms, max, loop]);
  return tick;
}

function Typewriter({ text, start, speed = 16 }: { text: string; start: boolean; speed?: number }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || reduced) return;
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 2;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [start, reduced, text, speed]);
  const shown = reduced ? text.length : Math.min(count, text.length);
  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length ? <span className={s.caret} aria-hidden /> : null}
    </>
  );
}

/* ----------------------------------------------------------------- hero -- */

const FEED = [
  { icon: Share2, tone: "var(--brand-teal)", who: "Candidate 01", what: "shared their Engineering Passport", when: "12 min ago" },
  { icon: GitBranch, tone: "var(--brand-teal)", who: "Fydell", what: "analyzed receipts-service at 4f1c9a2 · 46 files", when: "11 min ago" },
  { icon: FlaskConical, tone: "var(--brand-violet)", who: "Candidate 01", what: "submitted retry-safe-jobs v0.3 · 4 of 5 tests passed", when: "4 min ago" },
  { icon: X, tone: "var(--brand-coral)", who: "Candidate 01", what: "rejected the AI-proposed patch and recorded why", when: "3 min ago" },
] as const;

const ANSWER =
  "The claim on the receipt is taken before sending but never released when the mailer raises, so the retry exits early and nothing is sent. The candidate's fix is otherwise correct.";

/** Timeline of the hero sequence, in ms from mount. */
const BEATS = [0, 900, 1700, 2600, 3500, 4300, 5600, 7600];

const SEND_EXCERPT = [
  { n: 14, text: "if not claims.acquire(job.order_id):", mark: "cited" },
  { n: 15, text: "    return  # already sent" },
  { n: 16, text: "mailer.send(job.receipt)", mark: "removed" },
  { n: 17, text: "claims.mark_sent(job.order_id)" },
] as const satisfies readonly CodeLine[];

const FAILED_TEST = EVIDENCE_RECORDS.find((r) => r.id === "ev-recovery") ?? EVIDENCE_RECORDS[0];

type HeroCite = "code" | "test";

export function HeroWindow() {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [beat, setBeat] = useState(0);
  const [cite, setCite] = useState<HeroCite | null>(null);
  useEffect(() => {
    if (reduced) return;
    const timers = BEATS.map((ms, i) => window.setTimeout(() => setBeat(i), ms + (run === 0 ? 900 : 200)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced, run]);
  const step = reduced ? BEATS.length - 1 : beat;
  const replay = () => {
    setCite(null);
    setBeat(0);
    setRun((r) => r + 1);
  };
  const toggleCite = (next: HeroCite) => setCite((c) => (c === next ? null : next));

  return (
    <div className={s.sheetWrap}>
      <span className={`${s.crop} ${s.cropTL}`} aria-hidden />
      <span className={`${s.crop} ${s.cropTR}`} aria-hidden />
      <span className={`${s.crop} ${s.cropBL}`} aria-hidden />
      <span className={`${s.crop} ${s.cropBR}`} aria-hidden />
    <div className={`${s.window} ${s.enter}`} aria-label="Example of a Fydell hiring workspace reviewing Candidate 01" role="group">
      <aside className={s.side} aria-hidden>
        <div className={s.sideHead}>
          <span className="flex items-center gap-2">
            <FydellMark width={18} /> Hiring
          </span>
          <span className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Search className="h-3.5 w-3.5" />
            <SquarePen className="h-3.5 w-3.5" />
          </span>
        </div>
        <span className={s.sideItem}><Inbox /> Inbox</span>
        <span className={s.sideItem}><Briefcase /> Roles</span>
        <span className={`${s.sideItem} ${s.sideItemActive}`}><Users /> Candidates</span>
        <span className={s.sideItem}><FlaskConical /> Simulations</span>
        <span className={s.sideLabel}>Open roles</span>
        <span className={`${s.sideItem} ${s.sideItemActive}`}>
          <span className={s.dot} style={{ background: "var(--brand-teal)" }} /> Backend Engineer
        </span>
        <span className={s.sideItem}>
          <span className={s.dot} style={{ background: "var(--brand-violet)" }} /> ML Engineer
        </span>
        <span className={s.sideItem}>
          <span className={s.dot} style={{ background: "var(--brand-warm)" }} /> Platform Engineer
        </span>
      </aside>

      <div className={s.main}>
        <div className={s.bar}>
          <span className={s.crumb}>
            <span className={s.mono}>BE-014</span>
            <b>Candidate 01</b>
            <span className="hidden sm:inline">Backend Engineer, Python</span>
          </span>
          <span className="flex items-center gap-3">
            <span className={s.example}>{DEMO_LABEL}</span>
            <span className={`${s.mono} hidden sm:inline`}>3 / 12</span>
          </span>
        </div>

        <div className={s.issue}>
          <p className={s.issueTitle}>Candidate 01</p>
          <p className={s.issueBody}>
            Shared two repositories and completed <span className={s.code}>retry-safe-jobs v0.3</span>. Four of five
            tests passed; one failure is recorded with the code behind it.
          </p>

          <p className={s.activityHead}>Activity</p>
          <div className={s.feed}>
            {FEED.slice(0, Math.min(FEED.length, step + 2)).map((item) => {
              const Icon = item.icon;
              return (
                <p key={item.what} className={s.feedItem}>
                  <span className={s.feedIcon} style={{ color: item.tone }}>
                    <Icon strokeWidth={2} />
                  </span>
                  <span>
                    <b>{item.who}</b> {item.what} · {item.when}
                  </span>
                </p>
              );
            })}
          </div>

          {step >= 3 ? (
            <div className={s.thread}>
              <div className={s.comment}>
                <p className={s.who}>
                  <span className={s.avatar} style={{ background: "var(--brand-warm)" }}>R1</span>
                  <b>Reviewer 1</b>
                  <span>2 min ago</span>
                </p>
                The retry fix is solid. I want to understand the one failing test before we advance.
              </div>
              {step >= 4 ? (
                <div className={s.comment}>
                  <p className={s.who}>
                    <span className={s.avatar} style={{ background: "var(--brand-teal)" }}>R2</span>
                    <b>Reviewer 2</b>
                    <span>just now</span>
                  </p>
                  <span className={s.mention}>@Fydell</span> explain the failed test and cite the code.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {step >= 5 ? (
          <div className={s.agent}>
            <div className={s.agentHead}>
              <span className="flex items-center gap-2">
                <FydellMark width={16} /> Fydell analysis
              </span>
              <span className={s.example}>Reads the recorded run</span>
            </div>
            <div className={s.agentBody}>
              <p className={s.agentPrompt}>Explain the failed test and cite the code.</p>
              {step === 5 ? (
                <p className={s.working}>Reading test_jobs.py and the submitted snapshot…</p>
              ) : (
                <>
                  <p className={s.worked}>Worked for 6 sec</p>
                  <p className={s.answer}>
                    <Typewriter text={ANSWER} start={step >= 6} />
                  </p>
                  {step >= 7 ? (
                    <>
                      <div className={s.cites}>
                        <button
                          type="button"
                          aria-expanded={cite === "code"}
                          onClick={() => toggleCite("code")}
                          className={`${s.cite} ${s.citeButton}`}
                        >
                          <FileCode2 className="h-3 w-3" /> send_receipt.py L14–17
                        </button>
                        <button
                          type="button"
                          aria-expanded={cite === "test"}
                          onClick={() => toggleCite("test")}
                          className={`${s.cite} ${s.citeButton}`}
                          style={{ animationDelay: "90ms" }}
                        >
                          <X className="h-3 w-3 text-[var(--brand-coral)]" /> mailer_error_allows_retry
                        </button>
                      </div>
                      {cite ? (
                        <div key={cite} className={s.excerpt}>
                          {cite === "code" ? (
                            <CodeBlock path="jobs/send_receipt.py" meta="snapshot 9c2e1f0" lines={SEND_EXCERPT} compact />
                          ) : (
                            <CodeBlock path={FAILED_TEST.file} meta="failed in recorded run" lines={FAILED_TEST.lines} compact />
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-app-caption text-[var(--text-tertiary)]">Open a citation to see the code it rests on.</p>
                      )}
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <aside className={s.props} aria-hidden>
        <div className={s.propGroup}>
          <p className={s.propLabel}>Status</p>
          <p className={s.prop}><span className={s.dot} style={{ background: "var(--brand-warm)" }} /> In review</p>
          <p className={s.prop}><Briefcase className="h-3.5 w-3.5" /> Backend Engineer</p>
          <p className={s.prop}><Users className="h-3.5 w-3.5" /> 2 reviewers</p>
        </div>
        <div className={s.propGroup}>
          <p className={s.propLabel}>Evidence</p>
          <p className={s.prop}><span className={s.dot} style={{ background: "var(--brand-teal)" }} /> 2 project findings</p>
          <p className={s.prop}><span className={s.dot} style={{ background: "var(--brand-violet)" }} /> 2 simulation findings</p>
          <p className={s.prop}><span className={s.dot} style={{ background: "var(--brand-coral)" }} /> 1 test failed</p>
        </div>
        <div className={s.propGroup}>
          <p className={s.propLabel}>Projects</p>
          <p className="flex flex-wrap gap-1.5">
            <span className={s.chip}>receipts-service</span>
            <span className={s.chip}>ledger-cli</span>
          </p>
        </div>
        <div className={s.propGroup}>
          <p className={s.propLabel}>Decision</p>
          <p className={s.prop}>None recorded</p>
        </div>
      </aside>

      <div className={`${s.titleBlock} ${s.windowFoot}`}>
        <span>Sheet <b>0.1</b></span>
        <span>Candidate record</span>
        <span className="hidden sm:block">Rev <b>9c2e1f0</b></span>
        <span className="hidden md:block">{DEMO_LABEL}</span>
        <span className={s.titleAction}>
          <button type="button" onClick={replay} className={s.control}>
            <RotateCcw aria-hidden /> Replay
          </button>
        </span>
      </div>
    </div>
    </div>
  );
}

/* ----------------------------------------------------------------- figs -- */

function FigSource() {
  return (
    <svg viewBox="0 0 220 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className={i === 3 ? s.float1 : undefined} opacity={0.35 + i * 0.2}>
          <path d={`M110 ${120 - i * 22} L190 ${80 - i * 22} L110 ${40 - i * 22} L30 ${80 - i * 22} Z`} />
        </g>
      ))}
      <g className={s.float1}>
        <path d="M70 34 L130 4" strokeOpacity="0.9" />
        <path d="M78 40 L150 4" strokeOpacity="0.5" />
        <path d="M86 46 L140 18" strokeOpacity="0.5" />
      </g>
      <path d="M110 120 V190" className={s.drawLoop} strokeOpacity="0.5" />
      <circle cx="110" cy="190" r="3" fill="currentColor" className={s.pulse} />
    </svg>
  );
}

function FigObserved() {
  const cubes: Array<[number, number, boolean]> = [
    [70, 80, false],
    [110, 60, false],
    [150, 80, true],
    [110, 100, false],
    [70, 120, false],
    [150, 120, false],
  ];
  return (
    <svg viewBox="0 0 220 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      {cubes.map(([x, y, lit], i) => (
        <g key={i} className={lit ? s.float2 : undefined} strokeOpacity={lit ? 1 : 0.45}>
          <path d={`M${x} ${y} l28 -14 l28 14 l-28 14 Z`} fill={lit ? "var(--field-violet)" : "none"} stroke={lit ? "var(--brand-violet)" : "currentColor"} />
          <path d={`M${x} ${y} v30 l28 14 v-30`} stroke={lit ? "var(--brand-violet)" : "currentColor"} />
          <path d={`M${x + 56} ${y} v30 l-28 14`} stroke={lit ? "var(--brand-violet)" : "currentColor"} />
        </g>
      ))}
    </svg>
  );
}

function FigOwned() {
  return (
    <svg viewBox="0 0 220 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path
          key={i}
          d={`M${40 + i * 18} ${150 - i * 6} l0 -${70 + i * 6} l60 -30 l0 ${70 + i * 6} Z`}
          strokeOpacity={0.25 + i * 0.13}
          className={i === 5 ? s.float3 : undefined}
          stroke={i === 5 ? "var(--brand-teal)" : "currentColor"}
          fill={i === 5 ? "var(--field-teal)" : "none"}
        />
      ))}
      <path d="M30 170 L200 110" strokeOpacity="0.3" className={s.drawLoop} />
    </svg>
  );
}

const FIGS = [
  { label: "Ev 1.1", title: "Source-linked", body: "Every finding cites the file, lines, and commit it came from. Nothing floats free of its evidence.", Art: FigSource },
  { label: "Ev 1.2", title: "Observed, not guessed", body: "Simulation results come from a trusted test harness, never from a model's opinion of the candidate.", Art: FigObserved },
  { label: "Ev 1.3", title: "Owned by the engineer", body: "Candidates decide what each employer sees and can revoke access at any time.", Art: FigOwned },
] as const;

/* ------------------------------------------------------------- chapters -- */

export function ChapterHead({
  index,
  label,
  href,
  title,
  copy,
}: {
  index: string;
  label: string;
  href: string;
  title: string;
  copy: string;
}) {
  return (
    <Reveal>
      <div className={s.chapterHead}>
        <h2 className={s.chapterTitle}>{title}</h2>
        <div>
          <p className={s.chapterCopy}>{copy}</p>
          <Link href={href} className={s.chapterIndex}>
            <span>{index}</span> {label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

export function Features({ items, dot }: { items: readonly string[]; dot: string }) {
  return (
    <ul className={s.features} style={{ ["--feature-dot" as string]: dot }}>
      {items.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

/* 1.0 Intake: repositories move through analysis on a board. */
const REPOS = [
  { id: "EP-101", name: "receipts-service", lang: "Python", files: 46, src: 31, tests: 9, skipped: 4 },
  { id: "EP-102", name: "ledger-cli", lang: "Go", files: 18, src: 0, tests: 0, skipped: 18 },
  { id: "EP-103", name: "vector-search-api", lang: "Python", files: 63, src: 44, tests: 11, skipped: 8 },
  { id: "EP-104", name: "billing-webhooks", lang: "TypeScript", files: 38, src: 27, tests: 8, skipped: 3 },
  { id: "EP-105", name: "infra-modules", lang: "HCL", files: 22, src: 0, tests: 0, skipped: 22 },
] as const;
const COLUMNS = ["Selected", "Analyzing", "Evidence ready", "Needs attention"] as const;
const COLUMN_RULE = ["var(--line)", "var(--brand-blue)", "var(--brand-teal)", "var(--brand-warm)"] as const;
const PHASES = ["Fetching tree", "Reading manifests", "Extracting evidence", "Writing coverage"] as const;

function stageFor(i: number, tick: number): number {
  const t = tick - i;
  if (t < 0) return 0;
  if (t < 2) return 1;
  return REPOS[i].src === 0 ? 3 : 2;
}

export function IntakeVisual() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [focus, setFocus] = useState(0);
  const tick = useTicker(seen && !reduced && !paused, 1300, 10);
  const t = reduced ? 9 : tick;
  const repo = REPOS[focus];
  const stage = stageFor(focus, t);
  const phase = stage === 0 ? -1 : stage === 1 ? Math.min(PHASES.length - 2, (t - focus) * 2) : PHASES.length - 1;
  const pct = Math.round(((phase + 1) / PHASES.length) * 100);
  const unsupported = repo.src === 0;

  return (
    <div ref={ref} className={s.visual}>
      <div className={s.board}>
        {COLUMNS.map((col, c) => {
          const cards = REPOS.map((r, i) => ({ r, i, stage: stageFor(i, t) })).filter((x) => x.stage === c);
          return (
            <div key={col} className={s.column}>
              <p className={s.columnHead}>
                <span className={s.dot} style={{ background: COLUMN_RULE[c] }} />
                {col} <span>{cards.length}</span>
              </p>
              {cards.map(({ r, i }) => (
                <button
                  key={`${r.id}-${c}`}
                  type="button"
                  aria-pressed={focus === i}
                  onClick={() => setFocus(i)}
                  className={`${s.card} ${s.cardButton} ${focus === i ? s.cardFocused : ""}`}
                  style={{ ["--card-rule" as string]: COLUMN_RULE[c] }}
                >
                  <span className={`${s.cardId} block`}>{r.id}</span>
                  <span className={`${s.cardTitle} block`}>{r.name}</span>
                  <span className={s.cardMeta}>
                    <span className={s.tag}>{r.lang}</span>
                    {c === 2 ? <span className={s.tag}>{r.files} files · cited</span> : null}
                    {c === 3 ? <span className={s.tag}>Structure only</span> : null}
                    {c === 1 ? <span className={s.tag}>at 4f1c9a2</span> : null}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className={s.panel} style={{ left: 0, top: 40, width: "min(380px, 100%)" }}>
        <div className={s.panelHead}>
          <span className="flex items-center gap-2"><GitBranch className="h-3.5 w-3.5" /> <b>Import from GitHub</b></span>
          <button type="button" onClick={() => setPaused((p) => !p)} className={s.control} aria-pressed={paused}>
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />} {paused ? "Play" : "Pause"}
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="rounded-[4px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 font-mono text-app-meta text-[var(--text-primary)]">
            github.com/candidate-01/<Typewriter key={repo.id} text={repo.name} start={seen} speed={50} />
          </p>
          <div aria-live="polite">
            <p className="flex justify-between text-app-meta text-[var(--text-secondary)]">
              <span>{phase < 0 ? "Queued" : unsupported && stage === 3 ? `${repo.lang} analysis not supported yet` : PHASES[phase]}</span>
              <span className="font-mono">{Math.max(0, pct)}%</span>
            </p>
            <div className={`${s.progress} mt-2`}>
              <i style={{ width: `${Math.max(0, pct)}%`, background: unsupported && stage === 3 ? "var(--brand-warm)" : "var(--brand-teal)" }} />
            </div>
          </div>
          <ul className="space-y-2 text-app-meta text-[var(--text-secondary)]">
            <li className="flex justify-between"><span>Source files read</span><span className="font-mono text-[var(--text-primary)]">{stage >= 2 ? repo.src : "–"}</span></li>
            <li className="flex justify-between"><span>Tests found</span><span className="font-mono text-[var(--text-primary)]">{stage >= 2 ? repo.tests : "–"}</span></li>
            <li className="flex justify-between"><span>Skipped, with reasons</span><span className="font-mono text-[var(--text-primary)]">{stage >= 2 ? repo.skipped : "–"}</span></li>
          </ul>
          <p className="border-t border-[var(--border-subtle)] pt-3 text-app-meta leading-[1.5] text-[var(--text-tertiary)]">
            {DEMO_LABEL}. Pick any repository on the board. Imported code is read, never executed.
          </p>
        </div>
      </div>
    </div>
  );
}

/* 2.0 Simulations: a disclosed session timeline you can scrub. */
const SEG_TONES = {
  neutral: { field: "oklch(96.4% 0.004 258)", ink: "oklch(38% 0.02 258)" },
  blue: { field: "oklch(95.6% 0.03 258)", ink: "oklch(45% 0.16 258)" },
  teal: { field: "oklch(95.6% 0.035 178)", ink: "oklch(40% 0.08 178)" },
  green: { field: "oklch(95.6% 0.04 150)", ink: "oklch(40% 0.1 150)" },
  coral: { field: "oklch(95.6% 0.03 18)", ink: "oklch(47% 0.17 18)" },
  violet: { field: "oklch(95.6% 0.035 285)", ink: "oklch(45% 0.2 285)" },
} as const;
type Seg = { at: number; w: number; text: string; note: string; tone: keyof typeof SEG_TONES };
const TRACKS: ReadonlyArray<{ label: string; segs: readonly Seg[] }> = [
  { label: "Brief", segs: [{ at: 0, w: 13, text: "Read brief", note: "Opened the brief and the disclosed recording notice.", tone: "neutral" }] },
  { label: "Investigate", segs: [{ at: 10, w: 20, text: "Reproduced", note: "Reproduced the duplicate send with a timeout on the first attempt.", tone: "blue" }] },
  { label: "Code", segs: [{ at: 28, w: 30, text: "Claim before send", note: "Added an idempotency claim on the order before calling the mailer.", tone: "teal" }] },
  {
    label: "Tests",
    segs: [
      { at: 40, w: 12, text: "3 passed", note: "First test run: 3 of 5 passing.", tone: "green" },
      { at: 64, w: 16, text: "4 of 5 passed", note: "Second run: 4 of 5 passing. mailer_error_allows_retry still fails.", tone: "green" },
    ],
  },
  { label: "AI patch", segs: [{ at: 52, w: 14, text: "Rejected", note: "Rejected the AI-proposed patch: it retried inside the request and could double-send.", tone: "coral" }] },
  { label: "Submit", segs: [{ at: 82, w: 16, text: "9c2e1f0", note: "Submitted snapshot 9c2e1f0. The record is frozen from here.", tone: "violet" }] },
];
const ALL_SEGS = TRACKS.flatMap((tr) => tr.segs.map((seg) => ({ ...seg, track: tr.label }))).sort((a, b) => a.at - b.at);
const SESSION_MINUTES = 48;

function clock(pos: number) {
  const mins = Math.round((pos / 100) * SESSION_MINUTES);
  return `0:${String(mins).padStart(2, "0")}`;
}

export function SimulationVisual() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const live = seen && playing && !reduced;
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setPos((p) => (p >= 100 ? 0 : p + 0.5)), 45);
    return () => window.clearInterval(id);
  }, [live]);
  const at = reduced && playing ? 100 : pos;
  const current = [...ALL_SEGS].reverse().find((seg) => seg.at <= at) ?? ALL_SEGS[0];

  return (
    <div ref={ref} className={`${s.visual} ${s.visualFit}`}>
      <div className={s.timeline}>
        <div className={s.scale} aria-hidden>
          {["0:00", "0:08", "0:16", "0:24", "0:32", "0:40"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className={s.tracks}>
          <div className={s.gridLines} aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          {TRACKS.map((track, ti) => (
            <div key={track.label} className={s.track} aria-hidden>
              <span className={s.trackLabel}>{track.label}</span>
              <div className={s.lane}>
                {seen
                  ? track.segs.map((seg, si) => (
                      <span
                        key={si}
                        className={`${s.segment} ${seg.at > at ? s.segmentFuture : ""}`}
                        style={{
                          left: `${seg.at}%`,
                          width: `${seg.w}%`,
                          animationDelay: `${ti * 180 + si * 240}ms`,
                          ["--seg-field" as string]: SEG_TONES[seg.tone].field,
                          ["--seg-ink" as string]: SEG_TONES[seg.tone].ink,
                        }}
                      >
                        {seg.text}
                      </span>
                    ))
                  : null}
              </div>
            </div>
          ))}
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={at}
            onChange={(e) => {
              setPlaying(false);
              setPos(Number(e.target.value));
            }}
            className={s.scrub}
            aria-label="Session time"
            aria-valuetext={`${clock(at)}, ${current.track}: ${current.text}`}
          />
          <div className={s.playWrap} aria-hidden>
            <span className={s.playhead} style={{ left: `${at}%` }} />
          </div>
        </div>
        <div className={s.scrubReadout} aria-live="polite">
          <span className="min-w-0">
            <span className="mr-2 font-mono text-app-meta text-[var(--text-tertiary)]">{clock(at)}</span>
            <b>{current.track}</b> · {current.note}
          </span>
          <button type="button" onClick={() => setPlaying((p) => !p)} className={s.control} aria-pressed={!playing}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />} {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>

      <div className={s.panel} style={{ left: 0, top: 24, width: "min(360px, 100%)" }}>
        <div className={s.panelHead}>
          <span className="flex items-center gap-2"><FlaskConical className="h-3.5 w-3.5 text-[var(--brand-violet)]" /> <b>{DEMO_TASK.title}</b></span>
          <span className={s.example}>{DEMO_LABEL}</span>
        </div>
        <div className="p-4">
          <p className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">
            Customers receive the same receipt twice when a job is retried after a timeout. Make sending safe to retry.
          </p>
          <ul className="mt-4 space-y-2">
            {DEMO_TASK.tests.map((t, i) => (
              <li
                key={t.name}
                className={`${s.test} ${seen ? s.cite : ""}`}
                style={{ animationDelay: `${600 + i * 220}ms`, border: 0, background: "none", padding: "3px 0" }}
              >
                {t.passed ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--status-positive-ink)]" aria-label="passed" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-[var(--brand-coral)]" aria-label="failed" />
                )}
                <span className="truncate">{t.name.replace("test_", "")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-app-meta leading-[1.5] text-[var(--text-tertiary)]">
            Drag across the timeline to replay the session. Candidates see what is recorded before they start.
          </p>
        </div>
      </div>
    </div>
  );
}

/* 3.0 Review: open the finding, check the tests, record a decision. */
const DECISIONS = ["Advance to interview", "Hold", "Decline"] as const;

export function ReviewVisual() {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [selected, setSelected] = useState<string>(EVIDENCE_RECORDS[0].id);
  const [decision, setDecision] = useState<(typeof DECISIONS)[number] | null>(null);
  const record = EVIDENCE_RECORDS.find((r) => r.id === selected) ?? EVIDENCE_RECORDS[0];

  return (
    <div ref={ref} className={`${s.visual} ${s.visualFit}`}>
      <div className={s.review}>
        <div className={s.reviewCol}>
          <p className="mb-2 px-3 text-app-meta text-[var(--text-tertiary)]">Findings · {DEMO_LABEL}</p>
          {EVIDENCE_RECORDS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === selected}
              onClick={() => setSelected(r.id)}
              className={`${s.finding} ${r.id === selected ? s.findingActive : ""}`}
            >
              <span className="flex items-center gap-2">
                <span className={s.dot} style={{ background: r.kind === "project" ? "var(--brand-teal)" : "var(--brand-violet)" }} />
                {r.title}
              </span>
              <small>{r.source} · {r.citation}</small>
            </button>
          ))}
        </div>

        <div className={s.reviewCol}>
          <p className="text-app-body font-medium tracking-[-0.012em] text-[var(--text-primary)]">{record.title}</p>
          <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{record.language} · {record.revision}</p>
          <div className="mt-4">
            <CodeBlock path={record.file} lines={record.lines} compact />
          </div>
          <p className="mt-4 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{record.shows}</p>
          <p className="mt-2 text-app-meta leading-[1.55] text-[var(--text-tertiary)]">Limits: {record.limits}</p>
        </div>

        <div className={s.reviewCol}>
          <p className="text-app-meta text-[var(--text-tertiary)]">Recorded test run</p>
          <ul className="mt-2">
            {DEMO_TASK.tests.map((t, i) => (
              <li key={t.name} className={`${s.test} ${seen ? s.cite : ""}`} style={{ animationDelay: `${i * 160}ms`, border: 0, background: "none", padding: "4px 0" }}>
                {t.passed ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--status-positive-ink)]" aria-label="passed" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-[var(--brand-coral)]" aria-label="failed" />
                )}
                <span className="truncate">{t.name.replace("test_", "")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-app-meta text-[var(--text-tertiary)]">Team decision</p>
          {DECISIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={decision === d}
              onClick={() => setDecision(decision === d ? null : d)}
              className={`${s.decision} ${decision === d ? s.decisionActive : ""}`}
            >
              {d}
            </button>
          ))}
          <p className="mt-3 text-app-meta leading-[1.5] text-[var(--text-tertiary)]">
            {decision ? `Logged: ${decision}. Nothing is sent to the candidate.` : "Decisions are logged for the team. Nothing is sent automatically."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* 4.0 Sharing: scoped, previewable, revocable. */
const SHARE_FIELDS = [
  { key: "projects", label: "Projects and contribution statements", initial: true },
  { key: "evidence", label: "Source-linked findings", initial: true },
  { key: "sims", label: "Simulation results", initial: true },
  { key: "email", label: "Email address", initial: false },
] as const;

export function ShareVisual() {
  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SHARE_FIELDS.map((f) => [f.key, f.initial])),
  );
  const [revoked, setRevoked] = useState(false);
  const visible = SHARE_FIELDS.filter((f) => on[f.key]);

  return (
    <div className={`${s.visual} ${s.visualFit}`}>
      <div className={s.share}>
        <div className={s.passport}>
          <p className="flex items-center justify-between text-app-meta text-[oklch(80%_0.05_178)]">
            <span className="flex items-center gap-2"><FydellMark width={18} /> Engineering Passport</span>
            <span>{DEMO_LABEL}</span>
          </p>
          <p className="mt-16 text-[var(--step-2)] font-[560] leading-none tracking-[-0.03em] text-white">Candidate 01</p>
          <p className="mt-2 text-app-body text-[oklch(82%_0.03_178)]">Backend developer · Python</p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-5 text-app-meta text-[oklch(82%_0.03_178)]">
            <p><span className="block font-mono text-[var(--step-1)] text-white">2</span>projects</p>
            <p><span className="block font-mono text-[var(--step-1)] text-white">4</span>findings</p>
            <p><span className="block font-mono text-[var(--step-1)] text-white">1</span>simulation</p>
          </div>
          <p className="mt-8 flex items-center gap-2 text-app-meta text-[oklch(82%_0.03_178)]">
            <Lock className="h-3.5 w-3.5" /> Private until shared
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
              <span className="flex items-center gap-2 text-app-meta text-[var(--text-primary)]">
                <Link2 className="h-3.5 w-3.5" /> Link for Employer A
              </span>
              <button
                type="button"
                onClick={() => setRevoked(!revoked)}
                className="rounded-full border border-[var(--border-default)] px-3 py-1 text-app-meta text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                {revoked ? "Restore link" : "Revoke"}
              </button>
            </div>
            {SHARE_FIELDS.map((f) => (
              <div key={f.key} className={s.shareRow}>
                <span>{f.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on[f.key]}
                  aria-label={`Share ${f.label}`}
                  onClick={() => setOn((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                  className={`${s.toggle} ${on[f.key] ? s.toggleOn : ""}`}
                />
              </div>
            ))}
          </div>

          <div className="flex-1 rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-canvas)] p-4">
            <p className="text-app-meta text-[var(--text-tertiary)]">What Employer A sees</p>
            {revoked ? (
              <p className="mt-3 text-app-body text-[var(--text-secondary)]">This link has been revoked. The employer can no longer open the passport.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {visible.length ? (
                  visible.map((f) => (
                    <li key={f.key} className={`${s.cite} w-fit`}>
                      <Check className="h-3 w-3 text-[var(--brand-teal)]" /> {f.label}
                    </li>
                  ))
                ) : (
                  <li className="text-app-body text-[var(--text-secondary)]">Nothing is shared on this link.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- page -- */

const PROBLEMS = [
  {
    title: "Résumés are marketing documents.",
    body: "They describe the work. They never show it. The best résumé in the pile is rarely the best engineer. It is the best-written one.",
  },
  {
    title: "Keyword screens filter out the best people.",
    body: "Great engineers with unconventional backgrounds die in the ATS. You are selecting for keyword density, not ability.",
  },
  {
    title: "Take-homes take hours and prove nothing.",
    body: "Candidates burn weekends on toy problems. You cannot tell who wrote the code, so you run the whiteboard anyway and learn even less.",
  },
] as const;

const PRINCIPLES = [
  {
    index: "P.1",
    title: "Record the work, not the worker.",
    body: "Candidates see everything that is captured before they begin: files, tests, timeline. No keystroke logging. No screen recording. No spyware. The simulation is the assessment.",
  },
  {
    index: "P.2",
    title: "Every claim opens to its source.",
    body: "A finding without a file, a commit, and a line number is an opinion. Fydell links each one, so your reviewers check instead of trusting.",
  },
  {
    index: "P.3",
    title: "Decisions stay human.",
    body: "Fydell assembles the evidence; your team makes the call. No scores, no auto-reject, no black-box ranking.",
  },
] as const;

const HOME_FAQ = [
  {
    q: "Are the examples on this page real?",
    a: "The walkthroughs use fictional example data and are labeled as such. There is no real candidate behind them. The scenarios, prices, and controls described are real product capabilities. The demo data is illustration, not evidence.",
  },
  {
    q: "What does Fydell cost?",
    a: "Engineers pay nothing, ever. Hiring teams pay $49 per completed simulation on Starter, or $399 a month with 10 simulations included on Team. Invitations, expired links, and abandoned attempts are never billed.",
  },
  {
    q: "Does Fydell replace interviews?",
    a: "No. Fydell gives your reviewers evidence to read before the interview: cited findings, recorded test runs, and questions drawn from the candidate's own work. There is no score, no ranking, and no auto-reject. Your team makes the call.",
  },
  {
    q: "Is this surveillance software?",
    a: "No. There is no keystroke logging, screen recording, or webcam. Candidates see exactly what is recorded before they start. The simulation assesses the work, not the worker.",
  },
  {
    q: "Which roles and languages are covered?",
    a: "One evaluation is released today: the 20-minute Operations performance investigation for data analysts. The engine catalog holds 8 authored scenarios across 6 role families, and repository analysis is deepest in Python.",
  },
  {
    q: "When can I download the desktop app?",
    a: "Desktop installers publish with v0.1.0 and are not available yet. The download page tracks the status honestly and points at the GitHub releases where installers will appear.",
  },
  {
    q: "Who owns the evidence?",
    a: "The engineer. A passport is private until shared, each share link is scoped to one employer and previewable before it is sent, and access can be revoked in one click.",
  },
] as const;

export default function FydellHome() {
  return (
    <div className={s.page}>
      <section className={s.hero}>
        <div className={`${s.container} ${s.heroCopyIn} ${s.heroCenter}`}>
          <Kicker>Hiring infrastructure</Kicker>
          <h1 className={s.heroTitle}>
            A new way to hire.
            <br />
            A better way to <span className="t-project">get&nbsp;hired.</span>
          </h1>
          <p className={s.lede}>
            Fydell evaluates engineers on real work. Project evidence from their code. Realistic simulations. Your team reviews evidence, not résumés.
          </p>
          <div className={s.heroActions}>
            <Link href="/signup" className={s.btnSolid}>
              Get started <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/demo" className={s.btnGhost}>
              Explore demo
            </Link>
          </div>
        </div>
        <div className={s.stage}>
          <div className={s.stageInner}>
            <HeroSimWorkspace />
          </div>
        </div>
      </section>

      <section className={`${s.container} ${s.proof}`} aria-label="Fydell in numbers">
        <Reveal>
          <ProofStrip />
        </Reveal>
      </section>

      <section className={`${s.container} ${s.problem}`} aria-labelledby="problem-title">
        <Kicker>The problem</Kicker>
        <h2 id="problem-title" className={s.problemTitle}>
          Hiring runs on signals nobody trusts.
        </h2>
        <Stagger className={s.problemGrid}>
          {PROBLEMS.map((p) => (
            <StaggerItem key={p.title} className={s.problemCard}>
              <p className={s.problemHead}>{p.title}</p>
              <p className={s.problemBody}>{p.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className={`${s.container} ${s.manifesto}`} aria-labelledby="manifesto">
        <p id="manifesto" className={s.statement}>
          Résumés describe the work. <span className="t-project">Fydell shows it.</span>{" "}
          <span>
            Every claim about a candidate opens to the file, commit, or test behind it, so teams decide on evidence
            and engineers get credit for what they actually built.
          </span>
        </p>
        <div className={s.figs}>
          {FIGS.map(({ label, title, body, Art }) => (
            <div key={title} className={s.fig}>
              <p className={s.figLabel}>{label}</p>
              <div className={s.figArt}>
                <Art />
              </div>
              <p className={s.figTitle}>{title}</p>
              <p className={s.figBody}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="developers" className={`${s.container} ${s.chapter}`}>
        <ChapterHead
          index="1.0"
          label="Passports"
          href="/developers"
          title="Turn repositories into a record of real work"
          copy="Import public GitHub projects. Fydell pins a commit, cites every finding, and states plainly what it could not assess."
        />
        <Reveal delay={0.08}>
          <IntakeVisual />
        </Reveal>
        <Features dot="var(--brand-teal)" items={["GitHub import", "Commit pinning", "Coverage report", "Contribution statements", "Role signals"]} />
      </section>

      <section id="product" className={`${s.container} ${s.chapter}`}>
        <ChapterHead
          index="2.0"
          label="Simulations"
          href="/demo"
          title="See how engineers solve real problems"
          copy="Candidates work a realistic incident in a working codebase, with tests and an AI-written patch to review. Every action lands on a disclosed timeline."
        />
        <div className={s.mockStage}>
          <DesktopWorkspaceMock />
        </div>
        <Reveal delay={0.08}>
          <SimulationVisual />
        </Reveal>
        <Features dot="var(--brand-violet)" items={["Working codebases", "Recorded test runs", "AI patch review", "Disclosed telemetry", "Timed scope"]} />
      </section>

      <section id="employers" className={`${s.container} ${s.chapter}`}>
        <ChapterHead
          index="3.0"
          label="Review"
          href="/employers"
          title="Decide on evidence, together"
          copy="Reviewers open each finding to the code behind it, see what the tests observed, and record a decision the whole team can audit."
        />
        <Reveal delay={0.08}>
          <ReviewVisual />
        </Reveal>
        <Features dot="var(--brand-warm)" items={["Evidence reports", "Reviewer notes", "Decision log", "Interview prompts", "Team workspaces"]} />
      </section>

      <section id="sharing" className={`${s.container} ${s.chapter}`}>
        <ChapterHead
          index="4.0"
          label="Sharing"
          href="/trust"
          title="Engineers stay in control of their record"
          copy="A passport is private until shared. Each link is scoped to one employer, previewable before it is sent, and revocable in one click."
        />
        <Reveal delay={0.08}>
          <ShareVisual />
        </Reveal>
        <Features dot="var(--brand-teal)" items={["Scoped links", "Recipient preview", "One-click revoke", "Export"]} />
      </section>

      <section id="desktop" className={`${s.container} ${s.chapter}`}>
        <ChapterHead
          index="5.0"
          label="Desktop app"
          href="/download"
          title="The simulation, in a real editor on your machine"
          copy="The Fydell desktop client runs the whole simulation locally: a Monaco workspace with brief, tests, timeline, and submit panels. Installers publish with v0.1.0."
        />
        <Reveal delay={0.08}>
          <DesktopShowcase />
        </Reveal>
      </section>

      <section className={`${s.container} ${s.principles}`} aria-labelledby="principles-title">
        <Kicker>How Fydell is different</Kicker>
        <h2 id="principles-title" className={s.problemTitle}>
          Evidence you can <span className="t-project">inspect</span>. Nothing you can&rsquo;t.
        </h2>
        <Stagger className={s.problemGrid}>
          {PRINCIPLES.map((p) => (
            <StaggerItem key={p.index} className={s.problemCard}>
              <p className={s.figLabel}>{p.index}</p>
              <p className={s.problemHead}>{p.title}</p>
              <p className={s.problemBody}>{p.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className={`${s.container} ${s.chapter}`} aria-labelledby="home-faq">
        <Reveal>
          <h2 id="home-faq" className={s.chapterTitle}>Honest answers</h2>
        </Reveal>
        <Reveal delay={0.06}>
          <div className={s.faq}>
            {HOME_FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className={`${s.container} ${s.closing}`}>
        <h2 className={s.closingTitle}>
          Hire for the work.
        </h2>
        <div className={s.closingRow}>
          <p className={s.lede}>Free for engineers. Hiring teams pay per completed simulation.</p>
          <div className={s.heroActions}>
            <Link href="/signup" className={s.btnSolid}>
              Get started <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/demo" className={s.btnGhost}>Explore demo</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
