import { Check, CircleDashed, FileCode2, MessageSquareText, X } from "lucide-react";
import type { ReactNode } from "react";
import s from "./evidence-grid.module.css";

type Tone = "teal" | "blue" | "violet" | "warm";

function Card({ tone, title, body, label, children }: { tone: Tone; title: string; body: string; label: string; children: ReactNode }) {
  return (
    <article className={s.card}>
      <p className={s.copy}>
        <strong className={s.cardTitle}>{title}</strong> {body}
      </p>
      <figure className={s.field} data-tone={tone} aria-label={`${label} Example data.`}>
        <div className={s.panel}>{children}</div>
        <figcaption className={s.example}>Example data</figcaption>
      </figure>
    </article>
  );
}

function FindingVisual() {
  return (
    <>
      <div className={s.panelHead}>
        <FileCode2 aria-hidden size={14} />
        <span className={s.mono}>retry.ts</span>
        <span className={s.dim}>lines 41 to 58</span>
      </div>
      <pre className={s.code}>
        <code>
          <span className={s.ln}>41</span>
          {"if (attempt >= MAX_ATTEMPTS) return fail(d);\n"}
          <span className={s.ln}>42</span>
          {"const wait = BASE_MS * 2 ** attempt;\n"}
          <span className={s.ln}>43</span>
          {"if (isPermanent(res.status)) return fail(d);"}
        </code>
      </pre>
      <ul className={s.claims}>
        <li>
          <span className={s.chip} data-kind="observed">
            Observed
          </span>
          Stops after five attempts.
        </li>
        <li>
          <span className={s.chip} data-kind="inferred">
            Inferred
          </span>
          Written with at-least-once delivery in mind.
        </li>
      </ul>
    </>
  );
}

const TESTS = [
  { name: "test_success_marks_delivered", ms: "4 ms", pass: true },
  { name: "test_server_error_schedules_backoff", ms: "11 ms", pass: true },
  { name: "test_gone_endpoint_is_not_retried", ms: "3 ms", pass: true },
  { name: "test_retry_after_is_honored", ms: "6 ms", pass: false },
] as const;

function TestsVisual() {
  return (
    <>
      <div className={s.panelHead}>
        <span className={s.strong}>Test run</span>
        <span className={s.count}>3 of 4 passed</span>
        <span className={`${s.mono} ${s.dim} ${s.push}`}>python3 -m unittest</span>
      </div>
      <ul className={s.tests}>
        {TESTS.map((t) => (
          <li key={t.name} data-pass={t.pass}>
            {t.pass ? <Check aria-hidden size={14} className={s.pass} /> : <X aria-hidden size={14} className={s.fail} />}
            <span className={s.mono}>{t.name}</span>
            <span className={s.dim}>{t.pass ? t.ms : "Failed"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function QuestionVisual() {
  return (
    <>
      <div className={s.panelHead}>
        <span className={s.strong}>Designs for duplicate events</span>
        <span className={`${s.badge} ${s.push}`} data-kind="attention">
          Not yet sufficient
        </span>
      </div>
      <p className={s.note}>1 finding cites dedupe.ts. Nothing shows behavior after the record expires.</p>
      <div className={s.question}>
        <MessageSquareText aria-hidden size={14} />
        <p>What happens when the same event_id arrives after its record expires?</p>
      </div>
      <div className={s.meta}>
        <CircleDashed aria-hidden size={13} />
        Sent to Candidate 01. Awaiting an answer.
      </div>
    </>
  );
}

const BRIEF = [
  { req: "Handles failures in external calls", ev: "3 findings, 4 tests" },
  { req: "Designs for duplicate events", ev: "1 finding, 1 open question" },
  { req: "Has operated a production service", ev: "No evidence supplied" },
] as const;

function BriefVisual() {
  return (
    <>
      <div className={s.panelHead}>
        <span className={s.strong}>Decision brief</span>
        <span className={s.dim}>Candidate 01</span>
      </div>
      <dl className={s.brief}>
        {BRIEF.map((b) => (
          <div key={b.req}>
            <dt>{b.req}</dt>
            <dd>{b.ev}</dd>
          </div>
        ))}
      </dl>
      <div className={s.decision}>
        <span>Team decision</span>
        <strong>Advance to interview</strong>
      </div>
    </>
  );
}

/** A 2x2 grid: one sentence per card on top, a framed product detail below. */
export default function EvidenceGrid() {
  return (
    <div className={s.grid} data-reveal="group">
      <Card
        tone="teal"
        title="Findings cite their source."
        body="Each one names the file and lines it came from, and says whether it was observed or inferred."
        label="A finding from retry.ts with the cited lines, one observed claim and one inferred claim."
      >
        <FindingVisual />
      </Card>
      <Card
        tone="blue"
        title="Tests that actually ran."
        body="Results come from running the submission, failures included."
        label="Test results for a submission: three passed and one failed."
      >
        <TestsVisual />
      </Card>
      <Card
        tone="violet"
        title="Questions where evidence is thin."
        body="Ask about a requirement the shared work does not cover yet."
        label="A follow-up question sent to Candidate 01 about duplicate events."
      >
        <QuestionVisual />
      </Card>
      <Card
        tone="warm"
        title="Your team makes the call."
        body="The brief collects evidence by requirement. There is no score and no recommendation."
        label="A decision brief for Candidate 01 listing evidence per requirement and the team's recorded decision."
      >
        <BriefVisual />
      </Card>
    </div>
  );
}
