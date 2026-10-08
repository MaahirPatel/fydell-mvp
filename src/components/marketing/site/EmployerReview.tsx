import type { ReactNode } from "react";
import { CircleCheck, FileCode2, FlaskConical } from "lucide-react";
import { BACKEND_WEBHOOK_RETRY_V2 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition-v2";
import { CHANGED_PATH, HUNK, HUNK_INDENT, PUBLIC_RUN } from "./example-submission";
import s from "./employer-review.module.css";

type State = "demonstrated" | "partially_demonstrated" | "reviewer";

const STATE_LABEL: Record<State, string> = {
  demonstrated: "Demonstrated",
  partially_demonstrated: "Partially demonstrated",
  reviewer: "For your review",
};

/**
 * Criteria without defined checks are judged by the hiring team. Of the
 * checked ones, this example submission misses part of the Retry-After update.
 */
const CRITERIA = SCENARIO.rubric.flatMap((d) =>
  (d.criteria ?? []).map((k) => ({
    id: k.id,
    label: k.label,
    requirement: k.requirement,
    cases: k.probeIds.length,
    state: (k.probeIds.length === 0 ? "reviewer" : k.id === "retry_after" ? "partially_demonstrated" : "demonstrated") as State,
  })),
);
const FOCUS = CRITERIA.find((c) => c.id === "failure_classification")!;
const OPEN = CRITERIA.find((c) => c.id === "retry_after")!;
const AFTER = HUNK.filter((l) => l.kind !== "del");
const FIXED = PUBLIC_RUN.find((t) => t.fixed)!;

const KEYWORDS = new Set(["if", "elif", "else", "None", "self"]);

function highlight(code: string): ReactNode[] {
  return code.split(/(\b\w+\b)/).map((part, i) =>
    KEYWORDS.has(part) ? (
      <span key={i} className={s.kw}>
        {part}
      </span>
    ) : /^\d+$/.test(part) ? (
      <span key={i} className={s.num}>
        {part}
      </span>
    ) : /^[A-Z][A-Z_]+$/.test(part) ? (
      <span key={i} className={s.const}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * The employer's side of the submission the homepage shows being written:
 * one criterion read against the changed lines and the checks that ran, the
 * one item left open, and the reviewer's next step. Criterion labels,
 * requirements and case counts come from the shipped scenario; outcomes,
 * timings and the handoff answer are example data.
 */
export default function EmployerReview() {
  return (
    <div className={s.root}>
      <div className={s.win}>
        <div className={s.bar}>
          <span className={s.who}>Applicant 02</span>
          <span className={s.barMeta}>{SCENARIO.title}</span>
          <span className={s.barRight}>
            <span className={s.barMeta}>Submitted after 71 of {SCENARIO.defaultAllowedMinutes} minutes</span>
          </span>
        </div>

        <div className={s.body}>
          <nav className={s.rail} aria-label="Criteria">
            <p className={s.railHead}>Criteria</p>
            <ul className={s.railList}>
              {CRITERIA.map((c) => (
                <li key={c.id} className={s.railItem} data-on={c.id === FOCUS.id || undefined}>
                  <span className={s.dot} data-state={c.state} aria-hidden />
                  <span className={s.railLabel}>{c.label}</span>
                  <span className="sr-only">{STATE_LABEL[c.state]}</span>
                </li>
              ))}
            </ul>
          </nav>

          <section className={s.main} aria-label={`Criterion: ${FOCUS.label}`}>
            <div className={s.critHead}>
              <p className={s.critTitle}>{FOCUS.label}</p>
              <span className={s.state} data-state="demonstrated">
                {STATE_LABEL.demonstrated}
              </span>
            </div>
            <p className={s.requirement}>{FOCUS.requirement}</p>

            <p className={s.observation}>A 410 now ends as failed after one attempt, with the status code recorded. Before the change it went back on the queue every tick.</p>

            <figure className={s.code}>
              <figcaption className={s.codeHead}>
                <FileCode2 aria-hidden size={14} className={s.dim} />
                <span className={s.path}>{CHANGED_PATH}</span>
                <span className={s.dim}>Changed lines 48–52</span>
              </figcaption>
              <pre className={s.lines}>
                {AFTER.map((l) => (
                  <span key={l.new} className={s.line} data-add={l.kind === "add" || undefined}>
                    <span className={s.ln} aria-hidden>
                      {l.new}
                    </span>
                    <span className={s.sign} aria-hidden>
                      {l.kind === "add" ? "+" : " "}
                    </span>
                    <span>{highlight(l.code.slice(HUNK_INDENT))}</span>
                  </span>
                ))}
              </pre>
            </figure>

            <div className={s.checks}>
              <p className={s.checksHead}>
                <FlaskConical aria-hidden size={14} className={s.dim} />
                <b>
                  {FOCUS.cases} of {FOCUS.cases} defined cases passed
                </b>
                <span className={s.dim}>Public and protected checks</span>
              </p>
              <p className={s.testRow}>
                <CircleCheck aria-hidden size={14} className={s.pass} />
                <span className={s.testName}>{FIXED.name}</span>
                <span className={s.testTag}>Public · failed on the starter</span>
              </p>
            </div>
          </section>

          <aside className={s.side} aria-label="Left for your review">
            <p className={s.sideHead}>Left for your review</p>
            <div className={s.open}>
              <div className={s.openHead}>
                <p className={s.openTitle}>{OPEN.label}</p>
                <span className={s.state} data-state="partially_demonstrated">
                  Partial
                </span>
              </div>
              <p className={s.openText}>
                3 of {OPEN.cases} defined cases passed. A lower-case <code>retry-after</code> header is not read.
              </p>
              <blockquote className={s.quote}>
                <p className={s.quoteLabel}>Handoff · What remains unresolved?</p>
                <p>&ldquo;Retry-After is applied, but I only tested the exact header name.&rdquo;</p>
              </blockquote>
            </div>
            <div className={s.next}>
              <p className={s.nextText}>The gap is stated in the handoff. Decide whether it matters for this role.</p>
              <span className={s.nextAction}>Record decision</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
