import type { CSSProperties } from "react";
import {
  Check,
  X,
  FileCode2,
  Terminal,
  FlaskConical,
  MessageSquare,
  FileText,
  Lock,
  GitCommitHorizontal,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Mark } from "../Mark";
import { CitationChip, Frame } from "../primitives";
import { CodeLines } from "./code";
import v from "./visuals.module.css";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

/* ---- 2. Incident brief beside the team thread ---------------------------- */

export function IncidentBrief() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: INCIDENT.md for INC-2291, a webhook retry storm opened by Alex Morgan, shown beside the team thread where Jordan Hayes from partner support describes the duplicate deliveries."
        title="INCIDENT.md"
      >
        <div className={v.split}>
          <article className={v.doc}>
            <h4>INC-2291: webhook retry storm</h4>
            <div className={v.docMeta}>
              <span>Opened by Alex Morgan</span>
              <span className={v.sev}>
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                  <circle cx="4" cy="4" r="4" fill="currentColor" />
                </svg>
                Severity 2
              </span>
              <span>Service: webhooks</span>
            </div>
            <h5>What happened</h5>
            <p>
              A partner endpoint started returning errors at 09:40. Our dispatcher retried every failure immediately and
              without limit, so one bad hour turned into a queue of duplicate deliveries.
            </p>
            <h5>What we know</h5>
            <ul>
              <li>Retries ignore the status code. A rejected payload is retried as often as a timeout.</li>
              <li>There is no backoff between attempts.</li>
              <li>The tests in tests/test_dispatcher.py cover the happy path only.</li>
            </ul>
            <h5>Your task</h5>
            <p>
              Make retries safe: retry only failures that can succeed later, back off between attempts, and leave the
              code in a state the on-call engineer can trust tonight.
            </p>
          </article>
          <section className={v.thread} style={{ borderLeft: 0 }}>
            <div className={v.threadHead}>
              Team thread <span>#inc-2291</span>
            </div>
            <div className={v.messages}>
              <div className={v.msg}>
                <span className={`${v.avatar} ${v.avatarBlue}`}>AM</span>
                <div>
                  <div className={v.who}>
                    <b>Alex Morgan</b>
                    <span>Engineering lead · 11:58</span>
                  </div>
                  <div className={v.body}>
                    Brief is in INCIDENT.md. Ask here if anything is unclear; I would rather you ask than guess.
                  </div>
                </div>
              </div>
              <div className={v.msg}>
                <span className={`${v.avatar} ${v.avatarTeal}`}>JH</span>
                <div>
                  <div className={v.who}>
                    <b>Jordan Hayes</b>
                    <span>Partner support · 12:01</span>
                  </div>
                  <div className={v.body}>
                    The partner says they received the same order event dozens of times in ten minutes. They are asking
                    when it will stop.
                  </div>
                </div>
              </div>
              <div className={v.msg}>
                <span className={v.avatar}>You</span>
                <div>
                  <div className={v.who}>
                    <b>You</b>
                    <span>12:04</span>
                  </div>
                  <div className={v.body}>Which failures should count as temporary?</div>
                </div>
              </div>
            </div>
            <div className={v.composer}>Ask the team a question</div>
          </section>
        </div>
      </Frame>
    </div>
  );
}

/* ---- 3. Consent ------------------------------------------------------------ */

const RECORDED = [
  "Files you create, change or delete in the project",
  "Commands you run in the Fydell terminal",
  "Test runs and their results",
  "When each step happened",
  "Messages to the simulated team",
];
const NEVER = ["Your screen", "Webcam or microphone", "Browsing or other apps", "Keystrokes", "Anything outside the project folder"];

export function ConsentScreen() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the consent screen, titled What this simulation records. Recorded: files changed, commands run, test runs, timing, and messages to the simulated team. Never recorded: screen, webcam or microphone, browsing, keystrokes, anything outside the project folder."
        title="Before you start"
      >
        <div className={v.consent}>
          <div className={v.consentHead}>
            <Mark size={16} />
            <h4>What this simulation records</h4>
            <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 12.5 }}>
              Backend engineer · Webhook retry incident · About 60 minutes
            </p>
          </div>
          <div className={v.consentCols}>
            <div className={v.consentCol}>
              <h5>Recorded</h5>
              {RECORDED.map((r) => (
                <div key={r} className={v.consentRow}>
                  <Check size={14} strokeWidth={1.75} style={{ color: "var(--fy-teal-ink)" }} />
                  {r}
                </div>
              ))}
            </div>
            <div className={v.consentCol}>
              <h5>Never recorded</h5>
              {NEVER.map((r) => (
                <div key={r} className={v.consentRow}>
                  <X size={14} strokeWidth={1.75} style={{ color: "var(--text-quaternary)" }} />
                  {r}
                </div>
              ))}
            </div>
          </div>
          <div className={v.consentActions}>
            <span className={v.btnGhost}>Not now</span>
            <span className={v.btnDark}>I understand, start</span>
          </div>
        </div>
      </Frame>
    </div>
  );
}

/* ---- Work trail -------------------------------------------------------------- */

const TRAIL = [
  { t: "12:02", icon: FileText, text: <>Opened <b>INCIDENT.md</b></>, meta: "" },
  { t: "12:04", icon: MessageSquare, text: <>Asked the team which failures are temporary</>, meta: "thread" },
  { t: "12:09", icon: FileCode2, text: <>Edited <b>dispatcher.py</b></>, meta: "+14 −3" },
  { t: "12:11", icon: Terminal, text: <>Ran <b>pytest tests/</b></>, meta: "11 passed, 4 failed", tone: "" },
  { t: "12:21", icon: null, text: <>Requirement update: <b>honor Retry-After</b></>, meta: "received", tone: "red" },
  { t: "12:30", icon: FileCode2, text: <>Edited <b>retry_policy.py</b></>, meta: "+22 −0" },
  { t: "12:38", icon: FlaskConical, text: <>Ran <b>pytest tests/</b></>, meta: "13 passed, 2 failed", tone: "teal" },
  { t: "12:47", icon: Lock, text: <>Submitted snapshot <b>sha256 9f2c…e41a</b></>, meta: "sealed" },
];

export function WorkTrailPanel() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the recorded work trail for one attempt, from opening the brief at 12:02 to submitting a sealed snapshot at 12:47, including edits, test runs, a question to the team and the requirement update."
        title="Work trail · Candidate 04"
      >
        <div className={v.trail}>
          {TRAIL.map((r, n) => {
            const Icon = r.icon;
            return (
              <div key={n} className={v.trailRow} data-r="row" style={i(n)}>
                <span className={v.trailTime}>{r.t}</span>
                <span
                  className={`${v.trailIcon} ${r.tone === "red" ? v.trailIconRed : r.tone === "teal" ? v.trailIconTeal : ""}`}
                >
                  {Icon ? (
                    <Icon size={12} strokeWidth={1.5} />
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 12 12">
                      <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="currentColor" />
                    </svg>
                  )}
                </span>
                <span className={v.trailText}>{r.text}</span>
                <span className={v.trailMeta}>{r.meta}</span>
              </div>
            );
          })}
        </div>
      </Frame>
    </div>
  );
}

/* ---- 4. Hidden checks --------------------------------------------------------- */

const CHECKS: [string, string, boolean][] = [
  ["test_timeout_is_retried", "0.08s", true],
  ["test_429_is_retried", "0.05s", true],
  ["test_5xx_is_retried", "0.06s", true],
  ["test_400_is_not_retried", "0.04s", true],
  ["test_404_is_not_retried", "0.04s", true],
  ["test_backoff_grows", "0.11s", true],
  ["test_backoff_is_capped", "0.09s", true],
  ["test_retry_after_429", "0.07s", true],
  ["test_retry_after_503", "0.07s", false],
  ["test_max_attempts", "0.10s", true],
  ["test_failed_marked_once", "0.05s", true],
  ["test_no_duplicate_send", "0.21s", true],
  ["test_connection_error", "0.06s", true],
  ["test_receipt_after_success", "0.05s", true],
  ["test_existing_suite", "1.02s", true],
];

export function HiddenChecks() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: hidden checks for Candidate 04. 14 of 15 passed. The failing check is test_retry_after_503. Checks ran on the submitted snapshot in an isolated sandbox, not on the candidate's machine."
        title="Hidden checks"
      >
        <div className={v.panel}>
          <div className={v.checksTop}>
            <div className={v.checksCount}>
              <b>14 of 15 passed</b>
              <span>Run on the submitted snapshot, not on the candidate&apos;s machine.</span>
            </div>
            <div className={v.segments}>
              {CHECKS.map(([name, , ok], n) => (
                <span key={name} className={`${v.seg} ${ok ? "" : v.segFail} fy-bar`} style={i(n)} />
              ))}
            </div>
          </div>
          <div className={v.checkRows}>
            {CHECKS.map(([name, time, ok], n) => (
              <div key={name} className={`${v.checkRow} ${ok ? "" : v.checkRowFail}`} data-r="row" style={i(n * 0.5)}>
                {ok ? (
                  <Check size={13} strokeWidth={1.75} style={{ color: "var(--fy-teal-ink)" }} />
                ) : (
                  <X size={13} strokeWidth={1.75} />
                )}
                <span>{name}</span>
                <em>{time}</em>
              </div>
            ))}
          </div>
          <div className={v.snapshot}>
            <span>
              <ShieldCheck size={12} strokeWidth={1.5} />
              Isolated sandbox, no network
            </span>
            <span>
              Snapshot <code>sha256 9f2c4a…7be41a</code>
            </span>
          </div>
        </div>
      </Frame>
    </div>
  );
}

/* ---- 5. Cited report ------------------------------------------------------------- */

export function CitedReport({ decision = "Advance" }: { decision?: "Advance" | "Hold" | "Decline" }) {
  return (
    <div className={v.root}>
      <Frame
        label={`Example: the team's report for Candidate 04 on the webhook retry incident. Three findings, each citing a file and line, a test, or a thread message. There is no score. The team decision control shows Advance, Hold and Decline, with ${decision} selected.`}
        title="Report · Candidate 04"
      >
        <div className={v.report}>
          <div className={v.reportMain}>
            <div className={v.reportHead}>
              <h4>
                <Mark size={14} />
                Candidate 04 · Webhook retry incident
              </h4>
              <div className={v.reportMeta}>
                <span>Written by Alex Morgan, Engineering lead</span>
                <span>3 findings · all cited</span>
              </div>
            </div>
            <div className={v.finding} data-r="row" style={i(0)}>
              <div className={v.findingTop}>
                <span className={`${v.kind} ${v.kindObs}`}>Observation</span>
                Retry logic
              </div>
              <p className={v.findingText}>Separated temporary from permanent failures before changing how retries work.</p>
              <div className={v.chips}>
                <CitationChip kind="file">dispatcher.py:45–49</CitationChip>
                <CitationChip kind="test">test_400_is_not_retried</CitationChip>
              </div>
            </div>
            <div className={v.finding} data-r="row" style={i(1)}>
              <div className={v.findingTop}>
                <span className={`${v.kind} ${v.kindObs}`}>Observation</span>
                Working with the team
              </div>
              <p className={v.findingText}>Asked which failures count as temporary before editing, and followed the answer.</p>
              <div className={v.chips}>
                <CitationChip kind="message">Thread 12:04</CitationChip>
                <CitationChip kind="message">Thread 12:06</CitationChip>
              </div>
            </div>
            <div className={v.finding} data-r="row" style={i(2)}>
              <div className={v.findingTop}>
                <span className={`${v.kind} ${v.kindGap}`}>Gap</span>
                Requirement update
              </div>
              <p className={v.findingText}>Honors Retry-After on 429 but not on 503, which the update also named.</p>
              <div className={v.chips}>
                <CitationChip kind="test" failed>
                  test_retry_after_503
                </CitationChip>
                <CitationChip kind="file">retry_policy.py:31</CitationChip>
              </div>
            </div>
          </div>
          <aside className={v.reportSide}>
            <div>
              <p className={v.sideTitle}>Team decision</p>
              <div className={v.decision}>
                {(["Advance", "Hold", "Decline"] as const).map((d) => (
                  <span key={d} className={`${v.decisionOpt} ${d === decision ? `${v.decisionOn} fy-glow-blue` : ""}`}>
                    <span className={v.radio} />
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <p className={v.sideNote}>
              This report has no score. Each finding cites the work it rests on. Recording a decision sends nothing to the
              candidate.
            </p>
            <div className={v.gate}>
              <p className={v.sideTitle} style={{ margin: 0 }}>
                Release check
              </p>
              <span className={v.gateRow}>
                <Check size={13} strokeWidth={1.75} /> 3 of 3 findings cite evidence
              </span>
              <span className={v.gateRow}>
                <Check size={13} strokeWidth={1.75} /> No score or ranking in the text
              </span>
            </div>
          </aside>
        </div>
      </Frame>
    </div>
  );
}

/* ---- 6. Receipt ------------------------------------------------------------------- */

export const SAMPLE_SHA = "9f2c4a81d03e6b57c2a19e4f8d7760b31c5e92a4f0d68b1e37ac25d9e07be41a";

export function Receipt() {
  return (
    <div className={v.root}>
      <Frame
        label={`Example: the candidate's submission receipt. The project snapshot is sealed with sha256 checksum ${SAMPLE_SHA}. Submitted at 12:47, 3 files changed.`}
        title="Submission received"
      >
        <div className={v.receipt}>
          <div className={v.receiptHead}>
            <Mark size={18} />
            <div>
              <h4>Your work is submitted</h4>
              <p>Webhook retry incident · Candidate 04</p>
            </div>
          </div>
          <dl className={v.kv}>
            <div className={v.kvRow}>
              <dt>Submitted</dt>
              <dd className={v.tab}>12:47 · 45 minutes of work</dd>
            </div>
            <div className={v.kvRow}>
              <dt>Snapshot</dt>
              <dd>3 files changed · 7 test runs</dd>
            </div>
            <div className={v.kvRow}>
              <dt>Checksum</dt>
              <dd className={v.hash}>sha256 {SAMPLE_SHA}</dd>
            </div>
          </dl>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>
            Hidden checks run on exactly this snapshot. Keep this receipt; the checksum lets you confirm what the team
            reviews is what you submitted.
          </p>
        </div>
      </Frame>
    </div>
  );
}

/* ---- 7. Engineering Passport ------------------------------------------------------ */

export function PassportView() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: an Engineering Passport. The repository ledger-sync is pinned at commit 4f9c2e1. Two findings link to exact line ranges. A revocable share link is active."
        title="Engineering Passport"
      >
        <div className={v.passport}>
          <div style={{ minWidth: 0 }}>
            <div className={v.repoHead}>
              <div className={v.repoName}>
                <Mark size={13} />
                ledger-sync
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12, color: "var(--text-quaternary)" }}>
                <span className={v.pin}>
                  <GitCommitHorizontal size={12} strokeWidth={1.5} /> pinned at 4f9c2e1
                </span>
                <span>Public repository · Go</span>
              </div>
            </div>
            <div className={v.pFinding} data-r="row" style={i(0)}>
              <p className={v.findingText}>Writes are idempotent, keyed by the source event ID.</p>
              <div className={v.chips}>
                <CitationChip kind="file">internal/sync/writer.go:88–97</CitationChip>
              </div>
              <CodeLines
                className={v.snippet}
                lines={[
                  { n: 88, t: " ", src: "func (w *Writer) Apply(ctx context.Context, e Event) error {" },
                  { n: 89, t: " ", src: "    key := e.SourceID  // one write per upstream event" },
                  { n: 90, t: " ", src: "    if w.seen(ctx, key) {" },
                  { n: 91, t: " ", src: "        return nil" },
                ]}
              />
            </div>
            <div className={v.pFinding} data-r="row" style={i(1)}>
              <p className={v.findingText}>Reconciliation is covered by table-driven tests for partial failures.</p>
              <div className={v.chips}>
                <CitationChip kind="test">writer_test.go:140–188</CitationChip>
              </div>
            </div>
          </div>
          <aside className={v.passportSide}>
            <div>
              <p className={v.sideTitle}>Shared with</p>
              <div className={v.shareCard}>
                <div className={v.shareUrl}>
                  <Link2 size={12} strokeWidth={1.5} />
                  fydell.com/p/k3x9-ledger
                </div>
                <div className={v.shareRow}>
                  <span>Link active · you control it</span>
                  <span className={v.revoke}>Revoke</span>
                </div>
              </div>
            </div>
            <p className={v.sideNote}>
              Findings point to exact lines at a pinned commit. Revoking the link ends access immediately. Free for
              engineers.
            </p>
          </aside>
        </div>
      </Frame>
    </div>
  );
}

/* ---- Passport builder: paste a GitHub URL, choose repositories ---------------- */

const REPOS: [string, string, string, boolean][] = [
  ["ledger-sync", "Go", "4f9c2e1", true],
  ["rate-limiter", "Rust", "a17d03b", true],
  ["dotfiles", "Shell", "c90e4f2", false],
  ["pg-migrate-lite", "Python", "7b2e91a", false],
];

export function PassportBuilderMock() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the passport builder. A GitHub profile URL is entered, four public repositories are found, and two are selected to be read at their pinned commits."
        title="Build your passport"
      >
        <div className={v.consent}>
          <div className={v.consentHead}>
            <h4>Choose what Fydell reads</h4>
            <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 12.5 }}>
              Public repositories only. Each is read at the commit you pin, so findings never drift.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className={v.shareUrl} style={{ flex: 1, height: 36, background: "var(--surface-raised)", boxShadow: "0 0 0 1px var(--fy-blue), 0 0 0 4px var(--fy-blue-soft)" }}>
              github.com/your-handle
            </span>
            <span className={v.btnDark} style={{ height: 36 }}>
              Find repositories
            </span>
          </div>
          <div className={v.kv} style={{ background: "var(--surface-raised)", boxShadow: "0 0 0 1px var(--border-subtle)" }}>
            {REPOS.map(([name, lang, sha, on], n) => (
              <div key={name} className={v.kvRow} data-r="row" style={{ ...i(n), gridTemplateColumns: "18px minmax(0,1fr) auto", alignItems: "center" }}>
                <span
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 4,
                    display: "grid",
                    placeItems: "center",
                    background: on ? "var(--fy-blue)" : "transparent",
                    boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--border-strong)",
                    color: "#fff",
                  }}
                >
                  {on ? <Check size={11} strokeWidth={2.25} /> : null}
                </span>
                <dd style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <b style={{ fontWeight: 510 }}>{name}</b>
                  <span style={{ color: "var(--text-quaternary)", fontSize: 12 }}>{lang}</span>
                </dd>
                <span className={v.pin}>
                  <GitCommitHorizontal size={12} strokeWidth={1.5} /> {sha}
                </span>
              </div>
            ))}
          </div>
          <div className={v.consentActions} style={{ justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>2 selected · nothing is shared until you create a link</span>
            <span className={v.btnDark}>Read 2 repositories</span>
          </div>
        </div>
      </Frame>
    </div>
  );
}
