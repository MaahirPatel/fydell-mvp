import {
  Briefcase,
  Check,
  CircleDashed,
  ClipboardList,
  FileCode2,
  FlaskConical,
  LayoutGrid,
  MessageSquareText,
  Search,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import s from "./hero-review.module.css";

const NAV: readonly { label: string; Icon: LucideIcon; on?: boolean }[] = [
  { label: "Overview", Icon: LayoutGrid },
  { label: "Roles", Icon: Briefcase },
  { label: "Applicants", Icon: Users, on: true },
  { label: "Work samples", Icon: FlaskConical },
  { label: "Reviews", Icon: ClipboardList },
];

type QueueState = "review" | "new" | "waiting" | "decided";

const STATE_LABEL: Record<QueueState, string> = {
  review: "In review",
  new: "New",
  waiting: "Question sent",
  decided: "Decision recorded",
};

const QUEUE: readonly { name: string; meta: string; state: QueueState; on?: boolean }[] = [
  { name: "Candidate 01", meta: "2 projects, 1 work sample", state: "review", on: true },
  { name: "Candidate 02", meta: "3 projects", state: "new" },
  { name: "Candidate 03", meta: "1 project, 1 work sample", state: "waiting" },
  { name: "Candidate 04", meta: "2 projects", state: "new" },
  { name: "Candidate 05", meta: "1 work sample", state: "decided" },
];

const CODE: readonly { n: number; text: string; hit?: boolean }[] = [
  { n: 41, text: "export function nextDelay(attempt: number) {" },
  { n: 42, text: "  if (attempt >= MAX_ATTEMPTS) return null;", hit: true },
  { n: 43, text: "  return BASE_DELAY_MS * 2 ** (attempt - 1);", hit: true },
  { n: 44, text: "}" },
  { n: 45, text: "" },
  { n: 46, text: "export const isPermanent = (s: number) =>", hit: true },
  { n: 47, text: "  s >= 400 && s < 500 && s !== 429;", hit: true },
];

const BRIEF: readonly { req: string; ev: string; tone: "support" | "partial" | "none" }[] = [
  { req: "Handles failures in external calls", ev: "3 findings, 4 tests", tone: "support" },
  { req: "Designs for duplicate events", ev: "1 finding, question sent", tone: "partial" },
  { req: "Writes tests for failure paths", ev: "2 findings", tone: "support" },
  { req: "Has run a production service", ev: "No evidence supplied", tone: "none" },
];

/**
 * The hero view: a hiring workspace with the applicant queue, one finding
 * opened to the lines it cites, and the decision brief floated over it.
 * Decorative example data; the enclosing ProductFrame names it for screen readers.
 */
export default function HeroReview() {
  return (
    <div className={s.root}>
      <div className={s.app}>
        <aside className={s.rail} aria-hidden>
          <div className={s.workspace}>
            <span className={s.logo}>W</span>
            <span className={s.wsName}>Your workspace</span>
          </div>
          <ul className={s.nav}>
            {NAV.map(({ label, Icon, on }) => (
              <li key={label} data-on={on || undefined}>
                <Icon size={14} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </aside>

        <section className={s.queue}>
          <header className={s.queueHead}>
            <div>
              <p className={s.strong}>Backend Engineer, Payments</p>
              <p className={s.dim}>5 applicants</p>
            </div>
            <Search size={14} aria-hidden className={s.dim} />
          </header>
          <ul className={s.queueList}>
            {QUEUE.map((q) => (
              <li key={q.name} data-on={q.on || undefined}>
                <span className={s.avatar} aria-hidden>
                  {q.name.slice(-2)}
                </span>
                <span className={s.queueText}>
                  <span className={s.strong}>{q.name}</span>
                  <span className={s.dim}>{q.meta}</span>
                </span>
                <span className={s.state} data-state={q.state}>
                  {STATE_LABEL[q.state]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.main}>
          <header className={s.mainHead}>
            <div className={s.crumbs}>
              <span>Applicants</span>
              <span aria-hidden>/</span>
              <span className={s.strong}>Candidate 01</span>
            </div>
            <ul className={s.tabs}>
              <li data-on>Evidence</li>
              <li>Work sample</li>
              <li>Questions</li>
            </ul>
          </header>

          <div className={s.finding}>
            <p className={s.req}>
              <Check size={13} aria-hidden />
              Handles failures in external calls
            </p>
            <p className={s.claim}>Retries stop after five attempts, and 4xx responses other than 429 are never retried.</p>
            <div className={s.cite}>
              <FileCode2 size={13} aria-hidden />
              <span className={s.mono}>src/delivery/retry.ts:41-47</span>
              <span className={s.chip}>Observed in code</span>
            </div>
            <pre className={s.code}>
              {CODE.map((l) => (
                <span key={l.n} className={s.line} data-hit={l.hit || undefined}>
                  <span className={s.ln}>{l.n}</span>
                  {l.text}
                </span>
              ))}
            </pre>
            <div className={s.limits}>
              <TriangleAlert size={13} aria-hidden />
              <span>Read at this revision, not run. Whether callers re-queue after the fifth failure was not assessed.</span>
            </div>
          </div>
        </section>
      </div>

      <div className={s.brief}>
        <div className={s.briefHead}>
          <span className={s.strong}>Decision brief</span>
          <span className={s.dim}>Candidate 01</span>
        </div>
        <ul className={s.briefList}>
          {BRIEF.map((b) => (
            <li key={b.req}>
              <span className={s.dot} data-tone={b.tone} aria-hidden>
                {b.tone === "support" ? <Check size={10} /> : b.tone === "partial" ? <CircleDashed size={10} /> : null}
              </span>
              <span className={s.briefReq}>{b.req}</span>
              <span className={s.briefEv}>{b.ev}</span>
            </li>
          ))}
        </ul>
        <div className={s.briefFoot}>
          <span className={s.dim}>Decision</span>
          <span className={s.choices} aria-hidden>
            <span>Advance</span>
            <span>Hold</span>
            <span>Decline</span>
          </span>
        </div>
        <p className={s.briefNote}>
          <MessageSquareText size={12} aria-hidden />
          No score. Your team decides.
        </p>
      </div>
    </div>
  );
}
