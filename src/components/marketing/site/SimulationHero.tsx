import type { CSSProperties, ReactNode } from "react";
import { ArrowUp, CircleCheck, Clock3, FileCode2, FileText, FlaskConical, FolderTree, MessagesSquare, Upload } from "lucide-react";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import { CHANGED_PATH, HUNK, HUNK_INDENT as INDENT, PUBLIC_RUN as RUN } from "./example-submission";
import s from "./sim-hero.module.css";

const LEAD = SCENARIO.teammates[0];
const ANSWER = SCENARIO.clarificationRules.find((r) => r.id === "temporary_vs_permanent")?.answer ?? "";
/** The first two sentences of the lead's answer: enough to act on, short enough to read at a glance. */
const ANSWER_SHORT = ANSWER.split(/(?<=\.)\s+/)
  .slice(0, 2)
  .join(" ");
const REQUIREMENT_INDEX = SCENARIO.initialRequirements.findIndex((r) => r.startsWith("Do not retry permanent failures"));
const REQUIREMENT = SCENARIO.initialRequirements[REQUIREMENT_INDEX] ?? "";
const LEFT = `${SCENARIO.defaultAllowedMinutes - 38}:12 left`;

const NAV = [
  { label: "Brief", icon: FileText },
  { label: "Team thread", icon: MessagesSquare },
  { label: "Changes", icon: FileCode2, on: true },
  { label: "Files", icon: FolderTree },
  { label: "Tests", icon: FlaskConical },
  { label: "Submission", icon: Upload },
] as const;

const ADDED = HUNK.filter((l) => l.kind === "add").length;
const REMOVED = HUNK.filter((l) => l.kind === "del").length;

const KEYWORDS = new Set(["if", "elif", "else", "def", "return", "None", "self", "and", "or", "not"]);

/** Minimal Python colouring: comments, keywords, numbers and constants. */
function highlight(code: string): ReactNode[] {
  const hash = code.indexOf("#");
  const body = hash >= 0 ? code.slice(0, hash) : code;
  const out: ReactNode[] = body.split(/(\b\w+\b)/).map((part, i) => {
    if (KEYWORDS.has(part))
      return (
        <span key={i} className={s.kw}>
          {part}
        </span>
      );
    if (/^\d+$/.test(part))
      return (
        <span key={i} className={s.num}>
          {part}
        </span>
      );
    if (/^[A-Z][A-Z_]+$/.test(part))
      return (
        <span key={i} className={s.const}>
          {part}
        </span>
      );
    return part;
  });
  if (hash >= 0)
    out.push(
      <span key="c" className={s.comment}>
        {code.slice(hash)}
      </span>,
    );
  return out;
}

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * The candidate's side of a Fydell simulation, focused on one outcome: a
 * change to the dispatcher, the requirement it answers, and the public test
 * that now passes. A short team thread sits in its own column. Scenario facts
 * (requirement, teammate answer, test names, starter lines) come from the
 * shipped `backend-webhook-retry` definition; the timings and the added lines
 * are example data.
 */
export default function SimulationHero() {
  return (
    <div className={s.root}>
      <div className={s.win}>
        <aside className={s.side}>
          <div className={s.sideTop}>
            <span className={s.lights} aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className={s.workspace}>
            <span className={s.wsMark}>H</span>
            <span className={s.wsName}>Harbor Pay</span>
          </div>
          <ul className={s.nav}>
            {NAV.map(({ label, icon: Icon, ...rest }) => (
              <li key={label} className={"on" in rest ? s.navOn : s.navItem}>
                <Icon aria-hidden size={15} className={s.navIcon} />
                {label}
              </li>
            ))}
          </ul>
          <div className={s.sideFoot}>
            <span className={s.footLabel}>{SCENARIO.title}</span>
            <span className={s.footMeta}>Python · {SCENARIO.defaultAllowedMinutes} minutes</span>
          </div>
        </aside>

        <div className={s.main}>
          <div className={s.bar}>
            <span className={s.key}>INC-2291</span>
            <span className={s.barTitle}>Webhook dispatcher retry storm</span>
            <span className={s.barRight}>
              <span className={s.clock}>
                <Clock3 aria-hidden size={13} />
                {LEFT}
              </span>
              <span className={s.example}>Example</span>
            </span>
          </div>

          <div className={s.body}>
            <div className={s.work}>
              <p className={`${s.requirement} ${s.enter}`} style={at(150)}>
                <span className={s.reqNum}>Requirement {REQUIREMENT_INDEX + 1}</span>
                {REQUIREMENT}
              </p>

              <figure className={`${s.diff} ${s.enter}`} style={at(300)}>
                <figcaption className={s.diffHead}>
                  <FileCode2 aria-hidden size={14} className={s.dim} />
                  <span className={s.diffPath}>{CHANGED_PATH}</span>
                  <span className={s.add}>+{ADDED}</span>
                  <span className={s.del}>−{REMOVED}</span>
                  <span className={s.hunkCount}>2 of 3 hunks</span>
                </figcaption>
                <p className={s.hunk}>@@ -45,7 +45,9 @@ def _attempt(self, delivery, now)</p>
                <pre className={s.code} aria-label={`Diff of ${CHANGED_PATH}: ${ADDED} lines added, ${REMOVED} removed`}>
                  {HUNK.map((l, i) => (
                    <span key={i} className={s.line} data-kind={l.kind}>
                      <span className={s.ln} aria-hidden>
                        {l.kind === "add" ? "" : l.old}
                      </span>
                      <span className={s.ln} aria-hidden>
                        {l.kind === "del" ? "" : l.new}
                      </span>
                      <span className={s.sign} aria-hidden>
                        {l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}
                      </span>
                      <span className={s.src}>{highlight(l.code.slice(INDENT))}</span>
                    </span>
                  ))}
                </pre>
              </figure>

              <div className={`${s.tests} ${s.enter}`} style={at(500)}>
                <p className={s.testsHead}>
                  <FlaskConical aria-hidden size={14} className={s.dim} />
                  <b>Public tests</b>
                  <span className={s.passCount}>
                    {RUN.length} of {RUN.length} passed
                  </span>
                  <span className={s.cmd}>{SCENARIO.testCommands.unix}</span>
                </p>
                <ul className={s.testList}>
                  {RUN.map((t) => (
                    <li key={t.name} className={s.testRow} data-fixed={t.fixed || undefined}>
                      <CircleCheck aria-hidden size={14} className={s.pass} />
                      <span className={s.testName}>{t.name}</span>
                      {t.fixed ? <span className={s.fixed}>Failed before this change</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={s.dock}>
              <div className={s.panelHead}>
                <MessagesSquare aria-hidden size={14} className={s.dim} />
                <span className={s.panelTitle}>Team thread</span>
                <span className={s.simulated}>Simulated</span>
              </div>
              <div className={s.thread}>
                <p className={`${s.mine} ${s.enter}`} style={at(650)}>
                  Should a 410 be retried, or end as failed?
                </p>
                <div className={`${s.reply} ${s.enter}`} style={at(800)}>
                  <p className={s.replyHead}>
                    <span className={s.avatar} aria-hidden>
                      {LEAD.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </span>
                    <b>{LEAD.name}</b>
                    <span className={s.time}>{LEAD.title}</span>
                  </p>
                  <p className={s.replyText}>{ANSWER_SHORT}</p>
                </div>
              </div>
              <div className={s.composer}>
                <span className={s.placeholder}>Message the team…</span>
                <span className={s.send} aria-hidden>
                  <ArrowUp size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
