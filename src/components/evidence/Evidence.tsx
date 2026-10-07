import type { ReactNode } from "react";
import { AlertCircle, Check, ChevronRight, CircleDashed, X } from "lucide-react";
import s from "./evidence.module.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(s.mono, className)}>{children}</span>;
}

export function MicroLabel({ children, as: Tag = "p" }: { children: ReactNode; as?: "p" | "h2" | "h3" }) {
  return <Tag className={s.label}>{children}</Tag>;
}

/* ---------- Evidence rail ---------- */

export type RailStep = { label: string; value: string; state: "done" | "current" | "pending" };

/** Source, work, verify, decide: provenance at a glance. */
export function EvidenceRail({ steps }: { steps: readonly RailStep[] }) {
  return (
    <ol className={s.rail} style={{ ["--steps" as string]: String(steps.length) }} aria-label="Evaluation progress">
      {steps.map((step) => (
        <li key={step.label} className={cx(s.railStep, step.state === "done" && s.railStepDone)}>
          <span className={s.railTrack} aria-hidden>
            <span className={cx(s.railNode, step.state === "done" && s.railNodeDone, step.state === "current" && s.railNodeCurrent)}>
              {step.state === "done" ? <Check width={9} height={9} strokeWidth={3} /> : null}
            </span>
            <span className={s.railLine} />
          </span>
          <span className={s.label}>{step.label}</span>
          <span className={s.railValue}>
            {step.value}
            <span className="sr-only">{step.state === "done" ? " (done)" : step.state === "current" ? " (current)" : " (not yet)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Evidence timeline ---------- */

export type TimelineEntry = {
  id: string;
  time: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  tone?: "neutral" | "key" | "change";
};

export function EvidenceTimeline({ items }: { items: readonly TimelineEntry[] }) {
  return (
    <ol className={s.timeline}>
      {items.map((item) => (
        <li key={item.id} className={s.tlItem}>
          <span className={cx(s.tlTime, s.mono)}>{item.time}</span>
          <span className={s.tlRail} aria-hidden>
            <span className={cx(s.tlDot, item.tone === "key" && s.tlDotKey, item.tone === "change" && s.tlDotChange)} />
          </span>
          <div className="min-w-0">
            <p className={s.tlTitle}>{item.title}</p>
            {item.detail ? <p className={s.tlDetail}>{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Work receipt ---------- */

export type ReceiptCheck = { label: ReactNode; state: "pass" | "fail" | "note" };

function CheckIcon({ state }: { state: ReceiptCheck["state"] }) {
  if (state === "pass") return <Check aria-label="Passed" className={cx(s.checkIcon, s.checkPass)} strokeWidth={2.2} />;
  if (state === "fail") return <X aria-label="Failed" className={cx(s.checkIcon, s.checkFail)} strokeWidth={2.2} />;
  return <CircleDashed aria-hidden className={cx(s.checkIcon, s.checkNote)} strokeWidth={1.8} />;
}

/**
 * The verified artifact of completed work: what was asked, what was changed,
 * what was checked, and where the evidence lives.
 */
export function WorkReceipt({
  title,
  subtitle,
  verified,
  rows = [],
  checks = [],
  reference,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  verified: boolean;
  rows?: readonly { label: ReactNode; value: ReactNode }[];
  checks?: readonly ReceiptCheck[];
  reference?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={s.receipt} aria-label="Work receipt">
      <div className={s.receiptHead}>
        <span className={s.receiptMark}>
          <span aria-hidden className={s.receiptGlyph} />
          <span className={s.label}>Work receipt</span>
        </span>
        <span className={cx(s.verified, !verified && s.unverified)}>
          {verified ? <Check aria-hidden width={12} height={12} strokeWidth={2.4} /> : null}
          {verified ? "Verified" : "Awaiting checks"}
        </span>
      </div>
      <div className={s.receiptBody}>
        <p className={s.receiptTitle}>{title}</p>
        {subtitle ? <p className={s.receiptSub}>{subtitle}</p> : null}
        {rows.length ? (
          <div className={s.receiptRows}>
            {rows.map((row, i) => (
              <div key={i} className={s.receiptRow}>
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        {checks.length ? (
          <ul className={s.checks}>
            {checks.map((c, i) => (
              <li key={i} className={s.check}>
                <CheckIcon state={c.state} />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {reference || action ? (
        <div className={s.receiptFoot}>
          <span className={cx(s.ref, s.mono)}>{reference}</span>
          {action}
        </div>
      ) : null}
    </section>
  );
}

export function DiffStat({ added, removed }: { added: number; removed: number }) {
  return (
    <span className={s.mono}>
      <span className={s.plus}>+{added}</span> <span className={s.minus}>−{removed}</span>
    </span>
  );
}

/* ---------- Decision brief ---------- */

export type Level =
  | "strong"
  | "adequate"
  | "weak"
  | "insufficient_evidence"
  | "demonstrated_additional"
  | "demonstrated"
  | "partially_demonstrated"
  | "concern_observed"
  | "not_assessed";

export const LEVEL_LABEL: Record<Level, string> = {
  strong: "Strong",
  adequate: "Adequate",
  weak: "Weak",
  insufficient_evidence: "Not enough evidence",
  demonstrated_additional: "Demonstrated under additional constraints",
  demonstrated: "Demonstrated",
  partially_demonstrated: "Partially demonstrated",
  concern_observed: "Concern observed",
  not_assessed: "Not assessed",
};

export type ProofRow = {
  label: string;
  value: ReactNode;
  level?: Level;
  /** Why the value was given, and the evidence behind it. Opens on click. */
  rationale?: string;
  support?: readonly string[];
};

export type Verdict = {
  heading: string;
  value: "advance" | "hold" | "decline" | null;
  note?: ReactNode;
};

const VERDICT_LABEL = { advance: "Advance", hold: "Hold", decline: "Do not advance" } as const;

function ProofValue({ row }: { row: ProofRow }) {
  return (
    <span
      className={cx(
        s.proofValue,
        (row.level === "strong" || row.level === "demonstrated" || row.level === "demonstrated_additional") && s.levelStrong,
        (row.level === "weak" || row.level === "concern_observed") && s.levelWeak,
        (row.level === "insufficient_evidence" || row.level === "not_assessed") && s.levelNone,
      )}
    >
      {row.value}
    </span>
  );
}

/**
 * The structured conclusion beside the work: decision, why, concerns, and the
 * proof behind each claim. Every proof row with evidence opens to show it.
 */
export function DecisionBrief({
  mark,
  summary,
  verdict,
  why = [],
  concerns = [],
  proof = [],
  actions,
}: {
  mark?: ReactNode;
  summary?: ReactNode;
  verdict: Verdict;
  why?: readonly string[];
  concerns?: readonly string[];
  proof?: readonly ProofRow[];
  actions?: ReactNode;
}) {
  return (
    <section className={s.brief} aria-label="Decision brief">
      <div className={s.briefHead}>
        {mark}
        Decision brief
      </div>
      <div className={s.briefBlock}>
        <p className={s.label}>{verdict.heading}</p>
        {verdict.value ? (
          <p
            className={cx(
              s.verdict,
              verdict.value === "advance" && s.verdictAdvance,
              verdict.value === "hold" && s.verdictHold,
              verdict.value === "decline" && s.verdictDecline,
            )}
          >
            {VERDICT_LABEL[verdict.value]}
          </p>
        ) : (
          <p className={cx(s.verdict, s.verdictNone)}>Not recorded yet</p>
        )}
        {verdict.note ? <p className={s.verdictNote}>{verdict.note}</p> : null}
        {summary ? <p className={cx(s.briefSummary, "mt-3")}>{summary}</p> : null}
      </div>

      {why.length ? (
        <div className={s.briefBlock}>
          <p className={s.label}>Why</p>
          <ul className={s.list}>
            {why.map((item) => (
              <li key={item} className={s.check}>
                <Check aria-hidden className={cx(s.checkIcon, s.checkPass)} strokeWidth={2.2} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {concerns.length ? (
        <div className={s.briefBlock}>
          <p className={s.label}>{concerns.length === 1 ? "Concern" : "Concerns"}</p>
          {concerns.map((item) => (
            <p key={item} className={s.concern}>
              <AlertCircle aria-hidden className={s.concernIcon} strokeWidth={2} />
              <span>{item}</span>
            </p>
          ))}
        </div>
      ) : null}

      {proof.length ? (
        <div className={s.briefBlock}>
          <p className={s.label}>Proof</p>
          <div className={s.proof}>
            {proof.map((row) =>
              row.rationale || row.support?.length ? (
                <details key={row.label} className={s.proofRow}>
                  <summary className={s.proofSummary}>
                    <span className={s.proofName}>
                      <ChevronRight aria-hidden className={s.proofChevron} strokeWidth={2} />
                      {row.label}
                    </span>
                    <ProofValue row={row} />
                  </summary>
                  <div className={s.proofDetail}>
                    {row.rationale ? <p>{row.rationale}</p> : null}
                    {row.support?.length ? (
                      <>
                        <p className={s.proofSupport}>
                          Supported by {row.support.length} {row.support.length === 1 ? "finding" : "findings"}
                        </p>
                        <ul>
                          {row.support.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </details>
              ) : (
                <div key={row.label} className={s.proofRow}>
                  <div className={s.proofSummary}>
                    <span className={s.proofName}>{row.label}</span>
                    <ProofValue row={row} />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {actions ? <div className={s.briefActions}>{actions}</div> : null}
    </section>
  );
}
