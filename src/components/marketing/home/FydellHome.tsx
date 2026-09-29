import Link from "next/link";
import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import FydellLogo from "@/components/brand/FydellLogo";
import {
  CtaBand,
  Faq,
  UnifiedFooter,
  UnifiedNav,
} from "@/components/marketing/unified/UnifiedChrome";

/* ============================================================================
   FydellHome, marketing homepage with Linear-grade structure on the unified
   design system (src/styles/marketing-unified.css, imported via UnifiedChrome).

   All product visuals below are static, dense, Linear-style panels built from
   the .u-pv / .u-ev / .u-toggle primitives. No animations, no fake stats.

   Legacy exports (ChapterHead, Features, IntakeVisual, SimulationVisual,
   ReviewVisual, ShareVisual) are kept for /how-it-works and DesktopShowcase.
   ========================================================================== */

/* ------------------------------------------------------------ primitives -- */

type Tok = [text: string, cls: string];
type CodeLine = { n: number; hl?: boolean; segs: Tok[] };

function CodeLines({ lines }: { lines: CodeLine[] }) {
  return (
    <>
      {lines.map((l) => (
        <span key={l.n} className={l.hl ? "ln hl" : "ln"}>
          <span className="ln-no">{l.n}</span>
          <span>
            {l.segs.length ? (
              l.segs.map(([t, c], i) => (
                <span key={i} className={c}>
                  {t}
                </span>
              ))
            ) : (
              " "
            )}
          </span>
        </span>
      ))}
    </>
  );
}

function PvFile({ name, active }: { name: string; active?: boolean }) {
  return (
    <span className={active ? "u-pv-file active" : "u-pv-file"}>{name}</span>
  );
}

/** Dark-pane test row (for .u-pv-dark). */
function PvTest({ name, pass, dur }: { name: string; pass: boolean; dur: string }) {
  return (
    <div className="u-pv-test">
      <span className={pass ? "pass" : "fail"}>{pass ? "✓" : "✗"}</span>
      <span>{name}</span>
      <span className="dur">{dur}</span>
    </div>
  );
}

/** Light-pane test row. */
function TestRow({ name, pass, dur }: { name: string; pass: boolean; dur: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 0",
        fontSize: 13,
        fontFamily: "var(--u-mono)",
      }}
    >
      <span style={{ color: pass ? "var(--u-accent)" : "#c2410c", fontWeight: 700 }}>
        {pass ? "✓" : "✗"}
      </span>
      <span style={{ color: "var(--u-muted)" }}>{name}</span>
      <span style={{ marginLeft: "auto", color: "var(--u-faint)" }}>{dur}</span>
    </div>
  );
}

function Toggle({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="u-toggle-row">
      <span>{label}</span>
      <span
        className={on ? "u-toggle" : "u-toggle off"}
        role="img"
        aria-label={`${label}: ${on ? "on" : "off"}`}
      />
    </div>
  );
}

const SUBHEAD: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--u-faint)",
  margin: "0 0 16px",
};

function PanelHead({ title, chip, chipTone }: { title: string; chip: string; chipTone?: "teal" | "amber" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "20px 24px",
        borderBottom: "1px solid var(--u-line-soft)",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      <span className={chipTone ? `u-chip ${chipTone}` : "u-chip"}>{chip}</span>
    </div>
  );
}

/* -------------------------------------------------------------- sections -- */

function Section({
  id,
  tinted,
  children,
}: {
  id?: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={tinted ? "u-section tinted" : "u-section"}>
      <div className="u-wrap">{children}</div>
    </section>
  );
}

function SecHead({
  title,
  desc,
  n,
  label,
  href,
}: {
  title: string;
  desc: ReactNode;
  n?: string;
  label?: string;
  href?: string;
}) {
  return (
    <div className="u-sec-head">
      <h2>{title}</h2>
      <div className="u-sec-desc">
        <p>{desc}</p>
        {n && label && href ? (
          <Link className="u-learn" href={href}>
            <span className="u-learn-num">{n}</span>
            {label}{" "}
            <span className="u-learn-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function FeatList({ items }: { items: string[] }) {
  return (
    <ul className="u-feat-list">
      {items.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------- legacy exports (how-it-works) -- */

export function ChapterHead({
  index,
  label,
  href,
  title,
  copy,
}: {
  index: string;
  label: string;
  href: string;
  title: string;
  copy: string;
}) {
  return <SecHead title={title} desc={copy} n={index} label={label} href={href} />;
}

export function Features({ items, dot }: { items: readonly string[]; dot: string }) {
  return (
    <ul className="u-feat-list" style={{ ["--u-accent" as string]: dot }}>
      {items.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ hero -- */

const HERO_FILES = ["BRIEF.md", "worker.py", "test_worker.py", "requirements.txt", "README.md"];

const HERO_CODE: CodeLine[] = [
  { n: 1, segs: [["import ", "tok-kw"], ["os, time", "tok-pl"]] },
  {
    n: 2,
    segs: [
      ["from ", "tok-kw"],
      ["mailer ", "tok-pl"],
      ["import ", "tok-kw"],
      ["send_receipt, MailerError", "tok-pl"],
    ],
  },
  { n: 3, segs: [] },
  {
    n: 4,
    segs: [
      ["claims ", "tok-pl"],
      ["= ", "tok-pl"],
      ["ClaimStore", "tok-fn"],
      ["(ttl=", "tok-pl"],
      ["300", "tok-num"],
      [")", "tok-pl"],
    ],
  },
  { n: 5, segs: [] },
  { n: 6, segs: [["def ", "tok-kw"], ["process", "tok-fn"], ["(job):", "tok-pl"]] },
  {
    n: 7,
    hl: true,
    segs: [
      ["    ", "tok-pl"],
      ["if not ", "tok-kw"],
      ["claims.acquire", "tok-fn"],
      ["(job.order_id):", "tok-pl"],
    ],
  },
  {
    n: 8,
    segs: [["        ", "tok-pl"], ["return  ", "tok-kw"], ["# already sent", "tok-cm"]],
  },
  { n: 9, segs: [["    ", "tok-pl"], ["try", "tok-kw"], [":", "tok-pl"]] },
  {
    n: 10,
    segs: [["        ", "tok-pl"], ["send_receipt", "tok-fn"], ["(job)", "tok-pl"]],
  },
  {
    n: 11,
    segs: [["    ", "tok-pl"], ["except ", "tok-kw"], ["MailerError", "tok-pl"], [":", "tok-pl"]],
  },
  {
    n: 12,
    segs: [["        ", "tok-pl"], ["claims.release", "tok-fn"], ["(job.order_id)", "tok-pl"]],
  },
  { n: 13, segs: [["        ", "tok-pl"], ["raise", "tok-kw"]] },
  {
    n: 14,
    segs: [["    ", "tok-pl"], ["claims.mark_sent", "tok-fn"], ["(job.order_id)", "tok-pl"]],
  },
];

const HERO_TESTS = [
  { name: "test_single_send", pass: true, dur: "0.21s" },
  { name: "test_timeout_retry", pass: true, dur: "0.34s" },
  { name: "test_concurrent_claims", pass: true, dur: "0.18s" },
  { name: "test_mailer_error_allows_retry", pass: false, dur: "0.42s" },
  { name: "test_double_job_idempotent", pass: true, dur: "0.29s" },
];

function HeroVisual() {
  return (
    <div className="u-hero-visual">
      <div className="u-pv u-pv-dark">
        <div className="u-pv-titlebar">
          <span className="u-pv-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="u-pv-title">Fydell Simulation · retry-safe-jobs</span>
        </div>
        <div className="u-pv-body">
          <div className="u-pv-side">
            <p className="u-pv-pane-label">Workspace</p>
            {HERO_FILES.map((f) => (
              <PvFile key={f} name={f} active={f === "worker.py"} />
            ))}
          </div>
          <div className="u-pv-code">
            <CodeLines lines={HERO_CODE} />
          </div>
          <div className="u-pv-side right">
            <p className="u-pv-pane-label">Test run</p>
            {HERO_TESTS.map((t) => (
              <PvTest key={t.name} name={t.name} pass={t.pass} dur={t.dur} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- 1.0 the problem -- */

const PROBLEMS = [
  {
    title: "Résumés are marketing documents.",
    body: "They describe the work. They never show it. The best résumé in the pile is rarely the best engineer. It is the best-written one.",
  },
  {
    title: "Keyword screens filter out the best people.",
    body: "Great engineers with unconventional backgrounds die in the ATS. You are selecting for keyword density, not ability.",
  },
  {
    title: "Take-homes take hours and prove nothing.",
    body: "Candidates burn weekends on toy problems. You cannot tell who wrote the code, so you run the whiteboard anyway and learn even less.",
  },
] as const;

function ProblemVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead title="Hiring pipeline · signal audit" chip="Weak signal" chipTone="amber" />
        <div className="u-ev-row">
          <div className="u-ev-col">
            <h4>Résumé screen</h4>
            <div className="u-ev-item">
              <div className="t">Keyword match</div>
              <div className="m">14 terms · 0 projects read</div>
            </div>
            <div className="u-ev-item">
              <div className="t">What it misses</div>
              <div className="m">ability, judgment, craft</div>
            </div>
          </div>
          <div className="u-ev-col">
            <h4>Take-home</h4>
            <div className="u-ev-item">
              <div className="t">Hours spent</div>
              <div className="m">9 · authorship unknown</div>
            </div>
            <div className="u-ev-item">
              <div className="t">What it misses</div>
              <div className="m">who actually wrote it</div>
            </div>
          </div>
          <div className="u-ev-col">
            <h4>Whiteboard</h4>
            <div className="u-ev-item">
              <div className="t">What it measures</div>
              <div className="m">recall under pressure</div>
            </div>
            <div className="u-ev-item">
              <div className="t">What it misses</div>
              <div className="m">real engineering work</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- 2.0 passport -- */

function PassportVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead title="Engineering Passport" chip="Owned by the engineer" chipTone="teal" />
        <div className="u-cards-2" style={{ padding: 32 }}>
          <div
            style={{
              border: "1px solid var(--u-line-soft)",
              borderRadius: 16,
              padding: 28,
              background: "var(--u-bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <FydellLogo height={22} />
              <span style={{ fontSize: 12, fontFamily: "var(--u-mono)", color: "var(--u-faint)" }}>
                v1
              </span>
            </div>
            <p
              style={{
                fontSize: 26,
                fontWeight: 700,
                margin: "0 0 4px",
                letterSpacing: "-0.01em",
              }}
            >
              Candidate 01
            </p>
            <p style={{ fontSize: 14, color: "var(--u-muted)", margin: "0 0 20px" }}>
              Backend developer · Python
            </p>
            <div
              style={{
                display: "flex",
                gap: 28,
                padding: "16px 0",
                borderTop: "1px solid var(--u-line-soft)",
                borderBottom: "1px solid var(--u-line-soft)",
                marginBottom: 16,
              }}
            >
              {[
                ["2", "projects"],
                ["4", "findings"],
                ["1", "simulation"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontSize: 12, color: "var(--u-faint)" }}>{l}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: 0 }}>
              Private until shared
            </p>
          </div>
          <div>
            <p style={SUBHEAD}>Share controls</p>
            <div
              style={{
                border: "1px solid var(--u-line-soft)",
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--u-bg)",
              }}
            >
              <Toggle on label="Projects and contribution statements" />
              <Toggle on label="Source-linked findings" />
              <Toggle on label="Simulation results" />
              <Toggle on={false} label="Email address" />
            </div>
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "12px 0 0" }}>
              The engineer decides what each employer sees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- 3.0 simulations -- */

const SESSION_SEGS = [
  { label: "Read brief", w: 13, note: "0:00" },
  { label: "Reproduced the bug", w: 22, note: "0:06" },
  { label: "Claim before send", w: 30, note: "0:16" },
  { label: "Tests · 4 of 5", w: 26, note: "0:31" },
  { label: "AI patch rejected", w: 14, note: "0:38" },
  { label: "Submitted", w: 16, note: "0:44" },
];

function SegBar({ label, w, note }: { label: string; w: number; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span style={{ width: 148, fontSize: 13, color: "var(--u-muted)", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          flex: 1,
          height: 10,
          borderRadius: 9999,
          background: "var(--u-bg-2)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${w}%`,
            background: "var(--u-accent)",
            borderRadius: 9999,
          }}
        />
      </span>
      <span
        style={{
          width: 40,
          fontSize: 12,
          fontFamily: "var(--u-mono)",
          color: "var(--u-faint)",
          textAlign: "right",
        }}
      >
        {note}
      </span>
    </div>
  );
}

export function SimulationVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead
          title="Incident brief · retry-safe-jobs"
          chip="Disclosed before start"
          chipTone="teal"
        />
        <div className="u-cards-2" style={{ padding: 32 }}>
          <div>
            <p style={SUBHEAD}>The brief</p>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: "0 0 20px", maxWidth: "40ch" }}>
              Customers receive the same receipt twice when a job is retried after a timeout.
              Make sending safe to retry.
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {[
                "A working codebase, not a toy problem",
                "5 tests must stay green",
                "An AI patch is proposed mid-session. Review it.",
                "48 minutes on a disclosed timeline",
              ].map((c) => (
                <li
                  key={c}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 14,
                    color: "var(--u-muted)",
                    padding: "6px 0",
                  }}
                >
                  <span style={{ color: "var(--u-accent)", fontWeight: 700 }}>✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p style={SUBHEAD}>Recorded session · 0:48</p>
            {SESSION_SEGS.map((s) => (
              <SegBar key={s.label} label={s.label} w={s.w} note={s.note} />
            ))}
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "16px 0 0" }}>
              Candidates see exactly what is recorded before they start.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- legacy intake board -- */

const INTAKE_COLS = [
  {
    name: "Selected",
    repos: [{ name: "billing-webhooks", meta: "EP-104 · TypeScript · 38 files" }],
  },
  {
    name: "Analyzing",
    repos: [{ name: "vector-search-api", meta: "EP-103 · Python · 63 files" }],
  },
  {
    name: "Evidence ready",
    repos: [{ name: "receipts-service", meta: "EP-101 · Python · 46 files · cited" }],
  },
  {
    name: "Needs attention",
    repos: [
      { name: "ledger-cli", meta: "EP-102 · Go · structure only" },
      { name: "infra-modules", meta: "EP-105 · HCL · structure only" },
    ],
  },
];

export function IntakeVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead title="Import from GitHub" chip="5 repositories" />
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
              gap: 16,
              padding: 24,
              minWidth: 760,
            }}
          >
            {INTAKE_COLS.map((c) => (
              <div key={c.name}>
                <p style={{ ...SUBHEAD, marginBottom: 12 }}>{c.name}</p>
                {c.repos.map((r) => (
                  <div key={r.name} className="u-ev-item">
                    <div className="t">{r.name}</div>
                    <div className="m">{r.meta}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 4.0 review -- */

const FINDINGS = [
  { title: "Claim acquired before send", meta: "worker.py:8 · snapshot 9c2e1f0", dot: "var(--u-accent)" },
  { title: "Mailer errors release the claim", meta: "worker.py:12-14", dot: "var(--u-amber)" },
  { title: "AI patch rejected with reason", meta: "timeline 0:38", dot: "var(--u-ink)" },
];

const REVIEW_CODE: CodeLine[] = [
  { n: 6, segs: [["def ", "tok-kw"], ["process", "tok-fn"], ["(job):", "tok-pl"]] },
  { n: 7, segs: [] },
  {
    n: 8,
    hl: true,
    segs: [
      ["    ", "tok-pl"],
      ["if not ", "tok-kw"],
      ["claims.acquire", "tok-fn"],
      ["(job.order_id):", "tok-pl"],
    ],
  },
  {
    n: 9,
    segs: [["        ", "tok-pl"], ["return  ", "tok-kw"], ["# already sent", "tok-cm"]],
  },
  {
    n: 10,
    segs: [["    ", "tok-pl"], ["claims.mark_sent", "tok-fn"], ["(job.order_id)", "tok-pl"]],
  },
];

const REVIEW_TESTS = [
  { name: "test_single_send", pass: true, dur: "0.21s" },
  { name: "test_timeout_retry", pass: true, dur: "0.34s" },
  { name: "test_concurrent_claims", pass: true, dur: "0.18s" },
  { name: "test_mailer_error_allows_retry", pass: false, dur: "0.42s" },
  { name: "test_double_job_idempotent", pass: true, dur: "0.29s" },
];

export function ReviewVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead title="Candidate 01 · evidence report" chip="In review" chipTone="amber" />
        <div className="u-ev-row">
          <div className="u-ev-col">
            <h4>Findings</h4>
            {FINDINGS.map((f) => (
              <div key={f.title} className="u-ev-item">
                <div
                  className="t"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: f.dot,
                      flexShrink: 0,
                    }}
                  />
                  {f.title}
                </div>
                <div className="m">{f.meta}</div>
              </div>
            ))}
          </div>
          <div className="u-ev-col">
            <h4>Cited code</h4>
            <div
              className="u-pv-code"
              style={{
                border: "1px solid var(--u-line-soft)",
                borderRadius: 10,
                background: "var(--u-dark)",
                color: "#d7dce2",
                padding: "14px 16px",
                fontSize: 12.5,
              }}
            >
              <CodeLines lines={REVIEW_CODE} />
            </div>
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "12px 0 0" }}>
              Every claim opens to the file and lines behind it.
            </p>
          </div>
          <div className="u-ev-col">
            <h4>Recorded test run</h4>
            {REVIEW_TESTS.map((t) => (
              <TestRow key={t.name} name={t.name} pass={t.pass} dur={t.dur} />
            ))}
            <p style={{ ...SUBHEAD, margin: "20px 0 12px" }}>Team decision</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="u-chip teal">Advance to interview</span>
              <span className="u-chip">Hold</span>
              <span className="u-chip">Decline</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "12px 0 0" }}>
              Logged for the team. Nothing is sent to the candidate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- evidence chain (replaces the EV trio) -- */

const CHAIN = [
  { step: "Brief", title: "Incident described", meta: "disclosed 0:00" },
  { step: "Diff", title: "Claim before send", meta: "+14 −3 · 9c2e1f0" },
  { step: "Test run", title: "4 of 5 passed", meta: "recorded 0:42" },
  { step: "Receipt", title: "Evidence frozen", meta: "rev 9c2e1f0" },
];

function EvidenceChain() {
  return (
    <div className="u-visual" style={{ marginTop: 24 }}>
      <div className="u-pv u-pv-light" style={{ padding: 32 }}>
        <p style={SUBHEAD}>Chain of custody</p>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {CHAIN.map((c, i) => (
            <Fragment key={c.step}>
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  style={{
                    alignSelf: "center",
                    color: "var(--u-faint)",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  →
                </span>
              ) : null}
              <div
                style={{
                  flex: "1 0 200px",
                  border: "1px solid var(--u-line-soft)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  background: "var(--u-bg)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--u-accent-deep)",
                    margin: "0 0 8px",
                  }}
                >
                  {c.step}
                </p>
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{c.title}</p>
                <p
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--u-mono)",
                    color: "var(--u-faint)",
                    margin: 0,
                  }}
                >
                  {c.meta}
                </p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 5.0 sharing -- */

export function ShareVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-light">
        <PanelHead title="Scoped links" chip="Revocable in one click" chipTone="teal" />
        <div className="u-cards-2" style={{ padding: 32 }}>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <p style={{ fontWeight: 700, margin: 0 }}>Link for Employer A</p>
              <span className="u-chip">Revoke</span>
            </div>
            <div
              style={{
                border: "1px solid var(--u-line-soft)",
                borderRadius: 12,
                overflow: "hidden",
                background: "var(--u-bg)",
              }}
            >
              <Toggle on label="Projects and contribution statements" />
              <Toggle on label="Source-linked findings" />
              <Toggle on label="Simulation results" />
              <Toggle on={false} label="Email address" />
            </div>
            <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "12px 0 0" }}>
              Scoped to one employer. Revoke any time.
            </p>
          </div>
          <div>
            <p style={SUBHEAD}>What Employer A sees</p>
            <div
              style={{
                border: "1px dashed var(--u-line)",
                borderRadius: 12,
                padding: 20,
                background: "var(--u-bg)",
              }}
            >
              {[
                "Projects and contribution statements",
                "Source-linked findings",
                "Simulation results",
              ].map((l) => (
                <p
                  key={l}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 14,
                    color: "var(--u-muted)",
                    margin: "0 0 10px",
                  }}
                >
                  <span style={{ color: "var(--u-accent)", fontWeight: 700 }}>✓</span>
                  {l}
                </p>
              ))}
              <p style={{ fontSize: 13, color: "var(--u-faint)", margin: "12px 0 0" }}>
                Email stays hidden. Nothing else is shared on this link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 6.0 desktop -- */

const BRIEF_LINES: CodeLine[] = [
  { n: 1, segs: [["RETRY-SAFE JOBS", "tok-pl"]] },
  { n: 2, segs: [] },
  { n: 3, segs: [["Customers receive the same receipt twice", "tok-pl"]] },
  { n: 4, segs: [["when a job is retried after a timeout.", "tok-pl"]] },
  { n: 5, segs: [] },
  { n: 6, segs: [["Tasks", "tok-fn"]] },
  { n: 7, segs: [["- Reproduce the duplicate send", "tok-pl"]] },
  { n: 8, segs: [["- Make retries safe to re-run", "tok-pl"]] },
  { n: 9, segs: [["- Keep all 5 tests green", "tok-pl"]] },
  { n: 10, segs: [] },
  { n: 11, segs: [["An AI patch will be proposed at 0:31.", "tok-cm"]] },
  { n: 12, segs: [["Review it like a teammate would.", "tok-cm"]] },
];

function DesktopVisual() {
  return (
    <div className="u-visual">
      <div className="u-pv u-pv-dark">
        <div className="u-pv-titlebar">
          <span className="u-pv-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="u-pv-title">Fydell Desktop · retry-safe-jobs</span>
        </div>
        <div className="u-pv-body">
          <div className="u-pv-side">
            <p className="u-pv-pane-label">Project</p>
            <PvFile name="BRIEF.md" active />
            <PvFile name="worker.py" />
            <PvFile name="test_worker.py" />
            <PvFile name="timeline.log" />
          </div>
          <div className="u-pv-code">
            <CodeLines lines={BRIEF_LINES} />
          </div>
          <div className="u-pv-side right">
            <p className="u-pv-pane-label">Session</p>
            {HERO_TESTS.map((t) => (
              <PvTest key={t.name} name={t.name} pass={t.pass} dur={t.dur} />
            ))}
            <div style={{ marginTop: 16 }}>
              <span className="u-chip teal">Ready to submit</span>
            </div>
            <p
              style={{
                fontSize: 12,
                fontFamily: "var(--u-mono)",
                color: "#5b6470",
                margin: "12px 0 0",
              }}
            >
              recorded 0:48 · rev 9c2e1f0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- principles -- */

const PRINCIPLES = [
  {
    index: "P.1",
    title: "Record the work, not the worker.",
    body: "Candidates see everything that is captured before they begin. No keystroke logging. No screen recording. The simulation is the assessment.",
  },
  {
    index: "P.2",
    title: "Every claim opens to its source.",
    body: "A finding without a file, a commit, and a line number is an opinion. Fydell links each one, so reviewers check instead of trusting.",
  },
  {
    index: "P.3",
    title: "Decisions stay human.",
    body: "Fydell assembles the evidence. Your team makes the call. No scores, no auto-reject, no black-box ranking.",
  },
] as const;

/* -------------------------------------------------------------------- faq -- */

const HOME_FAQ = [
  {
    q: "Are the examples on this page real?",
    a: "The walkthroughs use fictional example data, clearly labeled. No real candidate is behind them. The scenarios, prices, and controls are real product capabilities. The demo data is illustration, not evidence.",
  },
  {
    q: "What does Fydell cost?",
    a: "Engineers pay nothing, ever. Hiring teams pay $49 per completed simulation on Starter, or $399 a month with 10 simulations included on Team. Invites, expired links, and abandoned attempts are never billed.",
  },
  {
    q: "Does Fydell replace interviews?",
    a: "No. Fydell gives reviewers evidence to read before the interview: cited findings, recorded test runs, and questions drawn from the candidate's own work. No score, no ranking, no auto-reject. Your team makes the call.",
  },
  {
    q: "Is this surveillance software?",
    a: "No. No keystroke logging, no screen recording, no webcam. Candidates see exactly what is recorded before they start. The simulation assesses the work, not the worker.",
  },
  {
    q: "Which roles and languages are covered?",
    a: "Simulations cover backend engineering today, starting with the webhook retry incident. Repository analysis is deepest in Python, with more roles and languages on the way.",
  },
  {
    q: "When can I download the desktop app?",
    a: "Not yet. Installers publish with v0.1.0 and are not live. The download page tracks the status honestly.",
  },
  {
    q: "Who owns the evidence?",
    a: "The engineer. A passport is private until shared. Each link is scoped to one employer and previewable before it is sent. Access can be revoked in one click.",
  },
];

/* ------------------------------------------------------------------- page -- */

export default function FydellHome() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/" />
      <main id="main">
        <header className="u-hero">
          <div className="u-wrap">
            <div className="u-hero-grid">
              <div>
                <p className="u-eyebrow">Hiring infrastructure</p>
                <h1>
                  A new way to hire. A better way to{" "}
                  <span className="u-teal">get hired.</span>
                </h1>
              </div>
              <div className="u-hero-sub">
                <p>Real engineering simulations. You review the code, not the résumé.</p>
                <div className="u-hero-ctas">
                  <Link href="/get-started" className="u-btn u-btn-dark">
                    Get started
                  </Link>
                  <Link href="/demo" className="u-btn u-btn-light">
                    Explore demo
                  </Link>
                </div>
              </div>
            </div>
            <HeroVisual />
          </div>
        </header>

        <Section id="problem">
          <SecHead
            title="Signals nobody trusts."
            desc="Résumés describe the work. They never show it. Screens and take-homes filter for wording and weekends, not ability."
            n="1.0"
            label="Employers"
            href="/employers"
          />
          <ProblemVisual />
          <div className="u-cards-3" style={{ marginTop: 24 }}>
            {PROBLEMS.map((p) => (
              <div key={p.title} className="u-card">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="passports" tinted>
          <SecHead
            title="A passport you own."
            desc="Import your GitHub repositories. Fydell pins a commit, cites every finding, and states plainly what it could not assess."
            n="2.0"
            label="Passport"
            href="/passport/new"
          />
          <PassportVisual />
          <FeatList
            items={["GitHub import", "Commit pinning", "Coverage report", "Contribution statements"]}
          />
        </Section>

        <Section id="simulations">
          <SecHead
            title="Real incidents. Real code."
            desc="Candidates work a realistic incident in a working codebase, with tests and an AI-written patch to review. Every action lands on a disclosed timeline."
            n="3.0"
            label="Simulations"
            href="/developers"
          />
          <SimulationVisual />
          <FeatList
            items={["Working codebases", "Recorded test runs", "AI patch review", "Disclosed timeline"]}
          />
        </Section>

        <Section id="review" tinted>
          <SecHead
            title="Decide on evidence."
            desc="Reviewers open each finding to the code behind it, read the recorded test run, and log a decision the whole team can audit."
            n="4.0"
            label="Review"
            href="/product"
          />
          <ReviewVisual />
          <EvidenceChain />
          <p className="u-visual-caption">
            One chain of custody, from brief to frozen receipt. Each step opens to its source.
          </p>
          <FeatList
            items={["Source citations", "Test records", "Decision log", "Interview prompts"]}
          />
        </Section>

        <Section id="sharing">
          <SecHead
            title="Stay in control."
            desc="A passport is private until shared. Each link is scoped to one employer, previewable before it is sent, and revocable in one click."
            n="5.0"
            label="Sharing"
            href="/product"
          />
          <ShareVisual />
          <FeatList
            items={["Scoped links", "Recipient preview", "One-click revoke", "Export"]}
          />
        </Section>

        <Section id="desktop" tinted>
          <SecHead
            title="The simulation, on your machine."
            desc="The Fydell desktop client runs the whole simulation locally: brief, editor, tests, and timeline in one workspace."
            n="6.0"
            label="Desktop app"
            href="/download"
          />
          <DesktopVisual />
          <p className="u-visual-caption">Installers publish with v0.1.0.</p>
          <FeatList
            items={["Local workspace", "Full editor", "Recorded timeline", "One-click submit"]}
          />
        </Section>

        <Section id="principles">
          <SecHead
            title="Evidence you can inspect."
            desc="Three rules shape what Fydell records and what it shows."
          />
          <div className="u-cards-3">
            {PRINCIPLES.map((p) => (
              <div key={p.index} className="u-card">
                <span className="u-step">{p.index}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="faq" tinted>
          <SecHead
            title="Honest answers."
            desc="Straight answers about cost, privacy, and what Fydell records."
          />
          <Faq items={HOME_FAQ} />
        </Section>
      </main>
      <CtaBand />
      <UnifiedFooter />
    </div>
  );
}
