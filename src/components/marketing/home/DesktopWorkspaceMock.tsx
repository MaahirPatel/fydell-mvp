import { FileCode2, FileText, Play } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import s from "./desktop-mock.module.css";

/**
 * Coded rendering of the Fydell desktop simulation app. Static illustration —
 * the content mirrors the real Northbeam Logistics scenario package.
 */

type TokClass = "cm" | "kw" | "fn" | "st" | "nm" | "pl";

const CODE: Array<{ tokens: Array<[TokClass, string]>; added?: boolean }> = [
  { tokens: [["cm", "# visibility.py — claim the alert before sending"], ["pl", ""]] },
  { tokens: [["pl", ""]] },
  { tokens: [["kw", "from"], ["pl", " datetime "], ["kw", "import"], ["pl", " datetime, timedelta"]] },
  { tokens: [["pl", ""]] },
  { tokens: [["pl", "ALERT_THRESHOLD_MINUTES = "], ["nm", "45"]] },
  { tokens: [["pl", ""]] },
  { tokens: [["kw", "def"], ["fn", " shipment_is_delayed"], ["pl", "(shipment, now="], ["kw", "None"], ["pl", "):"]] },
  { tokens: [["st", '    """A shipment is delayed when its ETA slipped'], ["pl", ""]] },
  { tokens: [["st", "    past the promised window without a handoff."], ["pl", ""]] },
  { tokens: [["st", '    """'], ["pl", ""]] },
  { tokens: [["pl", "    now = now "], ["kw", "or"], ["pl", " datetime.utcnow()"]] },
  { tokens: [["kw", "    if"], ["pl", " shipment.handed_off_at:"], ["pl", ""]] },
  { tokens: [["kw", "        return"], ["pl", " False"]] },
  { tokens: [["pl", "    eta = shipment.promised_eta"]] },
  { tokens: [["kw", "    return"], ["pl", " now > eta + timedelta(minutes=ALERT_THRESHOLD_MINUTES)"]] },
  { tokens: [["pl", ""]] },
  { tokens: [["kw", "def"], ["fn", " record_delay_alert"], ["pl", "(shipment, alerts):"]], added: true },
  { tokens: [["cm", "    # Claim the alert before sending so a retry"], ["pl", ""], ], added: true },
  { tokens: [["cm", "    # can never notify the customer twice."], ["pl", ""]], added: true },
  { tokens: [["kw", "    if"], ["pl", " "], ["kw", "not"], ["pl", " alerts.claim(shipment.id):"]], added: true },
  { tokens: [["kw", "        return"], ["pl", " None"]], added: true },
];

const TESTS = [
  { name: "test_delay_alert_sent", time: "0.42s", pass: true },
  { name: "test_no_duplicate_alerts", time: "0.38s", pass: true },
  { name: "test_eta_recalc_on_reroute", time: "1.02s", pass: false },
];

export default function DesktopWorkspaceMock() {
  return (
    <figure>
      <div className={s.mock} role="img" aria-label="Illustration of the Fydell desktop simulation app: file tree, code editor with the candidate's fix, and recorded test results">
        <div className={s.titlebar}>
          <span className={s.traffic} aria-hidden>
            <i /><i /><i />
          </span>
          <span className={s.scenario}>
            <FydellMark width={16} />
            Northbeam Logistics — Shipment Delay Visibility
            <small>v2.0.0</small>
          </span>
          <span className={s.titleMeta}>
            <span className={s.hideSm}>01:12:44</span>
            <span className={`${s.sync} ${s.hideSm}`}><i /> Synced</span>
            <button type="button" tabIndex={-1} className={s.submit}>Submit</button>
          </span>
        </div>

        <div className={s.body}>
          <div className={s.tree} aria-hidden>
            <p className={s.treeDir}>Brief</p>
            <span className={s.treeFile}><FileText size={13} /> BRIEF.md</span>
            <p className={s.treeDir}>src</p>
            <span className={`${s.treeFile} ${s.active}`}><FileCode2 size={13} /> visibility.py</span>
            <span className={`${s.treeFile} ${s.indent}`}><FileCode2 size={13} /> models.py</span>
            <span className={`${s.treeFile} ${s.indent}`}><FileCode2 size={13} /> notifier.py</span>
            <p className={s.treeDir}>tests</p>
            <span className={`${s.treeFile} ${s.indent}`}><FileCode2 size={13} /> test_visibility.py</span>
          </div>

          <div className={s.editor} aria-hidden>
            <div className={s.tabs}>
              <span className={s.tab}>visibility.py</span>
              <span className={`${s.tab} ${s.dim}`}>test_visibility.py</span>
              <span className={`${s.tab} ${s.dim}`}>BRIEF.md</span>
            </div>
            <pre className={s.code}>
              {CODE.map((line, i) => (
                <span key={i} className={`${s.codeLine} ${line.added ? s.added : ""}`}>
                  <span className={s.ln}>{i + 1}</span>
                  <span>
                    {line.tokens.map(([cls, text], j) => (
                      <span key={j} className={s[cls]}>{text}</span>
                    ))}
                  </span>
                </span>
              ))}
            </pre>
          </div>

          <div className={s.tests} aria-hidden>
            <div className={s.panelHead}>
              <span>Tests</span>
              <button type="button" tabIndex={-1} className={s.runBtn}>
                <Play size={11} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                Run
              </button>
            </div>
            <div className={s.testList}>
              {TESTS.map((t) => (
                <p key={t.name} className={s.testRow}>
                  <span className={t.pass ? s.pass : s.fail}>{t.pass ? "✓" : "✕"}</span>
                  <span className={s.name}>{t.name}</span>
                  <span className={s.time}>{t.time}</span>
                </p>
              ))}
            </div>
            <div className={s.summary}>
              <span className={s.ok}>2 passed</span> · <span className={s.bad}>1 failed</span>
              <small>Recorded by the trusted test harness. This is what the reviewer sees.</small>
            </div>
          </div>
        </div>

        <div className={s.disclosure} aria-hidden>
          <b>Recording</b>
          <span>Files, test runs, and timeline are recorded. Keystrokes, other apps, and your screen are not.</span>
        </div>

        <div className={s.statusbar} aria-hidden>
          <span>Python 3.11</span>
          <span>rev 7</span>
          <span className={s.right}>
            <span>UTF-8</span>
            <span>Northbeam scenario</span>
          </span>
        </div>
      </div>
      <figcaption className={s.caption}>
        <b>The Fydell desktop app.</b> Candidates work a realistic incident in a real codebase —
        brief, editor, tests, and a disclosed recording notice. Nothing else leaves the machine.
      </figcaption>
    </figure>
  );
}
