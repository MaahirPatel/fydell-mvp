import type { ReactNode } from "react";
import {
  Home,
  Briefcase,
  Users,
  FileText,
  Settings,
  Plus,
  Check,
  X,
  Search,
  FileCode2,
  FlaskConical,
  MessageSquare,
  MessageSquareQuote,
  UserPlus,
  Inbox,
  Mail,
  CircleAlert,
} from "lucide-react";
import { Mark } from "../Mark";
import { CitationChip, Frame, Pill } from "../primitives";
import { CodeLines } from "./code";
import v from "./visuals.module.css";
import a from "./app.module.css";

/* ---- Employer app shell -------------------------------------------------- */

type NavKey = "home" | "roles" | "candidates" | "reports";

function EmployerShell({
  active,
  crumbs,
  actions,
  children,
  counts,
}: {
  active: NavKey;
  crumbs: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  counts?: Partial<Record<NavKey, number>>;
}) {
  const items: [NavKey, string, typeof Home][] = [
    ["home", "Home", Home],
    ["roles", "Roles", Briefcase],
    ["candidates", "Candidates", Users],
    ["reports", "Reports", FileText],
  ];
  return (
    <div className={a.app}>
      <nav className={a.nav}>
        <div className={a.workspace}>
          <Mark size={13} />
          Example workspace
        </div>
        <div className={a.navGroup}>
          {items.map(([key, label, Icon]) => (
            <span key={key} className={`${a.navItem} ${key === active ? a.navOn : ""}`}>
              <Icon size={15} strokeWidth={1.5} />
              {label}
              {counts?.[key] ? <em>{counts[key]}</em> : null}
            </span>
          ))}
        </div>
        <div className={a.navGroup}>
          <span className={a.navLabel}>Workspace</span>
          <span className={a.navItem}>
            <UserPlus size={15} strokeWidth={1.5} /> Reviewers
          </span>
          <span className={a.navItem}>
            <Settings size={15} strokeWidth={1.5} /> Settings
          </span>
        </div>
        <div className={a.navFoot}>
          <span className={a.me}>AM</span>
          Alex Morgan
        </div>
      </nav>
      <div className={a.main}>
        <div className={a.top}>
          {crumbs}
          {actions ? <span className={a.topRight}>{actions}</span> : null}
        </div>
        <div className={a.content}>{children}</div>
      </div>
    </div>
  );
}

/* ---- 10. Workspace home, honest empty states ------------------------------- */

export function EmployerHomeEmpty() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: a new employer workspace. No roles, candidates or reports yet; each panel says so and names the next step."
        title="fydell · Home"
      >
        <EmployerShell
          active="home"
          crumbs={<b>Home</b>}
          actions={
            <span className={a.btnDark}>
              <Plus size={13} strokeWidth={1.75} /> Create role
            </span>
          }
        >
          <div>
            <h4 className={a.h1}>Set up your first role</h4>
            <p className={a.sub}>Nothing is running yet. These three steps get your first candidate to a report.</p>
          </div>
          <div className={a.card}>
            <div className={a.setup}>
              {[
                ["Create a role", "Choose the incident that matches the job and how long candidates get.", "Create role", true],
                ["Add a teammate", "Invite colleagues who will review attempts and write reports with you.", "Invite teammate", false],
                ["Invite a candidate", "Available once a role exists. Invitations are never billed.", "Invite", false],
              ].map(([t, d, cta, primary], n) => (
                <div key={String(t)} className={a.setupRow}>
                  <span className={a.num}>{n + 1}</span>
                  <span>
                    <b>{t}</b>
                    <small>{d}</small>
                  </span>
                  <span className={primary ? a.btnDark : n === 2 ? `${a.btn} ${a.btnDisabled}` : a.btn}>{cta}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={a.grid3}>
            {[
              [Briefcase, "No roles yet", "Roles you create appear here with their candidates."],
              [Users, "No candidates yet", "Candidates appear after you invite them to a role."],
              [Inbox, "No reports yet", "A report starts when a candidate submits and your team begins reviewing."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Home;
              return (
                <div key={String(t)} className={a.card}>
                  <div className={a.empty}>
                    <span className={a.emptyIcon}>
                      <I size={16} strokeWidth={1.5} />
                    </span>
                    <strong>{t as string}</strong>
                    <span>{d as string}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </EmployerShell>
      </Frame>
    </div>
  );
}

/* ---- 11. Role detail ------------------------------------------------------------- */

const CANDIDATES: [string, ReactNode, string, string][] = [
  ["Candidate 01", <Pill key="a">Invited</Pill>, "Link expires in 6 days", "Not billed"],
  ["Candidate 02", <Pill key="b" tone="blue">Consented</Pill>, "Has not started", "Not billed"],
  ["Candidate 03", <Pill key="c" tone="blue">In progress</Pill>, "34 minutes in", "Not billed"],
  ["Candidate 04", <Pill key="d" tone="passed">Submitted</Pill>, "Review in progress", "Completed"],
  ["Candidate 05", <Pill key="e">Link expired</Pill>, "Never opened", "Not billed"],
  ["Candidate 06", <Pill key="f" tone="passed">Report released</Pill>, "Team decision: Hold", "Completed"],
];

export function RoleDetail() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the Backend engineer role using the webhook retry incident, with six invited candidates and their statuses. Only completed simulations are billed."
        title="fydell · Roles"
      >
        <EmployerShell
          active="roles"
          counts={{ roles: 1, candidates: 6, reports: 1 }}
          crumbs={
            <>
              Roles <span aria-hidden>/</span> <b>Backend engineer</b>
            </>
          }
          actions={
            <span className={a.btnDark}>
              <Mail size={13} strokeWidth={1.75} /> Invite candidates
            </span>
          }
        >
          <div>
            <h4 className={a.h1}>Backend engineer</h4>
            <div className={a.meta} style={{ marginTop: 8 }}>
              <span>
                Incident <b>Webhook retry storm</b>
              </span>
              <span>
                Language <b>Python</b>
              </span>
              <span>
                Time <b>60 minutes</b>
              </span>
              <span>
                Reviewers <b>Alex Morgan, Sam Rivera</b>
              </span>
            </div>
          </div>
          <div className={a.card}>
            <table className={a.table}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Latest</th>
                  <th>Billing</th>
                </tr>
              </thead>
              <tbody>
                {CANDIDATES.map(([name, status, latest, billing]) => (
                  <tr key={name} className={name === "Candidate 04" ? a.rowOn : undefined}>
                    <td>{name}</td>
                    <td>{status}</td>
                    <td>{latest}</td>
                    <td>{billing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </EmployerShell>
      </Frame>
    </div>
  );
}

/* ---- 12. Attempt review ------------------------------------------------------------ */

export function AttemptReview() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: reviewing Candidate 04's attempt. The work trail, the code changes to dispatcher.py, hidden check results of 14 of 15 passed, and the candidate's handoff answers."
        title="fydell · Candidate 04"
      >
        <EmployerShell
          active="candidates"
          crumbs={
            <>
              Backend engineer <span aria-hidden>/</span> <b>Candidate 04</b>
            </>
          }
          actions={<span className={a.btnDark}>Start report</span>}
        >
          <div className={a.row}>
            <div>
              <h4 className={a.h1}>Candidate 04</h4>
              <p className={a.sub}>Submitted 12:47 · 45 minutes · snapshot sha256 9f2c4a…7be41a</p>
            </div>
          </div>
          <div className={a.tabs}>
            <span className={`${a.tabItem} ${a.tabOn}`}>Code changes <em>3 files</em></span>
            <span className={a.tabItem}>Work trail <em>41 events</em></span>
            <span className={a.tabItem}>Hidden checks <em>14 of 15</em></span>
            <span className={a.tabItem}>Handoff answers <em>3</em></span>
          </div>
          <div className={a.review}>
            <div className={a.card}>
              <div className={a.cardHead}>Work trail</div>
              <div className={v.trail} style={{ paddingTop: 2 }}>
                {[
                  ["12:04", "Asked which failures are temporary"],
                  ["12:09", "Edited dispatcher.py"],
                  ["12:11", "Ran pytest: 11 passed, 4 failed"],
                  ["12:21", "Requirement update received"],
                  ["12:30", "Edited retry_policy.py"],
                  ["12:38", "Ran pytest: 13 passed, 2 failed"],
                  ["12:47", "Submitted snapshot"],
                ].map(([t, text]) => (
                  <div key={t} className={v.trailRow} style={{ gridTemplateColumns: "44px minmax(0,1fr)", paddingInline: 16, minHeight: 36 }}>
                    <span className={v.trailTime}>{t}</span>
                    <span className={v.trailText} style={t === "12:21" ? { color: "var(--fy-red-ink)" } : undefined}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={a.card}>
              <div className={a.cardHead}>
                dispatcher.py <span>+6 −2</span>
              </div>
              <CodeLines
                className={v.code}
                lines={[
                  { n: 44, t: " ", src: "response = client.post(event.url, json=event.payload)" },
                  { n: 45, t: "-", src: "if response.status_code >= 400:" },
                  { n: 46, t: "-", src: "    raise RetryableError(response.status_code)" },
                  { n: 45, t: "+", src: "if response.status_code in TEMPORARY_STATUSES:" },
                  { n: 46, t: "+", src: "    delay = retry_after(response) or backoff(attempt)" },
                  { n: 47, t: "+", src: "    return schedule_retry(event, attempt + 1, delay)" },
                  { n: 48, t: "+", src: "if response.status_code >= 400:" },
                  { n: 49, t: "+", src: "    return mark_failed(event, response.status_code)" },
                ]}
              />
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              <div className={a.card}>
                <div className={a.cardHead}>
                  Hidden checks <span className={a.end}>14 of 15 passed</span>
                </div>
                <div className={v.checkRow} style={{ paddingInline: 18, color: "var(--fy-red-ink)" }}>
                  <X size={13} strokeWidth={1.75} />
                  <span>test_retry_after_503</span>
                  <em>failed</em>
                </div>
                <div className={v.checkRow} style={{ paddingInline: 18 }}>
                  <Check size={13} strokeWidth={1.75} style={{ color: "var(--fy-teal-ink)" }} />
                  <span>14 other checks</span>
                  <em>passed</em>
                </div>
              </div>
              <div className={a.card}>
                <div className={a.cardHead}>Handoff answers</div>
                <div className={a.answer}>
                  <b>What would you do next with more time?</b>
                  Apply Retry-After on 503 as well; I ran out of time after the 429 case.
                </div>
                <div className={a.answer}>
                  <b>What should on-call watch tonight?</b>
                  Retry queue depth and the rate of mark_failed calls.
                </div>
              </div>
            </div>
          </div>
        </EmployerShell>
      </Frame>
    </div>
  );
}

/* ---- 13. Report editor with citation picker and release gate --------------------- */

export function ReportEditor() {
  return (
    <div className={v.root}>
      <Frame
        label="Example: the report editor. The third finding has no citation yet, so release is blocked. The citation picker is open, listing a file range, a failing test, a thread message and a handoff answer."
        title="fydell · Report draft"
      >
        <EmployerShell
          active="reports"
          crumbs={
            <>
              Reports <span aria-hidden>/</span> <b>Candidate 04</b>
            </>
          }
          actions={<span className={`${a.btn} ${a.btnDisabled}`}>Release report</span>}
        >
          <div>
            <h4 className={a.h1}>Candidate 04 · Webhook retry incident</h4>
            <p className={a.sub}>Draft by Alex Morgan. Every finding must cite evidence before release.</p>
          </div>
          <div className={a.editor}>
            <div className={a.card} style={{ overflow: "visible" }}>
              <div className={a.cardHead}>
                Findings <span>3</span>
              </div>
              <div className={a.findingEdit}>
                <span className={`${v.kind} ${v.kindObs}`} style={{ width: "fit-content" }}>Observation</span>
                <div className={a.textarea}>Separated temporary from permanent failures before changing how retries work.</div>
                <div className={v.chips}>
                  <CitationChip kind="file">dispatcher.py:45–49</CitationChip>
                  <CitationChip kind="test">test_400_is_not_retried</CitationChip>
                </div>
              </div>
              <div className={a.findingEdit}>
                <span className={`${v.kind} ${v.kindObs}`} style={{ width: "fit-content" }}>Observation</span>
                <div className={a.textarea}>Asked which failures count as temporary before editing, and followed the answer.</div>
                <div className={v.chips}>
                  <CitationChip kind="message">Thread 12:04</CitationChip>
                  <CitationChip kind="message">Thread 12:06</CitationChip>
                </div>
              </div>
              <div className={`${a.findingEdit} ${a.findingMissing}`}>
                <span className={`${v.kind} ${v.kindGap}`} style={{ width: "fit-content" }}>Gap</span>
                <div className={`${a.textarea} ${a.textareaFocus}`}>Honors Retry-After on 429 but not on 503.</div>
                <div className={v.chips} style={{ alignItems: "center" }}>
                  <span className={a.addCite}>
                    <Plus size={12} strokeWidth={1.75} /> Cite evidence
                  </span>
                  <span className={a.missing}>No citation yet</span>
                </div>
                <div className={a.picker}>
                  <div className={a.pickerSearch}>
                    <Search size={14} strokeWidth={1.5} />
                    retry after 503
                  </div>
                  <div className={a.pickerGroup}>Tests</div>
                  <div className={`${a.pickerItem} ${a.pickerOn}`}>
                    <FlaskConical size={13} strokeWidth={1.5} style={{ color: "var(--fy-red-ink)" }} />
                    <code>test_retry_after_503</code>
                    <small>failed</small>
                  </div>
                  <div className={a.pickerGroup}>Files</div>
                  <div className={a.pickerItem}>
                    <FileCode2 size={13} strokeWidth={1.5} />
                    <code>retry_policy.py:28–34</code>
                    <small>+22</small>
                  </div>
                  <div className={a.pickerGroup}>Messages and answers</div>
                  <div className={a.pickerItem}>
                    <MessageSquare size={13} strokeWidth={1.5} />
                    <code>Requirement update 12:21</code>
                    <small>thread</small>
                  </div>
                  <div className={a.pickerItem} style={{ marginBottom: 6 }}>
                    <MessageSquareQuote size={13} strokeWidth={1.5} />
                    <code>Handoff answer 1</code>
                    <small>handoff</small>
                  </div>
                </div>
              </div>
              <div style={{ height: 240 }} />
            </div>
            <div className={a.card}>
              <div className={a.cardHead}>Release check</div>
              <div className={a.gate}>
                <div className={a.blocked}>
                  <b>Release blocked</b>1 finding has no citation.
                </div>
                <span className={a.gateRow}>
                  <Check size={14} strokeWidth={1.75} style={{ color: "var(--fy-teal-ink)" }} /> 2 of 3 findings cite evidence
                </span>
                <span className={a.gateRow}>
                  <CircleAlert size={14} strokeWidth={1.5} style={{ color: "var(--fy-red-ink)" }} /> Finding 3 needs a citation
                </span>
                <span className={a.gateRow}>
                  <Check size={14} strokeWidth={1.75} style={{ color: "var(--fy-teal-ink)" }} /> No score, rating or ranking in the text
                </span>
              </div>
            </div>
          </div>
        </EmployerShell>
      </Frame>
    </div>
  );
}

/* ---- 14. Candidate desktop app: sign-in and provisioning ---------------------------- */

export function DesktopSignIn() {
  return (
    <div className={v.root}>
      <Frame label="Example: the Fydell desktop app sign-in screen. The candidate signs in with the email their invitation was sent to." title="fydell">
        <div className={a.desk}>
          <div className={a.deskCard}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 510, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              <Mark size={15} /> fydell
            </span>
            <div>
              <h4>Sign in to start your simulation</h4>
              <p style={{ margin: "6px 0 0" }}>Use the email address your invitation was sent to.</p>
            </div>
            <label className={a.field}>
              Email
              <span className={a.input}>candidate04@example.com</span>
            </label>
            <span className={a.btnDark} style={{ justifyContent: "center", height: 36 }}>
              Email me a sign-in link
            </span>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-quaternary)" }}>
              Nothing is recorded until you read and accept what the simulation records.
            </p>
          </div>
        </div>
      </Frame>
    </div>
  );
}

export function DesktopProvisioning() {
  const steps: [string, "done" | "now" | "todo", string][] = [
    ["Download the project snapshot", "done", "4.2 MB"],
    ["Verify the snapshot checksum", "done", "sha256 ok"],
    ["Create an isolated environment", "done", "Python 3.12"],
    ["Install dependencies", "now", "18 of 29"],
    ["Run the existing tests", "todo", ""],
  ];
  return (
    <div className={v.root}>
      <Frame label="Example: preparing the candidate's workspace. Snapshot downloaded and verified, environment created, dependencies installing, existing tests still to run." title="fydell · Preparing workspace">
        <div className={a.desk}>
          <div className={a.deskCard}>
            <div>
              <h4>Preparing your workspace</h4>
              <p style={{ margin: "6px 0 0" }}>The timer starts when you open the brief, not before.</p>
            </div>
            <div className={a.progress}>
              <i />
            </div>
            <div className={a.steps}>
              {steps.map(([label, state, note]) => (
                <div key={label} className={`${a.stepRow} ${state === "done" ? a.stepDone : ""} ${state === "now" ? a.stepNow : ""}`}>
                  {state === "done" ? <Check size={15} strokeWidth={1.75} /> : state === "now" ? <span className={a.spinner} /> : <span className={a.pending} />}
                  <span>{label}</span>
                  <small>{note}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}
