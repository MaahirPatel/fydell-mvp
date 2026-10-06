import { CheckSquare, Home, Inbox, Layers, MoreHorizontal, Settings, SquareTerminal, Users } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import FydellMark from "@/components/brand/FydellMark";
import { DecisionBrief, DiffStat, EvidenceRail, EvidenceTimeline, MicroLabel, Mono } from "@/components/evidence/Evidence";
import s from "./evaluation-shot.module.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type DiffLine = { kind: "ctx" | "add" | "del" | "hunk"; n?: number; code: string };

const DIFF: DiffLine[] = [
  { kind: "hunk", code: "@@ -12,4 +12,9 @@ def next_delay(attempt, headers):" },
  { kind: "ctx", n: 12, code: "def next_delay(attempt: int, headers) -> float:" },
  { kind: "del", n: 13, code: "    return 60" },
  { kind: "add", n: 13, code: "    retry_after = parse_retry_after(headers)" },
  { kind: "add", n: 14, code: "    if retry_after is not None:" },
  { kind: "add", n: 15, code: "        return min(retry_after, MAX_DELAY)" },
  { kind: "add", n: 16, code: "    return min(BASE_DELAY * 2 ** attempt, MAX_DELAY)" },
  { kind: "ctx", n: 17, code: "" },
  { kind: "ctx", n: 18, code: "def should_retry(status: int) -> bool:" },
  { kind: "add", n: 19, code: "    return status in TRANSIENT  # 408, 429, 5xx" },
];

const EVALUATIONS = [
  { name: "Candidate 01", role: "Backend", tone: "active" },
  { name: "Candidate 02", role: "Backend", tone: "change" },
  { name: "Candidate 03", role: "Platform", tone: "idle" },
  { name: "Candidate 04", role: "Backend", tone: "idle" },
] as const;

/**
 * Example evaluation in the employer workspace: the webhook retry incident
 * (INC-2291) after the hiring team released its report. Example data only;
 * the layout and components are the ones the workspace renders.
 */
export default function EvaluationShot() {
  return (
    <div className={s.app}>
      <aside className={s.side}>
        <div className={s.brandRow}>
          <FydellLogo height={16} />
          <Mono className={s.kbd}>⌘K</Mono>
        </div>
        <div className={s.group}>
          <span className={s.item}>
            <Home aria-hidden /> <span className={s.label}>Overview</span>
          </span>
          <span className={s.item}>
            <Inbox aria-hidden /> <span className={s.label}>Review queue</span> <Mono className={s.count}>3</Mono>
          </span>
          <span className={s.item}>
            <Users aria-hidden /> <span className={s.label}>Candidates</span>
          </span>
          <span className={s.item}>
            <CheckSquare aria-hidden /> <span className={s.label}>Decisions</span>
          </span>
        </div>
        <div className={s.group}>
          <span className={s.groupLabel}>Hiring</span>
          <span className={s.item}>
            <Layers aria-hidden /> <span className={s.label}>Roles</span>
          </span>
          <span className={s.item}>
            <SquareTerminal aria-hidden /> <span className={s.label}>Simulations</span>
          </span>
        </div>
        <div className={s.group}>
          <span className={s.groupLabel}>Active evaluations</span>
          {EVALUATIONS.map((e) => (
            <span key={e.name} className={cx(s.item, e.tone === "active" && s.itemActive)}>
              <span className={cx(s.dot, e.tone === "active" && s.dotAccent, e.tone === "change" && s.dotRed)} />
              <span className={s.label}>{e.name}</span>
              <span className={s.role}>{e.role}</span>
            </span>
          ))}
        </div>
        <div className={cx(s.group, s.sideFoot)}>
          <span className={s.item}>
            <Settings aria-hidden /> <span className={s.label}>Settings</span>
          </span>
        </div>
      </aside>

      <div className={s.main}>
        <div className={s.topbar}>
          <Mono className={s.topId}>FYD-2048</Mono>
          <span className={s.topTitle}>Candidate 01 · Backend Engineer</span>
          <span className={s.topRight}>
            <span className={s.status}>Evaluation complete</span>
            <Mono>3 / 12</Mono>
            <MoreHorizontal aria-hidden width={15} height={15} />
          </span>
        </div>
        <div className={s.tabs}>
          <span className={cx(s.tab, s.tabActive)}>Overview</span>
          <span className={s.tab}>
            Work <Mono className={s.tabCount}>3</Mono>
          </span>
          <span className={s.tab}>
            Thread <Mono className={s.tabCount}>6</Mono>
          </span>
          <span className={s.tab}>
            Checks <Mono className={s.tabCount}>18</Mono>
          </span>
          <span className={s.tab}>Handoff</span>
        </div>

        <div className={s.body}>
          <div className={s.titleRow}>
            <div className="min-w-0">
              <p className={s.name}>Candidate 01</p>
              <p className={s.objective}>
                Stop a webhook dispatcher from retrying into a storm, then honour Retry-After when the partner asks partway through.
              </p>
            </div>
          </div>
          <dl className={s.meta}>
            <div>
              <dt>Role</dt>
              <dd>Backend Engineer</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                <Mono>41m 12s</Mono>
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                Desktop · <Mono>INC-2291</Mono>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Report released</dd>
            </div>
          </dl>
          <div className={s.railWrap}>
            <EvidenceRail
              steps={[
                { label: "Source", value: "Incident", state: "done" },
                { label: "Work", value: "Desktop", state: "done" },
                { label: "Verify", value: "18 / 18", state: "done" },
                { label: "Decide", value: "Advance", state: "current" },
              ]}
            />
          </div>

          <div className={s.split}>
            <div>
              <div className={s.sectionLabel}>
                <MicroLabel>Evidence</MicroLabel>
              </div>
              <EvidenceTimeline
                items={[
                  { id: "setup", time: "14:02", title: "Setup check passed", detail: "Starter project runs locally" },
                  { id: "ask", time: "14:05", title: "Asked the team", detail: "Which failures count as temporary?" },
                  { id: "repro", time: "14:11", title: "Reproduced the storm", detail: "1,204 retries in 60s on a 503" },
                  { id: "update", time: "14:18", title: "Requirement changed", detail: "Honour Retry-After on 429 and 503", tone: "change" },
                  { id: "seal", time: "14:43", title: "Submission sealed", detail: <>3 files · <DiffStat added={41} removed={17} /></>, tone: "key" },
                  { id: "checks", time: "14:44", title: "Hidden checks finished", detail: <><Mono>18 / 18</Mono> passed on the candidate's machine</>, tone: "key" },
                ]}
              />
            </div>

            <div className={s.stack}>
              <div className={s.code}>
                <div className={s.codeHead}>
                  <Mono className={s.codeFile}>webhooks/retry_policy.py</Mono>
                  <DiffStat added={5} removed={1} />
                </div>
                <pre className={s.codeBody}>
                  {DIFF.map((line, i) => (
                    <span key={i} className={cx(s.line, line.kind === "add" && s.lineAdd, line.kind === "del" && s.lineDel, line.kind === "hunk" && s.lineHunk)}>
                      <span className={s.ln}>{line.kind === "hunk" ? "" : line.n}</span>
                      <span className={s.sign}>{line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}</span>
                      <span className={s.src}>{line.code || " "}</span>
                    </span>
                  ))}
                </pre>
              </div>

              <div className={s.checks}>
                <div className={s.checksHead}>
                  <MicroLabel>Hidden checks</MicroLabel>
                  <Mono className={s.checksScore}>18 / 18</Mono>
                </div>
                <div className={s.grid} aria-hidden>
                  {Array.from({ length: 18 }, (_, i) => (
                    <span key={i} className={cx(s.cell, i === 11 && s.cellUpdate)} />
                  ))}
                </div>
                <p className={s.checksNote}>
                  <span className={s.legendUpdate} /> Added after the requirement change
                </p>
              </div>
            </div>
          </div>

          <div className={s.message}>
            <span className={s.avatar}>PN</span>
            <div className="min-w-0">
              <p className={s.msgHead}>
                <b>Engineering lead</b> <Mono>14:18</Mono>
                <span className={s.msgTag}>Requirement update</span>
              </p>
              <p className={s.msgBody}>
                Partner just confirmed: on 429 and 503 they send Retry-After. Please honour it and cap the wait at an hour.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className={s.panel}>
        <DecisionBrief
          mark={<FydellMark width={18} />}
          verdict={{ heading: "Decision", value: "advance", note: "Recorded by the hiring team · report v1" }}
          summary="Found the retry loop, bounded it with backoff, and adapted cleanly when the requirement changed."
          why={["Located the failure mechanism", "Reproduced it before changing code", "Kept the fix small and tested", "Passed every hidden check"]}
          concerns={["Retry state now lives in the dispatcher, which couples it to queue handling."]}
          proof={[
            { label: "Hidden checks", value: <Mono>18 / 18</Mono> },
            { label: "Correctness", value: "Strong", level: "strong" },
            { label: "Engineering judgment", value: "Strong", level: "strong" },
            { label: "Requirement response", value: "Strong", level: "strong" },
            { label: "Communication", value: "Adequate", level: "adequate" },
          ]}
          actions={
            <>
              <span className={cx(s.button, s.buttonSolid)}>View evidence</span>
              <span className={s.button}>Compare</span>
            </>
          }
        />
      </aside>
    </div>
  );
}
