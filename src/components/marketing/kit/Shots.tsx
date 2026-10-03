import type { CSSProperties, ReactNode } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Code2,
  FileCode2,
  FilePlus2,
  FileText,
  FlaskConical,
  Folder,
  Link2,
  MessageSquare,
  Pencil,
  Send,
  Terminal,
  Upload,
  Users,
  X,
} from "lucide-react";
import s from "./shots.module.css";

/*
 * Every shot is example data from the first simulation, INC-2291
 * (backend-webhook-retry). Teammate lines are the scenario's own answers.
 */

type Tok = string | [keyof typeof TOK, string];
const TOK = { kw: s.kw, fn: s.fn, st: s.st, nu: s.nu, cm: s.cm } as const;

/** Entrance order for rows that animate in one after another. */
function stagger(i: number): CSSProperties {
  return { ["--i" as string]: i };
}

/** The Fydell ring mark, as it appears in the product chrome. */
function Mark({ size = 16 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/fydell-mark.png" alt="" aria-hidden width={Math.round(size * 1.44)} height={size} className={s.mark} draggable={false} />
  );
}

function Line({ n, kind, cursor, toks }: { n: number; kind?: "add" | "del"; cursor?: boolean; toks: Tok[] }) {
  return (
    <div className={`${s.ln} ${kind === "add" ? s.add : kind === "del" ? s.del : ""}`}>
      <span>{n}</span>
      <span>{kind === "add" ? "+" : kind === "del" ? "−" : ""}</span>
      <span className={cursor ? s.cursor : undefined}>
        {toks.map((t, i) => (typeof t === "string" ? t : <span key={i} className={TOK[t[0]]}>{t[1]}</span>))}
      </span>
    </div>
  );
}

function Msg({ av, tone, who, role, time, children }: { av: string; tone: "blue" | "red" | "you"; who: string; role?: string; time: string; children: ReactNode }) {
  return (
    <div className={s.msg}>
      <span className={`${s.av} ${tone === "blue" ? s.avBlue : tone === "red" ? s.avRed : s.avYou}`}>{av}</span>
      <div>
        <p className={s.who}>
          {who} <span>{role ? `${role} · ` : ""}{time}</span>
        </p>
        <p className={s.text}>{children}</p>
      </div>
    </div>
  );
}

function RetryAfterUpdate() {
  return (
    <div className={s.update}>
      <p className={s.updateKicker}>
        <Bell size={11} aria-hidden /> REQUIREMENT UPDATE · 14:18
      </p>
      <p className={s.updateTitle}>Partner request: honor Retry-After</p>
      <p className={s.text}>
        Honor Retry-After on 429 and 503 only. Wait whichever is longer, the header or your normal backoff, and never more
        than 3600 seconds.
      </p>
    </div>
  );
}

function TeamMessages({ compact = false }: { compact?: boolean }) {
  return (
    <div className={s.msgs}>
      <Msg av="Y" tone="you" who="You" time="14:02">
        Which failures should count as temporary?
      </Msg>
      <Msg av="AM" tone="blue" who="Alex Morgan" role="Engineering lead" time="14:02">
        Treat any 5xx, 408 and 429 as temporary, and connection failures too. Everything else, including other 4xx, is
        permanent.
      </Msg>
      <RetryAfterUpdate />
      {compact ? null : (
        <Msg av="JH" tone="red" who="Jordan Hayes" role="Partner support" time="14:21">
          Only whole seconds. If a partner sends a date instead, treat it as unparseable and fall back to the normal
          backoff.
        </Msg>
      )}
    </div>
  );
}

/** The Fydell desktop app, mid-simulation. */
export function DesktopShot() {
  return (
    <div className={`${s.app} ${s.desktop}`}>
      <aside className={s.side}>
        <div className={s.ws}>
          <Mark size={15} />
          <span className={s.wordmark}>fydell</span>
          <span className={s.wsSub}>INC-2291</span>
        </div>
        <span className={s.nav}><FileText aria-hidden /> Brief</span>
        <span className={`${s.nav} ${s.navOn}`}><Code2 aria-hidden /> Code</span>
        <span className={s.nav}><Users aria-hidden /> Team <span className={s.count}>2</span></span>
        <span className={s.nav}><Bell aria-hidden /> Updates <span className={s.dotRed} /></span>
        <span className={s.nav}><Send aria-hidden /> Submit</span>

        <span className={s.group}><Folder size={12} aria-hidden /> webhooks</span>
        <span className={`${s.file} ${s.fileOn}`}><FileCode2 aria-hidden /> dispatcher.py <span className={`${s.flag} ${s.flagM}`}>M</span></span>
        <span className={s.file}><FileCode2 aria-hidden /> retry_policy.py <span className={`${s.flag} ${s.flagA}`}>A</span></span>
        <span className={s.file}><FileCode2 aria-hidden /> models.py</span>
        <span className={s.file}><FileCode2 aria-hidden /> transport.py</span>
        <span className={s.file}><FileCode2 aria-hidden /> clock.py</span>
        <span className={s.group}><Folder size={12} aria-hidden /> tests</span>
        <span className={s.file}><FileCode2 aria-hidden /> test_dispatcher.py <span className={`${s.flag} ${s.flagM}`}>M</span></span>
        <span className={s.file}><FileText aria-hidden /> INCIDENT.md</span>

        <div className={s.sideFoot}><CheckCircle2 aria-hidden /> Setup check passed</div>
      </aside>

      <div className={s.main}>
        <div className={s.bar}>
          <div className={s.crumb}>
            <span>harbor-webhooks</span> / <b>Webhook retry storm</b>
          </div>
          <span className={`${s.pill} ${s.pillRed}`}>Requirement changed</span>
          <div className={s.barRight}>
            <span className={`${s.timer} ${s.mono}`}>31:42 left</span>
            <span className={s.submit}>Submit</span>
          </div>
        </div>

        <div className={s.body}>
          <div className={s.editor}>
            <div className={s.tabs}>
              <span className={`${s.tab} ${s.tabOn}`}><FileCode2 aria-hidden /> dispatcher.py</span>
              <span className={s.tab}><FileCode2 aria-hidden /> retry_policy.py</span>
              <span className={s.tab}><FileText aria-hidden /> INCIDENT.md</span>
            </div>
            <div className={`${s.code} ${s.mono}`}>
              <Line n={30} toks={["    ", ["kw", "def "], ["fn", "_attempt"], "(self, delivery: Delivery, now: ", ["kw", "float"], ") -> ", ["kw", "None"], ":"]} />
              <Line n={31} toks={["        headers = {"]} />
              <Line n={32} toks={["            ", ["st", '"Content-Type"'], ": ", ["st", '"application/json"'], ","]} />
              <Line n={33} kind="del" toks={["            ", ["st", '"Idempotency-Key"'], ": str(uuid.uuid4()),"]} />
              <Line n={33} kind="add" toks={["            ", ["st", '"Idempotency-Key"'], ": delivery.id,"]} />
              <Line n={34} toks={["        }"]} />
              <Line n={35} toks={["        delivery.attempts += ", ["nu", "1"]]} />
              <Line n={36} toks={["        ", ["kw", "try"], ":"]} />
              <Line n={37} toks={["            response = self.transport.send(delivery.endpoint_url, delivery.body(), headers)"]} />
              <Line n={38} toks={["        ", ["kw", "except "], "TransportError:"]} />
              <Line n={39} kind="del" toks={["            delivery.next_attempt_at = now"]} />
              <Line n={39} kind="add" toks={["            self._retry_or_dead_letter(delivery, now, backoff(delivery.attempts))"]} />
              <Line n={40} toks={["            ", ["kw", "return "], "self.store.save(delivery)"]} />
              <Line n={41} toks={[""]} />
              <Line n={42} toks={["        delivery.last_status_code = response.status"]} />
              <Line n={43} toks={["        ", ["kw", "if "], ["nu", "200"], " <= response.status < ", ["nu", "300"], ":"]} />
              <Line n={44} toks={["            delivery.status = DELIVERED"]} />
              <Line n={45} kind="add" toks={["        ", ["kw", "elif "], "is_temporary(response.status):"]} />
              <Line n={46} kind="add" cursor toks={["            wait = ", ["fn", "max"], "(retry_after(response), backoff(delivery.attempts))"]} />
              <Line n={47} kind="add" toks={["            self._retry_or_dead_letter(delivery, now, wait)"]} />
              <Line n={48} kind="add" toks={["        ", ["kw", "else"], ":"]} />
              <Line n={49} kind="add" toks={["            delivery.status = FAILED  ", ["cm", "# permanent: no retry"]]} />
              <Line n={50} toks={["        self.store.save(delivery)"]} />
            </div>
          </div>

          <div className={s.thread}>
            <div className={s.threadHead}>
              <MessageSquare size={14} aria-hidden /> Team <span>Alex, Jordan</span>
            </div>
            <TeamMessages compact />
            <div className={s.compose}>Message the team…</div>
          </div>
        </div>

        <div className={s.status}>
          <span className={s.rec} aria-hidden />
          <span>Recording the disclosed work trail: files, commands, test runs, timing</span>
          <div className={`${s.statusRight} ${s.mono}`}>
            <span>pytest</span>
            <span className={s.ok}>13 passed</span>
            <span className={s.bad}>2 failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The incident brief with the team thread laid over it. */
export function BriefShot() {
  return (
    <div className={`${s.app} ${s.layered}`}>
      <div className={s.doc}>
        <p className={s.docMeta}>
          <Mark size={14} /> INCIDENT.md · opened by Alex Morgan
        </p>
        <p className={s.docTitle}>INC-2291: webhook retry storm</p>
        <p className={s.docH}>What happened</p>
        <p className={s.docP}>
          Between 09:12 and 10:40 UTC the dispatcher sent about 1.9 million requests. Normal volume for that window is under
          40,000. A deleted endpoint returning <span className={`${s.code2} ${s.mono}`}>410 Gone</span> was retried on every
          scheduler tick for 88 minutes.
        </p>
        <p className={s.docH}>What we need</p>
        <ol className={s.docList}>
          <li>Retry temporary failures with exponential backoff: 60 seconds first, doubling, never more than 3600.</li>
          <li>Do not retry permanent failures. End them as <span className={`${s.code2} ${s.mono}`}>failed</span> with the status code.</li>
          <li>After 8 attempts in total, end as <span className={`${s.code2} ${s.mono}`}>dead_lettered</span>.</li>
          <li>Send the delivery <span className={`${s.code2} ${s.mono}`}>id</span> as the same Idempotency-Key on every attempt.</li>
        </ol>
      </div>

      <div className={`${s.card} ${s.threadCard}`}>
        <div className={s.threadHead}>
          <Mark /> Team <span>#inc-2291</span>
        </div>
        <TeamMessages />
        <div className={s.compose}>Message the team…</div>
      </div>
    </div>
  );
}

const TRAIL: { group: string; rows: { t: string; icon: ReactNode; what: ReactNode; meta: string; tone?: "red" | "blue" }[] }[] = [
  {
    group: "Setup",
    rows: [{ t: "13:58", icon: <Terminal aria-hidden />, what: <>Ran <em>python preflight.py</em></>, meta: "Setup check passed" }],
  },
  {
    group: "Investigation",
    rows: [
      { t: "14:00", icon: <FileText aria-hidden />, what: <>Opened <em>INCIDENT.md</em></>, meta: "" },
      { t: "14:01", icon: <FileText aria-hidden />, what: <>Opened <em>logs/dispatcher-2026-09-14.log</em></>, meta: "" },
      { t: "14:02", icon: <MessageSquare aria-hidden />, what: <>Asked Alex which failures are temporary</>, meta: "Team thread", tone: "blue" },
      { t: "14:05", icon: <FlaskConical aria-hidden />, what: <>Ran <em>pytest -q</em></>, meta: "4 passed · 7 failed" },
    ],
  },
  {
    group: "Change",
    rows: [
      { t: "14:09", icon: <Pencil aria-hidden />, what: <>Edited <em>webhooks/dispatcher.py</em></>, meta: "+31 −6" },
      { t: "14:12", icon: <FilePlus2 aria-hidden />, what: <>Created <em>webhooks/retry_policy.py</em></>, meta: "+22" },
      { t: "14:18", icon: <Bell aria-hidden />, what: <>Requirement update: honor Retry-After</>, meta: "Released by the team", tone: "red" },
      { t: "14:31", icon: <FlaskConical aria-hidden />, what: <>Ran <em>pytest -q</em></>, meta: "13 passed · 2 failed" },
    ],
  },
  {
    group: "Submission",
    rows: [{ t: "14:44", icon: <Upload aria-hidden />, what: <>Submitted with a three-part handoff</>, meta: "sha256 3f9c…a21e" }],
  },
];

/** The disclosed work trail, with the notice the candidate saw first. */
export function TrailShot() {
  return (
    <div className={`${s.app} ${s.trail}`}>
      <div className={s.list}>
        {TRAIL.map((g, gi) => (
          <div key={g.group}>
            <div className={s.listHead}>
              {g.group} <span>{g.rows.length}</span>
            </div>
            {g.rows.map((r, ri) => (
              <div key={r.t + r.meta} style={stagger(TRAIL.slice(0, gi).reduce((n, x) => n + x.rows.length, 0) + ri)} className={`${s.row} ${r.tone === "red" ? s.rowRed : r.tone === "blue" ? s.rowBlue : ""}`}>
                <span className={`${s.time} ${s.mono}`}>{r.t}</span>
                {r.icon}
                <span className={s.what}>{r.what}</span>
                <span className={`${s.meta} ${s.mono}`}>{r.meta}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={`${s.card} ${s.consent}`}>
        <p className={s.consentTitle}><Mark /> What this simulation records</p>
        <p className={s.consentSub}>Shown before you start.</p>
        <div className={s.checks}>
          {["File changes in the project", "Commands you run", "Test runs and results", "Timing of each step", "Team messages and your handoff"].map((c) => (
            <span key={c} className={s.check}><Check aria-hidden /> {c}</span>
          ))}
        </div>
        <p className={s.consentFoot}>Nothing outside this list is recorded. The report can only cite what is on it.</p>
      </div>
    </div>
  );
}

const CHECKS: { name: string; ok: boolean }[] = [
  { name: "test_temporary_failure_waits_60s", ok: true },
  { name: "test_backoff_doubles_and_caps_at_3600", ok: true },
  { name: "test_permanent_failure_not_retried", ok: true },
  { name: "test_410_ends_failed_with_status", ok: true },
  { name: "test_dead_letter_after_8_attempts", ok: true },
  { name: "test_idempotency_key_is_delivery_id", ok: true },
  { name: "test_retry_after_honored_on_429", ok: true },
  { name: "test_retry_after_ignored_on_500", ok: true },
  { name: "test_retry_after_header_any_case", ok: false },
  { name: "test_connection_error_is_temporary", ok: true },
];

/** Hidden checks run against the submitted snapshot. */
export function TestsShot() {
  return (
    <div className={`${s.app} ${s.tests}`}>
      <div className={s.col}>
        <div className={s.panelHead}><Mark /> Submission</div>
        <div className={`${s.hash} ${s.mono}`}>
          <b>Archive sha256</b>3f9c1a07e4b2d95c81f6a3e0b7c4d218e9f5a6b3c2d1e0f9a8b7c6d5e4f3a21e
        </div>
        <span className={`${s.file} ${s.fileOn}`}><FileCode2 aria-hidden /> retry_policy.py <span className={`${s.diffStat} ${s.mono} ${s.plus}`}>+22</span></span>
        <span className={s.file}><FileCode2 aria-hidden /> dispatcher.py <span className={`${s.diffStat} ${s.mono}`}><span className={s.plus}>+31</span> <span className={s.minus}>−6</span></span></span>
        <span className={s.file}><FileCode2 aria-hidden /> test_dispatcher.py <span className={`${s.diffStat} ${s.mono} ${s.plus}`}>+48</span></span>
        <span className={s.file}><FileText aria-hidden /> handoff.md <span className={`${s.diffStat} ${s.mono} ${s.plus}`}>3</span></span>
      </div>

      <div className={s.col}>
        <div className={s.panelHead}>
          <FileCode2 size={14} aria-hidden /> webhooks/retry_policy.py <span>new file</span>
        </div>
        <div className={`${s.code} ${s.mono}`}>
          <Line n={1} kind="add" toks={["TEMPORARY = {", ["nu", "408"], ", ", ["nu", "429"], "}"]} />
          <Line n={2} kind="add" toks={[""]} />
          <Line n={3} kind="add" toks={[["kw", "def "], ["fn", "is_temporary"], "(status: ", ["kw", "int"], " | ", ["kw", "None"], ") -> ", ["kw", "bool"], ":"]} />
          <Line n={4} kind="add" toks={["    ", ["kw", "return "], "status ", ["kw", "is None or "], "status ", ["kw", "in "], "TEMPORARY ", ["kw", "or "], "status >= ", ["nu", "500"]]} />
          <Line n={5} kind="add" toks={[""]} />
          <Line n={6} kind="add" toks={[["kw", "def "], ["fn", "backoff"], "(attempt: ", ["kw", "int"], ") -> ", ["kw", "int"], ":"]} />
          <Line n={7} kind="add" toks={["    ", ["kw", "return "], ["fn", "min"], "(", ["nu", "60"], " * ", ["nu", "2"], " ** (attempt - ", ["nu", "1"], "), ", ["nu", "3600"], ")"]} />
          <Line n={8} kind="add" toks={[""]} />
          <Line n={9} kind="add" toks={[["kw", "def "], ["fn", "retry_after"], "(response) -> ", ["kw", "int"], ":"]} />
          <Line n={10} kind="add" toks={["    ", ["kw", "if "], "response.status ", ["kw", "not in "], "(", ["nu", "429"], ", ", ["nu", "503"], "):"]} />
          <Line n={11} kind="add" toks={["        ", ["kw", "return "], ["nu", "0"]]} />
          <Line n={12} kind="add" toks={["    value = response.headers.get(", ["st", '"Retry-After"'], ", ", ["st", '""'], ")"]} />
          <Line n={13} kind="add" toks={["    ", ["kw", "return "], ["fn", "min"], "(", ["fn", "int"], "(value), ", ["nu", "3600"], ") ", ["kw", "if "], "value.isdigit() ", ["kw", "else "], ["nu", "0"]]} />
        </div>
      </div>

      <div className={s.col}>
        <div className={s.panelHead}>
          Submitted checks <span>candidate-submitted</span>
        </div>
        {CHECKS.map((c, i) => (
          <div key={c.name} style={stagger(i)} className={`${s.result} ${c.ok ? s.pass : s.fail}`}>
            {c.ok ? <Check aria-hidden /> : <X aria-hidden />}
            <span className={`${s.name} ${s.mono}`}>{c.name}</span>
            <span className={`${s.meta} ${s.mono}`}>{c.ok ? "pass" : "fail"}</span>
          </div>
        ))}
        <div className={s.summary}>
          <div className={s.summaryBar} aria-hidden>
            <i />
            <i />
          </div>
          <p className={s.summaryText}>
            <b>14 of 15 passed.</b> Run on the submitted snapshot, not on the candidate&apos;s machine.
          </p>
        </div>
      </div>
    </div>
  );
}

function Cite({ children, red = false }: { children: ReactNode; red?: boolean }) {
  return (
    <span className={`${s.cite} ${red ? s.citeRed : ""} ${s.mono}`}>
      <Link2 aria-hidden /> {children}
    </span>
  );
}

/** The report the employer's team writes, and the decision they record. */
export function ReportShot() {
  return (
    <div className={`${s.app} ${s.report}`}>
      <div className={s.reportBody}>
        <p className={s.reportTitle}><Mark size={18} /> Candidate 04 · Webhook retry incident</p>
        <p className={s.reportMeta}>Draft by your team · 3 findings · every finding cites evidence</p>

        <div className={s.finding} style={stagger(0)}>
          <div className={s.findingTop}>
            <span className={s.findingTitle}>Retries use capped exponential backoff</span>
            <span className={s.kind}>Observation</span>
          </div>
          <p className={s.findingText}>Backoff starts at 60 seconds, doubles, and stops at 3600. The hidden check for the cap passed.</p>
          <div className={s.cites}>
            <Cite>retry_policy.py L6–7</Cite>
            <Cite>test_backoff_doubles_and_caps_at_3600</Cite>
          </div>
        </div>

        <div className={s.finding} style={stagger(1)}>
          <div className={s.findingTop}>
            <span className={s.findingTitle}>Asked before assuming which failures are temporary</span>
            <span className={s.kind}>Observation</span>
          </div>
          <p className={s.findingText}>Asked the engineering lead at 14:02, before the first edit, and implemented her answer.</p>
          <div className={s.cites}>
            <Cite>Team thread 14:02</Cite>
            <Cite>retry_policy.py L1–4</Cite>
          </div>
        </div>

        <div className={s.finding} style={stagger(2)}>
          <div className={s.findingTop}>
            <span className={s.findingTitle}>Retry-After is only read in one letter case</span>
            <span className={s.kind}>Gap</span>
          </div>
          <p className={s.findingText}>The update said header names arrive in any case. The code reads one spelling, and one hidden check failed on it. The handoff does not mention it.</p>
          <div className={s.cites}>
            <Cite red>test_retry_after_header_any_case</Cite>
            <Cite>retry_policy.py L12</Cite>
          </div>
        </div>

        <div className={s.prompt}>
          <b>Ask in the interview</b>
          Walk us through how you checked the Retry-After change against the update.
        </div>
      </div>

      <div className={s.decide}>
        <p className={s.decideLabel}>Team decision</p>
        <span className={`${s.option} ${s.optionOn}`}><i aria-hidden /> Advance to interview</span>
        <span className={s.option}><i aria-hidden /> Hold</span>
        <span className={s.option}><i aria-hidden /> Decline</span>
        <div className={s.gate}>
          <CheckCircle2 aria-hidden />
          <span>Every finding cites a file, test, message or handoff answer. The report can be released.</span>
        </div>
        <span className={s.release}>Release report</span>
      </div>
    </div>
  );
}

const RECEIPT_SHA = "3f9c1a07e4b2d95c81f6a3e0b7c4d218e9f5a6b3c2d1e0f9a8b7c6d5e4f3a21e";

const RECEIPT_FILES = [
  { path: "webhooks/retry_policy.py", added: 22, removed: 0 },
  { path: "webhooks/dispatcher.py", added: 31, removed: 6 },
  { path: "tests/test_dispatcher.py", added: 48, removed: 0 },
];

/** Bars drawn from the archive hash, so every receipt's code is its own. */
function HashCode({ sha }: { sha: string }) {
  return (
    <span className={s.barcode} aria-hidden>
      {[...sha].map((ch, i) => {
        const v = parseInt(ch, 16);
        return <i key={i} style={{ width: 1 + (v % 3), marginRight: 1 + (v >> 2) % 2 }} />;
      })}
    </span>
  );
}

/** The receipt the candidate keeps. */
export function ReceiptShot() {
  const max = Math.max(...RECEIPT_FILES.map((f) => f.added + f.removed));
  return (
    <div className={`${s.app} ${s.receipt}`}>
      <div className={s.receiptCard}>
        <div className={s.receiptTop}>
          <p className={s.receiptKicker}>
            <Mark /> Submission receipt
          </p>
          <span className={`${s.receiptNo} ${s.mono}`}>No. 0412</span>
        </div>
        <p className={s.receiptTitle}>Webhook retry incident</p>
        <p className={s.receiptSub}>
          INC-2291 · Backend Engineer · <span className={s.mono}>14:44, 28 Sep 2026</span>
        </p>
        <span className={s.stamp} aria-hidden>
          <b>Sealed</b>
          <span className={s.mono}>14:44:07</span>
        </span>

        <div className={s.receiptStats}>
          <div>
            <span className={s.statLabel}>Worked</span>
            <span className={`${s.statValue} ${s.mono}`}>41m 12s</span>
          </div>
          <div>
            <span className={s.statLabel}>Changed</span>
            <span className={`${s.statValue} ${s.mono}`}>
              <span className={s.plus}>+101</span> <span className={s.minus}>−6</span>
            </span>
          </div>
          <div>
            <span className={s.statLabel}>Checks</span>
            <span className={`${s.statValue} ${s.mono}`}>Queued</span>
          </div>
        </div>

        <ul className={s.receiptFiles}>
          {RECEIPT_FILES.map((f) => (
            <li key={f.path}>
              <FileCode2 aria-hidden />
              <span className={`${s.receiptPath} ${s.mono}`}>{f.path}</span>
              <span className={s.receiptBars} aria-hidden>
                <i className={s.barAdd} style={{ width: `${(f.added / max) * 100}%` }} />
                <i className={s.barDel} style={{ width: `${(f.removed / max) * 100}%` }} />
              </span>
              <span className={`${s.receiptDiff} ${s.mono}`}>
                <span className={s.plus}>+{f.added}</span>
                {f.removed ? <span className={s.minus}> −{f.removed}</span> : null}
              </span>
            </li>
          ))}
        </ul>

        <div className={s.handoff}>
          {["What changed", "What you tested", "What remains"].map((h) => (
            <span key={h} className={s.handoffChip}>
              <Check aria-hidden /> {h}
            </span>
          ))}
        </div>

        <div className={s.perf} aria-hidden />

        <div className={s.receiptFoot}>
          <HashCode sha={RECEIPT_SHA} />
          <p className={`${s.receiptSha} ${s.mono}`}>
            sha256 {RECEIPT_SHA.slice(0, 8)} {RECEIPT_SHA.slice(8, 16)} … {RECEIPT_SHA.slice(-8)}
          </p>
          <p className={s.receiptNote}>Keep this receipt. It proves exactly what you sent, down to the byte.</p>
        </div>
      </div>
    </div>
  );
}
