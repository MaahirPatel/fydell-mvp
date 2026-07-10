"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  BarChart2,
  Flag,
  MessageSquare,
  Send,
  Info,
  Clock,
} from "lucide-react";
import { useSimulationClock } from "@/hooks/useSimulationClock";

// ─── Types ─────────────────────────────────────────────────────────────────

type Stage = "brief" | "data_room" | "forecast" | "assumptions" | "manager_update" | "recommendation";
type FlagAssessment = "looks_reasonable" | "needs_review" | "material_risk";
type Verdict = "go" | "hold" | "revise";

interface ForecastRow {
  key: string;
  label: string;
  value: number;
  editable: boolean;
  computed?: boolean;
  note?: string;
}

interface AssumptionFlag {
  key: string;
  label: string;
  detail: string;
  assessment: FlagAssessment | null;
}

interface Signal {
  label: string;
  captured: boolean;
}

interface Props {
  token: string;
  candidateName?: string | null;
  simulationTitle?: string;
  demo?: boolean;
}

// ─── Meridian FP&A Data ─────────────────────────────────────────────────────

const BRIEF = `You're a FP&A Analyst at Meridian Outdoor Co., a $28M ARR outdoor equipment brand.

The VP of FP&A has asked you to review the Q3 hiring plan before presenting to the CFO tomorrow at 9:00 AM.

The team is requesting 8 new FTEs in Q3 — 3 sales, 2 operations, 2 engineering, 1 marketing — at an estimated fully-loaded cost of $96K per quarter. 

A Go decision means proceeding with all offers immediately. Hold means pausing pending a re-forecast. Revise means modifying the scope or timing.

You have 25 minutes. Start with the data room, model the financial impact, flag your assumptions, then submit your recommendation.`;

const DATA_ROOM = [
  {
    id: "doc-1",
    title: "Q3 Budget Bridge",
    type: "FINANCIAL",
    summary: "Actuals through Q2 vs Q3 projection",
    content: `Q2 Actuals (YTD): Revenue $6.8M · Gross Margin 51% · EBITDA $520K

Q3 Projection:
• Revenue: $4.2M (+18% YoY) — driven by new product launch (Meridian Trail Series) + summer seasonality
• COGS: $2.1M (50% of revenue)
• Gross Profit: $2.1M
• Current OpEx (no new hires): $1.6M
• EBITDA (no new hires): $500K

Key context: Q3 is the company's seasonally strongest quarter historically.`,
  },
  {
    id: "doc-2",
    title: "Headcount Request Summary",
    type: "HR",
    summary: "8 FTE request — role breakdown and costs",
    content: `Requesting 8 FTEs by August 15 to support Q3 growth:

Role breakdown:
• 3 × Sales Representatives — OTE $80K/yr, fully loaded $104K/yr
• 2 × Operations Analysts — $65K/yr, fully loaded $85K/yr  
• 2 × Software Engineers — $110K/yr, fully loaded $143K/yr
• 1 × Marketing Manager — $90K/yr, fully loaded $117K/yr

Total annualized cost: ~$384K
Q3 fully-loaded cost: ~$96K (partial quarter, Aug 15 start)

Note: Sales reps typically require 60–90 days ramp before full productivity.`,
  },
  {
    id: "doc-3",
    title: "Revenue Forecast Assumptions",
    type: "FORECAST",
    summary: "Growth assumptions underlying Q3 forecast",
    content: `Q3 Revenue Forecast: $4.2M assumes 18% YoY growth

Basis:
• Trail Series product launch contribution: ~$400K estimated
• Channel mix shift to DTC (+3 pts margin benefit)
• Historical Q3 growth: 12–15% range over past 3 years

Sensitivity:
• Bear case (12% growth): $3.96M
• Base case (18% growth): $4.2M  
• Bull case (22% growth): $4.5M

⚠️ Note: Pipeline data (see Seasonality doc) suggests potential Q4 slip risk.`,
  },
  {
    id: "doc-4",
    title: "Pipeline & Seasonality Data",
    type: "PIPELINE",
    summary: "Current sales pipeline and Q3/Q4 coverage",
    content: `Q3 Sales Pipeline:
• Total pipeline: $7.2M (1.7x coverage on $4.2M target)
• Confirmed/closed: $2.8M
• Late-stage (>70% probability): $1.6M  
• Mid-stage (30–70% probability): $2.0M
• Early-stage (<30%): $0.8M

⚠️ Risk flag: $800K in late-stage deals have shown >60-day slippage in CRM probability updates — at risk of moving to Q4.

Historical Q3 seasonality: Q3 is +12–15% vs Q2 on average. 2024 base was $3.56M → implies $4.0M–$4.1M organic.`,
  },
  {
    id: "doc-5",
    title: "Cash Flow Projection",
    type: "FINANCE",
    summary: "Current cash position and runway",
    content: `Cash position: $2.1M (as of July 1)
Monthly operating burn: $340K (excl. new hires)
Current runway: ~6.2 months

Impact of 8 new FTEs (Aug 15):
• Monthly HC addition: ~$32K/month
• Revised monthly burn: ~$372K
• Revised runway: ~5.6 months

Additional considerations:
• Equipment and tooling for new hires: ~$12K one-time
• Series A closing expected Q4 but unconfirmed
• Board covenant: maintain minimum $1.0M cash reserve`,
  },
  {
    id: "doc-6",
    title: "CFO Note (Restricted)",
    type: "INTERNAL",
    summary: "CFO flagged concern about pipeline quality",
    content: `From: Sarah Chen, CFO
To: FP&A Team
Subject: Q3 HC Plan — Pre-board note

Team,

Before we finalize the HC recommendation, I want to flag something from yesterday's pipeline review.

At least $800K of the Q3 number is in deals that have moved backward in our CRM over the past 30 days — probability has dropped from 75%+ to 50–60%. Sales ops categorizes these as "at risk" for Q3.

Any HC decision should be stress-tested against a scenario where Q3 revenue comes in at $3.4M instead of $4.2M. 

At that level, adding $96K in quarterly HC cost takes EBITDA negative.

Please model this before the board meeting.

— Sarah`,
  },
];

const ASSUMPTION_FLAGS: AssumptionFlag[] = [
  {
    key: "revenue_growth",
    label: "18% YoY revenue growth in Q3",
    detail: "Above 3-year historical average of 12–15%. Trail Series launch adds $400K but is partially offset by pipeline risk.",
    assessment: null,
  },
  {
    key: "hc_timeline",
    label: "8 FTEs hired and onboarded by Aug 15",
    detail: "Aggressive timeline — typical recruiting cycle is 6–8 weeks. Sales reps have 60–90 day ramp before productivity.",
    assessment: null,
  },
  {
    key: "pipeline_quality",
    label: "No significant Q3 pipeline slippage",
    detail: "CRM data shows $800K in late-stage deals with slippage risk. Pipeline coverage at 0.9x on qualified (non-early-stage) deals.",
    assessment: null,
  },
  {
    key: "burn_flat",
    label: "Operating burn stays flat at $340K/month",
    detail: "New hires typically increase non-HC burn (equipment, SaaS seats) by 8–12%. Not included in HC cost estimate.",
    assessment: null,
  },
];

const INITIAL_FORECAST: ForecastRow[] = [
  { key: "revenue", label: "Revenue Q3E", value: 4200000, editable: true },
  { key: "cogs", label: "COGS (est. 50%)", value: 2100000, editable: true },
  { key: "gross_profit", label: "Gross Profit", value: 2100000, editable: false, computed: true },
  { key: "opex_current", label: "Current OpEx", value: 1600000, editable: false },
  { key: "hc_cost", label: "Proposed HC Cost (Q3)", value: 0, editable: true, note: "Enter $96,000 for full plan" },
  { key: "total_opex", label: "Total OpEx", value: 1600000, editable: false, computed: true },
  { key: "ebitda", label: "EBITDA", value: 500000, editable: false, computed: true },
  { key: "fcf", label: "FCF Estimate", value: 320000, editable: false, computed: true },
];

const STAGE_ORDER: Stage[] = [
  "brief",
  "data_room",
  "forecast",
  "assumptions",
  "manager_update",
  "recommendation",
];

const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; guidance: string }> = {
  brief: {
    label: "Brief",
    icon: <FileText size={14} />,
    guidance:
      "Read the scenario carefully. Understand the decision you need to make and who is asking for it. Note the time constraints and success criteria.",
  },
  data_room: {
    label: "Data Room",
    icon: <BarChart2 size={14} />,
    guidance:
      "Open each document. Look for: revenue assumptions, pipeline quality, cash position, headcount cost detail. Take mental notes of red flags.",
  },
  forecast: {
    label: "Forecast Model",
    icon: <BarChart2 size={14} />,
    guidance:
      "Model the impact of the proposed headcount. Try a downside scenario — what happens if Q3 revenue misses by $800K? Does EBITDA hold?",
  },
  assumptions: {
    label: "Assumptions",
    icon: <Flag size={14} />,
    guidance:
      "Rate each assumption: Looks Reasonable, Needs Review, or Material Risk. A 'Material Risk' flag signals you'll address it in your recommendation.",
  },
  manager_update: {
    label: "Manager Update",
    icon: <MessageSquare size={14} />,
    guidance:
      "New information has arrived. Does this change your analysis? Update your model or recommendation as needed before submitting.",
  },
  recommendation: {
    label: "Recommendation",
    icon: <Send size={14} />,
    guidance:
      "Be decisive. State Go / Hold / Revise clearly. Support with numbers, list key risks, flag assumptions, and write a concise memo.",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n < 0) return `-$${Math.abs(n).toLocaleString()}`;
  return `$${n.toLocaleString()}`;
}

function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((r) => r.json())
    .catch(() => ({}));
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function WorkroomRunner({ token, candidateName, simulationTitle, demo }: Props) {
  const timer = useSimulationClock(1500); // 25:00
  const timerMins = parseInt(timer.split(":")[0], 10);
  const [stage, setStage] = useState<Stage>("brief");
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [openDocs, setOpenDocs] = useState<Set<string>>(new Set());
  const [forecast, setForecast] = useState<ForecastRow[]>(INITIAL_FORECAST);
  const [flags, setFlags] = useState<AssumptionFlag[]>(ASSUMPTION_FLAGS);
  const [managerRead, setManagerRead] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [risks, setRisks] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [questions, setQuestions] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signals captured (for right panel)
  const signals: Signal[] = [
    { label: "Revenue assumption challenged", captured: forecast.some((r) => r.key === "revenue" && r.value !== 4200000) },
    { label: "Downside scenario modeled", captured: forecast.some((r) => r.key === "revenue" && r.value < 4000000) },
    { label: "HC cost entered", captured: forecast.some((r) => r.key === "hc_cost" && r.value > 0) },
    { label: "Pipeline risk flagged", captured: flags.some((f) => f.key === "pipeline_quality" && (f.assessment === "needs_review" || f.assessment === "material_risk")) },
    { label: "All 6 docs reviewed", captured: openDocs.size >= 6 },
    { label: "Hold/Revise recommended", captured: verdict === "hold" || verdict === "revise" },
  ];

  // Start attempt
  useEffect(() => {
    if (demo) return;
    postJson("/api/mvp/attempts/start", { token }).then((data) => {
      if (data?.attempt?.id) setAttemptId(data.attempt.id);
    });
  }, [token, demo]);

  function recordEvent(eventType: string, payload: Record<string, unknown> = {}) {
    if (!attemptId || demo) return;
    void postJson(`/api/mvp/attempts/${attemptId}/event`, { eventType, payload });
  }

  // Compute derived forecast fields
  function recompute(rows: ForecastRow[]): ForecastRow[] {
    const get = (key: string) => rows.find((r) => r.key === key)?.value ?? 0;
    return rows.map((r) => {
      if (r.key === "gross_profit") return { ...r, value: get("revenue") - get("cogs") };
      if (r.key === "total_opex") return { ...r, value: get("opex_current") + get("hc_cost") };
      if (r.key === "ebitda") return { ...r, value: get("revenue") - get("cogs") - get("opex_current") - get("hc_cost") };
      if (r.key === "fcf") return { ...r, value: Math.round((get("revenue") - get("cogs") - get("opex_current") - get("hc_cost")) * 0.64) };
      return r;
    });
  }

  function updateForecast(key: string, raw: string) {
    const numeric = parseInt(raw.replace(/[^0-9-]/g, ""), 10);
    if (isNaN(numeric)) return;
    const oldVal = forecast.find((r) => r.key === key)?.value ?? 0;
    setForecast((prev) => recompute(prev.map((r) => (r.key === key ? { ...r, value: numeric } : r))));
    recordEvent("assumption_added", { field: key, old_value: oldVal, new_value: numeric });
  }

  function advanceStage() {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < STAGE_ORDER.length - 1) {
      setCompletedStages((s) => new Set([...s, stage]));
      const next = STAGE_ORDER[idx + 1];
      setStage(next);
      recordEvent("question_answered", { stage, moved_to: next });
    }
  }

  function backStage() {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx > 0) setStage(STAGE_ORDER[idx - 1]);
  }

  function toggleDoc(id: string) {
    setOpenDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else {
        next.add(id);
        recordEvent("resource_opened", { resource_id: id });
      }
      return next;
    });
  }

  function setFlag(key: string, assessment: FlagAssessment) {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, assessment } : f)));
  }

  function autosaveNotes(notes: string) {
    if (!attemptId || demo) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void postJson(`/api/mvp/attempts/${attemptId}/notes`, { notes });
    }, 800);
  }

  async function handleSubmit() {
    if (!verdict) { setError("Please select a verdict (Go / Hold / Revise)."); return; }
    if (memo.trim().length < 20) { setError("Please write an executive memo (at least a few sentences)."); return; }
    setBusy(true);
    setError(null);

    const fullRec = `VERDICT: ${verdict.toUpperCase()}\n\nRISKS:\n${risks}\n\nKEY ASSUMPTIONS:\n${assumptions}\n\nQUESTIONS FOR MANAGEMENT:\n${questions}\n\nEXECUTIVE MEMO:\n${memo}`;

    if (!demo && attemptId) {
      await postJson(`/api/mvp/attempts/${attemptId}/submit`, { recommendation: fullRec });
    }
    setBusy(false);
    setSubmitted(true);
  }

  // ── Submitted state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          className="glass-card"
          style={{ maxWidth: 480, width: "100%", padding: "40px", textAlign: "center" }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <CheckCircle size={24} color="var(--green)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px" }}>Submitted</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 8px" }}>
            Your recommendation for{" "}
            <strong style={{ color: "var(--text)" }}>
              {simulationTitle ?? "Project Meridian"}
            </strong>{" "}
            has been recorded.
          </p>
          <p style={{ fontSize: 13, color: "var(--faint)", margin: 0 }}>
            The hiring team will review your submission alongside the evidence from your session.
          </p>
        </div>
      </div>
    );
  }

  const stageIdx = STAGE_ORDER.indexOf(stage);

  // ── Shell ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Top bar */}
      <header
        style={{
          height: 54,
          background: "rgba(11,16,26,0.97)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 20,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "linear-gradient(135deg, var(--blue), var(--violet))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            F
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Fydell
          </span>
        </div>

        {/* Sim title */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            {simulationTitle ?? "Project Meridian — FP&A Forecast Review"}
          </p>
          {candidateName && (
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>{candidateName}</p>
          )}
        </div>

        {/* Timer */}
        <div
          style={{
            minWidth: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          <Clock size={13} />
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              color: timerMins < 5 ? "var(--danger)" : "var(--text)",
              fontSize: 16,
            }}
          >
            {timer}
          </span>
          <span style={{ fontSize: 11, color: "var(--faint)" }}>remaining</span>
        </div>
      </header>

      {/* Body: sidebar + main + guidance */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left: Stage nav ── */}
        <aside
          style={{
            width: 192,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            background: "rgba(11,16,26,0.97)",
            padding: "16px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--faint)",
              padding: "2px 8px 8px",
              margin: 0,
            }}
          >
            Stages
          </p>
          {STAGE_ORDER.map((s, i) => {
            const meta = STAGE_META[s];
            const active = s === stage;
            const done = completedStages.has(s);
            const locked = i > stageIdx + 1;
            return (
              <button
                key={s}
                onClick={() => !locked && setStage(s)}
                disabled={locked}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  borderRadius: 9,
                  border: active
                    ? "1px solid rgba(124,61,255,0.3)"
                    : "1px solid transparent",
                  background: active ? "rgba(124,61,255,0.10)" : "transparent",
                  color: active ? "var(--text)" : done ? "var(--muted)" : locked ? "var(--faint)" : "var(--muted)",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 400,
                  cursor: locked ? "not-allowed" : "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 120ms",
                  opacity: locked ? 0.4 : 1,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: active
                      ? "2px solid var(--violet)"
                      : done
                      ? "2px solid var(--green)"
                      : "2px solid var(--border-strong)",
                    background: done
                      ? "rgba(52,211,153,0.12)"
                      : active
                      ? "rgba(124,61,255,0.12)"
                      : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: done ? "var(--green)" : active ? "var(--violet)" : "var(--faint)",
                    flexShrink: 0,
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                {meta.label}
              </button>
            );
          })}
        </aside>

        {/* ── Center: Stage content ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <StageContent
            stage={stage}
            openDocs={openDocs}
            forecast={forecast}
            flags={flags}
            managerRead={managerRead}
            verdict={verdict}
            risks={risks}
            assumptions={assumptions}
            questions={questions}
            memo={memo}
            busy={busy}
            error={error}
            onToggleDoc={toggleDoc}
            onForecastChange={updateForecast}
            onFlagChange={setFlag}
            onManagerRead={() => setManagerRead(true)}
            onVerdictChange={setVerdict}
            onRisksChange={(v) => { setRisks(v); autosaveNotes(v); }}
            onAssumptionsChange={(v) => { setAssumptions(v); autosaveNotes(v); }}
            onQuestionsChange={(v) => { setQuestions(v); autosaveNotes(v); }}
            onMemoChange={(v) => { setMemo(v); autosaveNotes(v); }}
            onSubmit={handleSubmit}
          />

          {/* Nav buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
            <button
              onClick={backStage}
              disabled={stageIdx === 0}
              className="platform-btn-ghost"
              style={{ gap: 6, display: "inline-flex", alignItems: "center", fontSize: 13, height: 38 }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
            {stage !== "recommendation" ? (
              <button
                onClick={advanceStage}
                className="platform-btn-primary"
                style={{ gap: 6, display: "inline-flex", alignItems: "center", fontSize: 13, height: 38 }}
              >
                Next: {STAGE_META[STAGE_ORDER[stageIdx + 1]]?.label ?? ""}
                <ChevronRight size={14} />
              </button>
            ) : null}
          </div>
        </main>

        {/* ── Right: Guidance ── */}
        <aside
          style={{
            width: 264,
            flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            background: "rgba(11,16,26,0.97)",
            padding: "16px 14px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Guidance */}
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--faint)",
                margin: "0 0 8px",
              }}
            >
              Guidance
            </p>
            <div
              style={{
                background: "rgba(37,99,255,0.07)",
                border: "1px solid rgba(37,99,255,0.18)",
                borderRadius: 10,
                padding: "12px 13px",
                display: "flex",
                gap: 8,
              }}
            >
              <Info size={14} color="var(--blue)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
                {STAGE_META[stage].guidance}
              </p>
            </div>
          </div>

          {/* Evidence signals */}
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--faint)",
                margin: "0 0 8px",
              }}
            >
              Evidence captured
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {signals.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    color: s.captured ? "rgba(226,232,240,0.82)" : "var(--faint)",
                  }}
                >
                  {s.captured ? (
                    <CheckCircle size={12} color="var(--green)" />
                  ) : (
                    <XCircle size={12} color="rgba(255,255,255,0.15)" />
                  )}
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* EBITDA quick-view */}
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--faint)",
                margin: "0 0 8px",
              }}
            >
              Live model
            </p>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "12px 13px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {forecast
                .filter((r) => ["revenue", "ebitda", "fcf"].includes(r.key))
                .map((r) => {
                  const isNeg = r.value < 0;
                  return (
                    <div key={r.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--muted)" }}>{r.label.replace(" Q3E", "")}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: isNeg ? "var(--danger)" : r.key === "ebitda" ? (r.value > 0 ? "var(--green)" : "var(--danger)") : "var(--text)",
                        }}
                      >
                        {fmt(r.value)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Stage Content Components ────────────────────────────────────────────────

interface StageProps {
  stage: Stage;
  openDocs: Set<string>;
  forecast: ForecastRow[];
  flags: AssumptionFlag[];
  managerRead: boolean;
  verdict: Verdict | null;
  risks: string;
  assumptions: string;
  questions: string;
  memo: string;
  busy: boolean;
  error: string | null;
  onToggleDoc: (id: string) => void;
  onForecastChange: (key: string, val: string) => void;
  onFlagChange: (key: string, assessment: FlagAssessment) => void;
  onManagerRead: () => void;
  onVerdictChange: (v: Verdict) => void;
  onRisksChange: (v: string) => void;
  onAssumptionsChange: (v: string) => void;
  onQuestionsChange: (v: string) => void;
  onMemoChange: (v: string) => void;
  onSubmit: () => void;
}

function StageContent(props: StageProps) {
  switch (props.stage) {
    case "brief": return <BriefStage />;
    case "data_room": return <DataRoomStage openDocs={props.openDocs} onToggle={props.onToggleDoc} />;
    case "forecast": return <ForecastStage rows={props.forecast} onChange={props.onForecastChange} />;
    case "assumptions": return <AssumptionsStage flags={props.flags} onChange={props.onFlagChange} />;
    case "manager_update": return <ManagerUpdateStage read={props.managerRead} onRead={props.onManagerRead} />;
    case "recommendation":
      return (
        <RecommendationStage
          verdict={props.verdict}
          risks={props.risks}
          assumptions={props.assumptions}
          questions={props.questions}
          memo={props.memo}
          busy={props.busy}
          error={props.error}
          onVerdictChange={props.onVerdictChange}
          onRisksChange={props.onRisksChange}
          onAssumptionsChange={props.onAssumptionsChange}
          onQuestionsChange={props.onQuestionsChange}
          onMemoChange={props.onMemoChange}
          onSubmit={props.onSubmit}
        />
      );
  }
}

function BriefStage() {
  return (
    <div>
      <SectionHeader eyebrow="Stage 1" title="Situation brief" />
      <div className="glass-card" style={{ padding: "28px 32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            padding: "14px 16px",
            background: "rgba(37,99,255,0.07)",
            border: "1px solid rgba(37,99,255,0.18)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 24 }}>📊</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Meridian Outdoor Co.
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
              Q3 Hiring Plan Review · Junior FP&A Analyst · 25 minutes
            </p>
          </div>
        </div>
        <p
          style={{
            fontSize: 15,
            color: "rgba(226,232,240,0.85)",
            lineHeight: 1.75,
            whiteSpace: "pre-line",
            margin: 0,
          }}
        >
          {BRIEF}
        </p>
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 10,
            display: "flex",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} color="var(--warning)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
            This simulation produces an evidence-backed preliminary signal, not a pass/fail grade. Work through the problem as you normally would.
          </p>
        </div>
      </div>
    </div>
  );
}

function DataRoomStage({ openDocs, onToggle }: { openDocs: Set<string>; onToggle: (id: string) => void }) {
  const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    FINANCIAL: { bg: "rgba(37,99,255,0.10)", color: "var(--blue)" },
    HR: { bg: "rgba(124,61,255,0.10)", color: "var(--violet)" },
    FORECAST: { bg: "rgba(46,211,208,0.10)", color: "var(--cyan)" },
    PIPELINE: { bg: "rgba(245,158,11,0.10)", color: "var(--warning)" },
    FINANCE: { bg: "rgba(37,99,255,0.10)", color: "var(--blue)" },
    INTERNAL: { bg: "rgba(248,113,113,0.10)", color: "var(--danger)" },
  };

  return (
    <div>
      <SectionHeader eyebrow="Stage 2" title="Data room" sub={`${openDocs.size} of ${DATA_ROOM.length} documents opened`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DATA_ROOM.map((doc) => {
          const open = openDocs.has(doc.id);
          const typeStyle = TYPE_COLORS[doc.type] ?? TYPE_COLORS.FINANCIAL;
          return (
            <div
              key={doc.id}
              className="glass-card"
              style={{ overflow: "hidden", transition: "border-color 150ms" }}
            >
              <button
                onClick={() => onToggle(doc.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: typeStyle.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={14} color={typeStyle.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    {doc.summary}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {open && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--green)",
                        display: "inline-block",
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: typeStyle.bg,
                      color: typeStyle.color,
                      borderRadius: 5,
                      padding: "2px 7px",
                    }}
                  >
                    {doc.type}
                  </span>
                  <ChevronRight
                    size={14}
                    color="var(--faint)"
                    style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms" }}
                  />
                </div>
              </button>
              {open && (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    padding: "16px 18px",
                    fontSize: 13.5,
                    color: "rgba(226,232,240,0.82)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-line",
                  }}
                >
                  {doc.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForecastStage({ rows, onChange }: { rows: ForecastRow[]; onChange: (key: string, val: string) => void }) {
  return (
    <div>
      <SectionHeader
        eyebrow="Stage 3"
        title="Forecast model"
        sub="Edit cells to model the impact of the proposed headcount. Try a downside scenario."
      />
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--faint)" }}>
                Line item
              </th>
              <th style={{ padding: "12px 18px", textAlign: "right", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--faint)" }}>
                Value
              </th>
              <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--faint)" }}>
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isNeg = row.value < 0;
              const isDivider = row.key === "ebitda" || row.key === "gross_profit";
              return (
                <tr
                  key={row.key}
                  style={{
                    borderTop: isDivider ? "2px solid rgba(255,255,255,0.1)" : i > 0 ? "1px solid var(--border)" : "none",
                    background: row.computed ? "rgba(255,255,255,0.012)" : "transparent",
                  }}
                >
                  <td style={{ padding: "11px 18px", fontSize: 13.5 }}>
                    <span
                      style={{
                        color: row.computed ? "var(--muted)" : "var(--text)",
                        fontStyle: row.computed ? "italic" : "normal",
                        fontWeight: isDivider ? 700 : 400,
                      }}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td style={{ padding: "11px 18px", textAlign: "right" }}>
                    {row.editable ? (
                      <input
                        type="text"
                        defaultValue={row.value}
                        onBlur={(e) => onChange(row.key, e.target.value)}
                        style={{
                          width: 130,
                          background: "rgba(37,99,255,0.06)",
                          border: "1px solid rgba(37,99,255,0.24)",
                          borderRadius: 7,
                          color: "var(--text)",
                          padding: "5px 10px",
                          textAlign: "right",
                          fontSize: 13.5,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          outline: "none",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "rgba(37,99,255,0.55)";
                          e.target.style.boxShadow = "0 0 0 3px rgba(37,99,255,0.12)";
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: isDivider ? 700 : 500,
                          fontVariantNumeric: "tabular-nums",
                          color: isNeg ? "var(--danger)" : isDivider ? "var(--text)" : "var(--muted)",
                          padding: "5px 10px",
                          display: "inline-block",
                        }}
                      >
                        {fmt(row.value)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "var(--faint)" }}>
                    {row.note ?? (row.editable ? "editable" : row.computed ? "computed" : "fixed")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "rgba(124,61,255,0.06)",
          border: "1px solid rgba(124,61,255,0.18)",
          borderRadius: 10,
          fontSize: 12.5,
          color: "var(--muted)",
        }}
      >
        💡 <strong style={{ color: "var(--text)" }}>Try modeling the downside:</strong> Set Revenue to 3,400,000 and HC Cost to 96,000. What happens to EBITDA?
      </div>
    </div>
  );
}

function AssumptionsStage({
  flags,
  onChange,
}: {
  flags: AssumptionFlag[];
  onChange: (key: string, a: FlagAssessment) => void;
}) {
  const ASSESSMENT_CONFIG: Record<FlagAssessment, { label: string; color: string; bg: string }> = {
    looks_reasonable: { label: "Looks reasonable", color: "var(--green)", bg: "rgba(52,211,153,0.10)" },
    needs_review: { label: "Needs review", color: "var(--warning)", bg: "rgba(245,158,11,0.10)" },
    material_risk: { label: "Material risk", color: "var(--danger)", bg: "rgba(248,113,113,0.10)" },
  };

  const flagged = flags.filter((f) => f.assessment !== null).length;

  return (
    <div>
      <SectionHeader
        eyebrow="Stage 4"
        title="Flag assumptions"
        sub={`${flagged} of ${flags.length} flagged`}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flags.map((flag) => (
          <div key={flag.key} className="glass-card" style={{ padding: "18px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 4px" }}>
              {flag.label}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
              {flag.detail}
            </p>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(Object.entries(ASSESSMENT_CONFIG) as [FlagAssessment, typeof ASSESSMENT_CONFIG[FlagAssessment]][]).map(
                ([key, cfg]) => {
                  const active = flag.assessment === key;
                  return (
                    <button
                      key={key}
                      onClick={() => onChange(flag.key, key)}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "5px 12px",
                        borderRadius: 7,
                        border: `1px solid ${active ? cfg.color + "55" : "var(--border)"}`,
                        background: active ? cfg.bg : "transparent",
                        color: active ? cfg.color : "var(--muted)",
                        cursor: "pointer",
                        transition: "all 120ms",
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerUpdateStage({ read, onRead }: { read: boolean; onRead: () => void }) {
  return (
    <div>
      <SectionHeader eyebrow="Stage 5" title="Manager update" />
      {!read ? (
        <div className="glass-card" style={{ padding: "32px", textAlign: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <MessageSquare size={22} color="var(--warning)" />
          </div>
          <h3 style={{ margin: "0 0 8px" }}>New information available</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.6 }}>
            Your manager has flagged something that may change your analysis. Click to reveal.
          </p>
          <button onClick={onRead} className="platform-btn-primary" style={{ fontSize: 14, height: 42 }}>
            Reveal manager update
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "24px 28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              padding: "10px 12px",
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 8,
            }}
          >
            <AlertTriangle size={14} color="var(--warning)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)" }}>
              New information — update your analysis
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--warning)",
              borderRadius: "0 10px 10px 0",
              padding: "16px 18px",
              fontSize: 13.5,
              color: "rgba(226,232,240,0.82)",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {`From: Sarah Chen, CFO
To: You (FP&A)
Re: Q3 HC Plan — 9:14 AM

"Just got off a call with sales ops. The $800K in late-stage deals I flagged earlier — it's worse than I thought. At least 60% probability those slip to Q4 based on updated probability scores from the CRM.

You should assume Q3 revenue comes in closer to $3.4M in the downside case, not $4.2M.

Please make sure your recommendation accounts for this scenario explicitly. If we hire all 8 FTEs and Q3 misses, we're looking at negative EBITDA and a runway shorter than the board's 6-month minimum.

— Sarah"`}
          </div>
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.18)",
              borderRadius: 10,
              fontSize: 13,
              color: "var(--muted)",
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: "var(--text)" }}>Implication:</strong> At $3.4M revenue with $96K HC cost, EBITDA turns negative. Cash runway drops to ~4.5 months — below the board's 6-month covenant. Consider whether this changes your Go/Hold/Revise recommendation.
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationStage({
  verdict, risks, assumptions, questions, memo, busy, error,
  onVerdictChange, onRisksChange, onAssumptionsChange, onQuestionsChange, onMemoChange, onSubmit,
}: {
  verdict: Verdict | null;
  risks: string; assumptions: string; questions: string; memo: string;
  busy: boolean; error: string | null;
  onVerdictChange: (v: Verdict) => void;
  onRisksChange: (v: string) => void;
  onAssumptionsChange: (v: string) => void;
  onQuestionsChange: (v: string) => void;
  onMemoChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const VERDICTS: { v: Verdict; label: string; sub: string; color: string }[] = [
    { v: "go", label: "Go", sub: "Proceed with all 8 FTEs", color: "var(--green)" },
    { v: "hold", label: "Hold", sub: "Pause pending re-forecast", color: "var(--warning)" },
    { v: "revise", label: "Revise", sub: "Modify scope or timing", color: "var(--blue)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeader eyebrow="Stage 6" title="Recommendation" sub="State your verdict and supporting analysis." />

      {/* Verdict */}
      <div className="glass-card" style={{ padding: "20px 24px" }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Verdict
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {VERDICTS.map(({ v, label, sub, color }) => {
            const active = verdict === v;
            return (
              <button
                key={v}
                onClick={() => onVerdictChange(v)}
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: `2px solid ${active ? color + "55" : "var(--border)"}`,
                  background: active ? `color-mix(in srgb, ${color} 10%, transparent)` : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 150ms",
                }}
              >
                <p style={{ fontSize: 20, fontWeight: 800, color: active ? color : "var(--muted)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {label}
                </p>
                <p style={{ fontSize: 11, color: active ? color : "var(--faint)", margin: 0, fontWeight: 500 }}>
                  {sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form fields */}
      {[
        { label: "Key risks", value: risks, onChange: onRisksChange, placeholder: "e.g. Revenue assumption 18% exceeds historical range. Pipeline has $800K slippage risk…", rows: 3 },
        { label: "Key assumptions", value: assumptions, onChange: onAssumptionsChange, placeholder: "e.g. Downside revenue: $3.4M. HC cost: $96K/quarter. Cash runway post-hire: 5.6 months…", rows: 3 },
        { label: "Questions for management", value: questions, onChange: onQuestionsChange, placeholder: "e.g. What are the re-qualification criteria for the $800K at-risk pipeline?…", rows: 3 },
        { label: "Executive memo", value: memo, onChange: onMemoChange, placeholder: "Write your full recommendation memo here. State the verdict, reasoning, risks, and conditions for changing the decision…", rows: 8 },
      ].map((field) => (
        <div key={field.label} className="glass-card" style={{ padding: "18px 20px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {field.label}
          </label>
          <textarea
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            rows={field.rows}
            placeholder={field.placeholder}
            className="platform-input"
            style={{ resize: "vertical", fontSize: 13.5, lineHeight: 1.6 }}
          />
        </div>
      ))}

      {error && (
        <div style={{ padding: "12px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", borderRadius: 10, fontSize: 13, color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={busy}
        className="platform-btn-primary"
        style={{ fontSize: 15, height: 50, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <Send size={15} />
        {busy ? "Submitting…" : "Submit recommendation"}
      </button>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", margin: sub ? "0 0 4px" : 0 }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{sub}</p>}
    </div>
  );
}
