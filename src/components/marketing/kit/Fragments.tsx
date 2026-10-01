import { Bell, Check, FileCode2, X } from "lucide-react";
import s from "./fragments.module.css";

/*
 * One small, real piece of Fydell per picture: never a whole application
 * window. Each fragment shows a single thing a visitor should understand,
 * in type large enough to read at a glance. Content mirrors the webhook
 * retry simulation that ships today.
 */

export function BriefFragment() {
  return (
    <div className={s.card}>
      <p className={s.kicker}>Incident brief · INC-2291</p>
      <p className={s.title}>Webhooks are being retried too many times</p>
      <ul className={s.todo}>
        <li>Retry only temporary failures</li>
        <li>Wait 60 seconds, then double</li>
        <li>Stop after 8 attempts</li>
      </ul>
    </div>
  );
}

export function TeamFragment() {
  return (
    <div className={s.thread}>
      <div className={s.msgMine}>Which failures should count as temporary?</div>
      <div className={s.msg}>
        <span aria-hidden className={s.avatar}>
          AM
        </span>
        <span>
          <b>Alex · Engineering lead</b>
          Treat 5xx, 408 and 429 as temporary. Everything else is permanent.
        </span>
      </div>
    </div>
  );
}

export function UpdateFragment() {
  return (
    <div className={s.update}>
      <span aria-hidden className={s.bell}>
        <Bell />
      </span>
      <span>
        <b>New request · 14:18</b>
        Respect the Retry-After header on 429 and 503
      </span>
    </div>
  );
}

export function ChecksFragment({ passed = 14, total = 15 }: { passed?: number; total?: number }) {
  return (
    <div className={s.card}>
      <div className={s.scoreRow}>
        <p className={s.score}>
          {passed}
          <span> of {total}</span>
        </p>
        <p className={s.scoreLabel}>hidden checks passed</p>
      </div>
      <div className={s.bar} aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < passed ? s.barOk : s.barFail} />
        ))}
      </div>
      <ul className={s.checks}>
        <li>
          <Check aria-hidden className={s.ok} /> Stops after 8 attempts
        </li>
        <li>
          <X aria-hidden className={s.fail} /> Reads Retry-After in any letter case
        </li>
      </ul>
    </div>
  );
}

export function CitationFragment() {
  return (
    <div className={s.card}>
      <div className={s.findingTop}>
        <span className={s.chip}>Observation</span>
      </div>
      <p className={s.title}>Retries back off and stop at the cap</p>
      <span className={s.cite}>
        <FileCode2 aria-hidden />
        retry_policy.py, lines 6–7
      </span>
    </div>
  );
}

export function DecisionFragment() {
  return (
    <div className={s.decision}>
      <span className={s.choiceOn}>
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
      <p className={s.decisionNote}>Recorded by your team. No score.</p>
    </div>
  );
}

export function PassportFragment() {
  return (
    <div className={s.card}>
      <p className={s.kicker}>Engineering passport · private</p>
      <p className={s.title}>Writes tests for their own code</p>
      <span className={s.cite}>
        <FileCode2 aria-hidden />
        payments-api/tests/test_charges.py, lines 12–48
      </span>
    </div>
  );
}

export function ReceiptFragment() {
  return (
    <div className={s.card}>
      <p className={s.kicker}>Receipt</p>
      <p className={s.title}>Sent to the hiring team</p>
      <span className={s.cite}>sha256 3f9c1a07…c6d5e4f3</span>
    </div>
  );
}
