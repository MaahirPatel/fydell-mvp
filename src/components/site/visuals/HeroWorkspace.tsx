import { Clock3, FileText, FileCode2, Folder, MessageSquare, FlaskConical, GitBranch } from "lucide-react";
import { Mark } from "../Mark";
import { Frame } from "../primitives";
import { CodeLines, type DiffLine } from "./code";
import v from "./visuals.module.css";

const DIFF: DiffLine[] = [
  { t: "@", src: "@@ dispatcher.py  -8,6 +8,7 @@  retry policy" },
  { n: 8, t: " ", src: "from .clock import now" },
  { n: 9, t: " ", src: "from .queue import schedule_retry, mark_failed" },
  { n: 10, t: "+", src: "TEMPORARY_STATUSES = {408, 425, 429, 500, 502, 503, 504}" },
  { n: 11, t: " ", src: "" },
  { t: "@", src: "@@ dispatcher.py  -41,9 +42,12 @@  def deliver(event, attempt=1):" },
  { n: 42, t: " ", src: "def deliver(event, attempt=1):" },
  { n: 43, t: " ", src: "    try:" },
  { n: 44, t: " ", src: "        response = client.post(event.url, json=event.payload, timeout=5)" },
  { n: 45, t: "-", src: "        if response.status_code >= 400:" },
  { n: 46, t: "-", src: "            raise RetryableError(response.status_code)" },
  { n: 45, t: "+", src: "        if response.status_code in TEMPORARY_STATUSES:", focus: true },
  { n: 46, t: "+", src: "            delay = retry_after(response) or backoff(attempt)" },
  { n: 47, t: "+", src: "            return schedule_retry(event, attempt + 1, delay)" },
  { n: 48, t: "+", src: "        if response.status_code >= 400:" },
  { n: 49, t: "+", src: "            return mark_failed(event, response.status_code)  # payload is wrong" },
  { n: 50, t: " ", src: "    except (Timeout, ConnectionError):" },
  { n: 51, t: " ", src: "        return schedule_retry(event, attempt + 1, backoff(attempt))" },
];

/**
 * Hero: the Fydell desktop app mid-incident. Sidebar with the mark, file
 * tree, a Python diff in dispatcher.py, the simulated team thread with the
 * requirement update, timer, Submit, and the test status bar.
 */
export default function HeroWorkspace() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the Fydell desktop app during a simulation. The candidate is editing dispatcher.py to fix a webhook retry storm, has asked the engineering lead which failures count as temporary, and has just received a requirement update to honor Retry-After. Tests: 13 passed, 2 failed. 31 minutes 42 seconds left."
        title={<>INC-2291<span className={v.hideNarrow}> · Webhook retry storm</span></>}
        right={
          <span className={v.chromeRight}>
            <span className={v.timer}>
              <Clock3 size={13} strokeWidth={1.5} aria-hidden />
              31:42 left
            </span>
            <span className={v.submit}>Submit</span>
          </span>
        }
      >
        <div className={v.workspace}>
          <aside className={v.sidebar}>
            <div className={v.sideBrand}>
              <Mark size={13} />
              fydell
            </div>
            <div className={v.sideGroup}>
              <div className={v.sideLabel}>Incident</div>
              <div className={v.sideItem}>
                <FileText size={14} strokeWidth={1.5} /> Brief
              </div>
              <div className={v.sideItem}>
                <MessageSquare size={14} strokeWidth={1.5} /> Team thread
                <span className={v.dotChanged} style={{ background: "var(--fy-red)" }} />
              </div>
              <div className={v.sideItem}>
                <FlaskConical size={14} strokeWidth={1.5} /> Test runs
              </div>
            </div>
            <div className={v.sideGroup}>
              <div className={v.sideLabel}>Files</div>
              <div className={v.sideItem}>
                <Folder size={14} strokeWidth={1.5} /> webhooks
              </div>
              <div className={`${v.sideItem} ${v.indent1} ${v.sideItemActive}`}>
                <FileCode2 size={14} strokeWidth={1.5} /> dispatcher.py
                <span className={v.dotChanged} />
              </div>
              <div className={`${v.sideItem} ${v.indent1}`}>
                <FileCode2 size={14} strokeWidth={1.5} /> retry_policy.py
                <span className={v.dotChanged} />
              </div>
              <div className={`${v.sideItem} ${v.indent1}`}>
                <FileCode2 size={14} strokeWidth={1.5} /> queue.py
              </div>
              <div className={v.sideItem}>
                <Folder size={14} strokeWidth={1.5} /> tests
              </div>
              <div className={`${v.sideItem} ${v.indent1}`}>
                <FileCode2 size={14} strokeWidth={1.5} /> test_dispatcher.py
              </div>
              <div className={v.sideItem}>
                <FileText size={14} strokeWidth={1.5} /> INCIDENT.md
              </div>
            </div>
            <div className={v.sideFoot}>
              <span>
                <span className={v.recDot} />
                Recording work trail
              </span>
              <span>Files, commands, test runs, timing</span>
            </div>
          </aside>

          <section className={v.editor}>
            <div className={v.tabs}>
              <span className={`${v.fileTab} ${v.fileTabActive}`}>
                <FileCode2 size={13} strokeWidth={1.5} /> dispatcher.py
              </span>
              <span className={`${v.fileTab} ${v.hideNarrow}`}>
                <FileCode2 size={13} strokeWidth={1.5} /> retry_policy.py
              </span>
              <span className={`${v.fileTab} ${v.hideNarrow}`}>
                <FileText size={13} strokeWidth={1.5} /> INCIDENT.md
              </span>
            </div>
            <div className={v.crumbs}>
              webhooks <span aria-hidden>/</span> <b>dispatcher.py</b>
              <span className={v.diffStat}>
                <span className={v.add}>+6</span>
                <span className={v.del}>−2</span>
              </span>
            </div>
            <CodeLines lines={DIFF} />
            <div className={v.terminal}>
              <div className={v.terminalHead}>
                <b>Terminal</b>
                <span>Problems</span>
              </div>
              <div>
                <span className={v.prompt}>$</span> pytest tests/test_dispatcher.py -q
              </div>
              <div>
                ...........<span className={v.del}>F</span>.<span className={v.del}>F</span>. <span className={v.add}>13 passed</span>,{" "}
                <span className={v.del}>2 failed</span> in 1.84s
              </div>
            </div>
          </section>

          <section className={v.thread}>
            <div className={v.threadHead}>
              Team thread <span>3 people</span>
            </div>
            <div className={v.messages}>
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
              <div className={v.msg}>
                <span className={`${v.avatar} ${v.avatarBlue}`}>AM</span>
                <div>
                  <div className={v.who}>
                    <b>Alex Morgan</b>
                    <span>Engineering lead · 12:06</span>
                  </div>
                  <div className={v.body}>
                    Timeouts, <span className={v.inlineCode}>429</span> and 5xx from the partner. Any other 4xx means
                    the payload is wrong, so retrying it only adds load.
                  </div>
                </div>
              </div>
              <div className={`${v.update} fy-glow-red`}>
                <div className={v.updateLabel}>
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                    <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="currentColor" />
                  </svg>
                  Requirement update
                  <span>12:21</span>
                </div>
                <div className={v.updateTitle}>Partner request: honor Retry-After</div>
                <div className={v.body} style={{ marginTop: 0 }}>
                  On 429 and 503 the partner now sends <span className={v.inlineCode}>Retry-After</span>. Wait at least
                  that long before the next attempt.
                </div>
              </div>
            </div>
            <div className={`${v.composer} ${v.hideNarrow}`}>
              Ask the team a question<span className="fy-caret" />
            </div>
          </section>

          <footer className={v.status}>
            <span>
              <span className={v.passDot} />
              pytest <b>13 passed</b>, <b>2 failed</b>
            </span>
            <span className={v.hideNarrow}>
              <GitBranch size={12} strokeWidth={1.5} style={{ verticalAlign: -2, marginRight: 5 }} aria-hidden />
              incident/inc-2291 · 2 files changed
            </span>
            <span className={v.statusRight}>
              <span className={v.hideNarrow}>Python 3.12</span>
              <span>
                <span className={v.recDot} />
                Recording
              </span>
            </span>
          </footer>
        </div>
      </Frame>
    </div>
  );
}
