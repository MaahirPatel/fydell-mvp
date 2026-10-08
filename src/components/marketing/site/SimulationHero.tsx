import type { CSSProperties } from "react";
import {
  ArrowUp,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clock3,
  Ellipsis,
  FileCode2,
  FileText,
  FlaskConical,
  FolderTree,
  Link2,
  ListChecks,
  Maximize2,
  MessagesSquare,
  Minus,
  Paperclip,
  Search,
  SquarePen,
  Upload,
  X,
} from "lucide-react";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import s from "./sim-hero.module.css";

const LEAD = SCENARIO.teammates[0];
const PARTNER = SCENARIO.teammates[1];
const ANSWER = SCENARIO.clarificationRules.find((r) => r.id === "temporary_vs_permanent")?.answer ?? "";
const UPDATE = SCENARIO.requirementUpdate;
const UPDATE_EXCERPT = UPDATE ? UPDATE.body.split(". ").slice(0, 2).join(". ") + "." : "";
const ELAPSED = UPDATE?.releaseAfterMinutes ?? 20;
const LEFT = `${SCENARIO.defaultAllowedMinutes - ELAPSED - 1}:48 left`;

const NAV = [
  { label: "Brief", icon: FileText },
  { label: "Team thread", icon: MessagesSquare, badge: "2" },
  { label: "Tasks", icon: ListChecks },
  { label: "Files", icon: FolderTree },
  { label: "Tests", icon: FlaskConical },
  { label: "Submission", icon: Upload },
] as const;

/** The scenario's public tests, part-way through an example attempt. */
const RUN = [
  { name: "test_success_marks_delivered", pass: true },
  { name: "test_server_error_schedules_backoff", pass: true },
  { name: "test_gone_endpoint_is_not_retried", pass: false },
  { name: "test_idempotency_key_is_stable_across_retries", pass: true },
] as const;
const PASSED = RUN.filter((t) => t.pass).length;

const CHANGES = [
  { path: "webhooks/dispatcher.py", add: 18, del: 9 },
  { path: "tests/test_dispatcher.py", add: 4, del: 1 },
] as const;
const ADDED = CHANGES.reduce((n, c) => n + c.add, 0);
const REMOVED = CHANGES.reduce((n, c) => n + c.del, 0);

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("");

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * The candidate's side of a Fydell simulation, drawn in the structure of an
 * issue tracker: workspace sidebar, the incident with its activity, and the
 * team thread docked on the right. Scenario facts (company, teammates, brief,
 * replies, the requirement update and the public tests) come from the shipped
 * `backend-webhook-retry` definition; the timings and diff are example data.
 */
export default function SimulationHero() {
  return (
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
          <ChevronDown aria-hidden size={13} className={s.dim} />
          <span className={s.wsTools}>
            <Search aria-hidden size={14} />
            <span className={s.compose}>
              <SquarePen aria-hidden size={13} />
            </span>
          </span>
        </div>
        <ul className={s.nav}>
          {NAV.map(({ label, icon: Icon, ...rest }) => (
            <li key={label} className={s.navItem}>
              <Icon aria-hidden size={15} className={s.navIcon} />
              {label}
              {"badge" in rest ? <span className={s.badge}>{rest.badge}</span> : null}
            </li>
          ))}
        </ul>
        <p className={s.sideLabel}>Incident</p>
        <ul className={s.nav}>
          <li className={s.navOn}>
            <span className={s.statusMark} aria-hidden />
            <span className={s.navText}>INC-2291 Webhook retry storm</span>
          </li>
          <li className={`${s.navItem} ${s.enter} ${s.arrive}`} style={at(1500)}>
            <span className={s.updateMark} aria-hidden />
            <span className={s.navText}>Requirement update</span>
          </li>
        </ul>
        <div className={s.sideFoot}>
          <span className={s.footLabel}>{SCENARIO.title}</span>
          <span className={s.footMeta}>Python · {SCENARIO.defaultAllowedMinutes} minutes</span>
        </div>
      </aside>

      <div className={s.main}>
        <div className={s.bar}>
          <span className={s.statusMark} aria-hidden />
          <span className={s.key}>INC-2291</span>
          <span className={s.barTitle}>Webhook dispatcher retry storm</span>
          <span className={s.barRight}>
            <span className={s.pill}>
              <span className={s.pillDot} aria-hidden />
              In progress
            </span>
            <span className={s.clock}>
              <Clock3 aria-hidden size={13} />
              {LEFT}
            </span>
            <span className={s.iconBtn} aria-hidden>
              <Link2 size={14} />
            </span>
            <span className={s.iconBtn} aria-hidden>
              <Ellipsis size={14} />
            </span>
            <span className={s.example}>Example</span>
          </span>
        </div>

        <div className={s.body}>
          <div className={s.issue}>
            <p className={s.title}>Webhook dispatcher retry storm</p>
            <p className={s.desc}>
              Last week the dispatcher in <code className={s.code}>webhooks/dispatcher.py</code> retried failed deliveries in a tight loop and flooded
              merchants. Fix how it retries, gives up and identifies deliveries, without changing the public interface in{" "}
              <code className={s.code}>README.md</code>.
            </p>
            <ul className={s.props}>
              <li>{SCENARIO.starterRoot}</li>
              <li>Python, standard library</li>
              <li>{RUN.length} public tests</li>
            </ul>

            <p className={s.activityHead}>Activity</p>
            <ol className={s.activity}>
              <li className={`${s.event} ${s.enter}`} style={at(200)}>
                <span className={s.avatar} data-who="lead" aria-hidden>
                  {initials(LEAD.name)}
                </span>
                <span>
                  <b>{LEAD.name}</b> opened INC-2291 and posted the brief <span className={s.time}>· {ELAPSED} min ago</span>
                </span>
              </li>
              <li className={`${s.event} ${s.enter}`} style={at(450)}>
                <span className={s.eventIcon} aria-hidden>
                  <FlaskConical size={13} />
                </span>
                <span>
                  <b>You</b> ran the public tests: {PASSED} passed, {RUN.length - PASSED} failed <span className={s.time}>· 6 min ago</span>
                </span>
              </li>
              <li className={`${s.tests} ${s.enter}`} style={at(600)}>
                {RUN.map((t) => (
                  <span key={t.name} className={s.testRow}>
                    {t.pass ? <CircleCheck aria-hidden size={13} className={s.pass} /> : <CircleX aria-hidden size={13} className={s.fail} />}
                    <span className={s.testName}>{t.name}</span>
                  </span>
                ))}
              </li>
              {UPDATE ? (
                <li className={`${s.card} ${s.enter} ${s.arrive}`} style={at(1500)}>
                  <span className={s.cardHead}>
                    <span className={s.avatar} data-who="partner" aria-hidden>
                      {initials(PARTNER.name)}
                    </span>
                    <b>{PARTNER.name}</b>
                    <span className={s.time}>{PARTNER.title} · just now</span>
                  </span>
                  <span className={s.cardText}>{UPDATE_EXCERPT}</span>
                </li>
              ) : null}
              {UPDATE ? (
                <li className={`${s.event} ${s.enter}`} style={at(1650)}>
                  <span className={s.eventIcon} data-tone="update" aria-hidden>
                    <span className={s.updateMark} />
                  </span>
                  <span>
                    Requirement update: <b>{UPDATE.title}</b> <span className={s.time}>· just now</span>
                  </span>
                </li>
              ) : null}
            </ol>
          </div>

          <div className={s.dock}>
            <div className={s.panel}>
              <div className={s.panelHead}>
                <MessagesSquare aria-hidden size={14} className={s.dim} />
                <span className={s.panelTitle}>Team thread</span>
                <span className={s.simulated}>Simulated</span>
                <span className={s.panelTools} aria-hidden>
                  <Minus size={14} />
                  <Maximize2 size={13} />
                  <X size={14} />
                </span>
              </div>

              <div className={s.thread}>
                <p className={`${s.mine} ${s.enter}`} style={at(700)}>
                  Which status codes should we treat as temporary?
                </p>
                <p className={`${s.context} ${s.enter}`} style={at(800)}>
                  <FileText aria-hidden size={13} />
                  INCIDENT.md added to context
                </p>
                <div className={`${s.reply} ${s.enter}`} style={at(950)}>
                  <p className={s.replyHead}>
                    <span className={s.avatar} data-who="lead" aria-hidden>
                      {initials(LEAD.name)}
                    </span>
                    <b>{LEAD.name}</b>
                    <span className={s.time}>{LEAD.title}</span>
                  </p>
                  <p className={s.replyText}>{ANSWER}</p>
                </div>
                <div className={`${s.diff} ${s.enter}`} style={at(1150)}>
                  <div className={s.diffHead}>
                    <span>
                      <b>Changed {CHANGES.length} files</b> <span className={s.add}>+{ADDED}</span> <span className={s.del}>−{REMOVED}</span>
                    </span>
                    <span className={s.runBtn}>Run tests</span>
                  </div>
                  {CHANGES.map((c) => (
                    <p key={c.path} className={s.diffRow}>
                      <FileCode2 aria-hidden size={13} className={s.dim} />
                      <span className={s.diffPath}>{c.path}</span>
                      <span className={s.add}>+{c.add}</span>
                      <span className={s.del}>−{c.del}</span>
                    </p>
                  ))}
                  <p className={s.diffCmd}>{SCENARIO.testCommands.unix}</p>
                </div>
              </div>

              <div className={s.composer}>
                <p className={s.placeholder}>Message the team…</p>
                <div className={s.composerRow}>
                  <span className={s.to}>
                    {LEAD.name.split(" ")[0]}, {PARTNER.name.split(" ")[0]}
                  </span>
                  <span className={s.composerTools} aria-hidden>
                    <Paperclip size={14} />
                    <span className={s.send}>
                      <ArrowUp size={13} />
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
