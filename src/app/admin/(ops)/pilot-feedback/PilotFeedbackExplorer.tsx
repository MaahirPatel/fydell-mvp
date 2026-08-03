"use client";

import { useMemo, useState } from "react";
import { AdminEmpty } from "@/components/admin/AdminUi";

export type PilotFeedbackRow = {
  id: string;
  session_id: string | null;
  template_slug: string | null;
  role_key: string | null;
  tester_name: string | null;
  tester_email: string | null;
  organization: string | null;
  tester_perspective: string | null;
  role_familiarity: string | null;
  clarity_rating: number | null;
  realism_rating: number | null;
  report_trust_rating: number | null;
  task_ease_rating: number | null;
  result_accuracy_rating: number | null;
  completed_without_help: string | null;
  duration_opinion: string | null;
  trust_score: string | null;
  interview_value: string | null;
  candidate_pilot_interest: string | null;
  contact_ok: boolean | null;
  issue_severity: string | null;
  responses: {
    simulationTitle?: string | null;
    text?: Record<string, string>;
    evidence?: {
      mostUseful?: string | null;
      leastUseful?: string | null;
      scorePreference?: string | null;
    };
    roleAnswers?: { question: string; answer: string }[];
  } | null;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "BI Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

const TEXT_LABELS: Record<string, string> = {
  initialImpression: "What did you initially think Fydell was?",
  clearestPart: "Which part of the website made the product clearest?",
  confusingPart: "Which part was confusing or unnecessary?",
  hesitation: "Where did you hesitate?",
  controlIssues: "Did any control fail or behave unexpectedly?",
  unsupportedConclusion: "Did any conclusion feel unsupported?",
  trustReason: "Why did you trust or distrust the score?",
  changesNeeded: "What would need to change before real candidates?",
  rolesForOrg: "Which roles would your organization use this for?",
  annualHires: "Annual hires for these roles",
};

function averageOf(rows: PilotFeedbackRow[], pick: (r: PilotFeedbackRow) => number | null) {
  const values = rows.map(pick).filter((v): v is number => v !== null);
  if (values.length === 0) return { avg: null as number | null, n: 0 };
  return {
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    n: values.length,
  };
}

function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(rows: PilotFeedbackRow[]): string {
  const headers = [
    "created_at",
    "tester_name",
    "tester_email",
    "organization",
    "tester_perspective",
    "role_familiarity",
    "role_key",
    "template_slug",
    "session_id",
    "clarity_rating",
    "task_ease_rating",
    "realism_rating",
    "result_accuracy_rating",
    "report_trust_rating",
    "completed_without_help",
    "duration_opinion",
    "trust_score",
    "interview_value",
    "candidate_pilot_interest",
    "contact_ok",
    "issue_severity",
    "responses",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.tester_name,
        r.tester_email,
        r.organization,
        r.tester_perspective,
        r.role_familiarity,
        r.role_key,
        r.template_slug,
        r.session_id,
        r.clarity_rating,
        r.task_ease_rating,
        r.realism_rating,
        r.result_accuracy_rating,
        r.report_trust_rating,
        r.completed_without_help,
        r.duration_opinion,
        r.trust_score,
        r.interview_value,
        r.candidate_pilot_interest,
        r.contact_ok,
        r.issue_severity,
        r.responses,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-white/[0.1] bg-gradient-to-b from-[#0E1118] to-[#0A0C11] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/55">{label}</p>
      <p
        className="mt-2.5 text-[26px] leading-none tabular-nums text-white"
        style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12px] text-white/40">{hint}</p> : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-white/45">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-[8px] border border-white/[0.12] bg-[#0B0D12] px-2.5 text-[13px] normal-case tracking-normal text-white outline-none focus:border-white/30"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {ROLE_LABELS[opt] || opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/40">{label}</p>
      <p className="mt-1 whitespace-pre-wrap border-l-2 border-white/15 pl-3 text-[13px] leading-relaxed text-white/80">
        {text}
      </p>
    </div>
  );
}

export default function PilotFeedbackExplorer({ rows }: { rows: PilotFeedbackRow[] }) {
  const [roleFilter, setRoleFilter] = useState("");
  const [perspectiveFilter, setPerspectiveFilter] = useState("");
  const [familiarityFilter, setFamiliarityFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!roleFilter || r.role_key === roleFilter) &&
          (!perspectiveFilter || r.tester_perspective === perspectiveFilter) &&
          (!familiarityFilter || r.role_familiarity === familiarityFilter) &&
          (!interestFilter || r.candidate_pilot_interest === interestFilter)
      ),
    [rows, roleFilter, perspectiveFilter, familiarityFilter, interestFilter]
  );

  const testerCount = useMemo(() => {
    const emails = new Set<string>();
    let anonymous = 0;
    for (const r of filtered) {
      if (r.tester_email) emails.add(r.tester_email.toLowerCase());
      else anonymous += 1;
    }
    return emails.size + anonymous;
  }, [filtered]);

  const linkedSessions = useMemo(
    () => new Set(filtered.map((r) => r.session_id).filter(Boolean)).size,
    [filtered]
  );

  const clarityStat = averageOf(filtered, (r) => r.clarity_rating);
  const realismStat = averageOf(filtered, (r) => r.realism_rating);
  const trustStat = averageOf(filtered, (r) => r.report_trust_rating);

  const interestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      const key = r.candidate_pilot_interest || "No answer";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function exportCsv() {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pilot-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const fmt = (stat: { avg: number | null; n: number }) =>
    stat.avg === null ? "No data" : stat.avg.toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Testers"
          value={String(testerCount)}
          hint={`${filtered.length} submission${filtered.length === 1 ? "" : "s"}, ${linkedSessions} linked to a session`}
        />
        <StatCard
          label="Avg clarity"
          value={fmt(clarityStat)}
          hint={`n=${clarityStat.n}, scale 1 to 5`}
        />
        <StatCard
          label="Avg realism"
          value={fmt(realismStat)}
          hint={`n=${realismStat.n}, scale 1 to 5`}
        />
        <StatCard
          label="Avg report trust"
          value={fmt(trustStat)}
          hint={`n=${trustStat.n}, yes=5 partially=3 no=1`}
        />
      </div>

      <div className="rounded-[14px] border border-white/[0.1] bg-[#0A0C11] px-4 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/55">
          Would test with five real candidates
        </p>
        {interestCounts.length === 0 ? (
          <p className="mt-2 text-[13px] text-white/40">No submissions yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {interestCounts.map(([answer, count]) => (
              <span
                key={answer}
                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[12px] text-white/75 ring-1 ring-inset ring-white/10"
              >
                {answer}
                <span className="tabular-nums text-white" style={{ fontWeight: 560 }}>
                  {count}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={distinct(rows.map((r) => r.role_key))}
          />
          <FilterSelect
            label="Perspective"
            value={perspectiveFilter}
            onChange={setPerspectiveFilter}
            options={distinct(rows.map((r) => r.tester_perspective))}
          />
          <FilterSelect
            label="Familiarity"
            value={familiarityFilter}
            onChange={setFamiliarityFilter}
            options={distinct(rows.map((r) => r.role_familiarity))}
          />
          <FilterSelect
            label="Pilot interest"
            value={interestFilter}
            onChange={setInterestFilter}
            options={distinct(rows.map((r) => r.candidate_pilot_interest))}
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[13px] font-semibold text-[#08090C] transition-[filter] hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV ({rows.length})
        </button>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-white/[0.1] bg-[#0A0C11]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-white/[0.08] bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-white/40">
              <tr>
                <th className="px-4 py-3.5 font-medium">Date</th>
                <th className="px-4 py-3.5 font-medium">Tester</th>
                <th className="px-4 py-3.5 font-medium">Perspective</th>
                <th className="px-4 py-3.5 font-medium">Role</th>
                <th className="px-4 py-3.5 font-medium">Ratings</th>
                <th className="px-4 py-3.5 font-medium">Interview value</th>
                <th className="px-4 py-3.5 font-medium">Interest</th>
                <th className="px-4 py-3.5 font-medium">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <AdminEmpty>
                      {rows.length === 0
                        ? "No pilot feedback yet. Submissions from /pilot/feedback appear here."
                        : "No submissions match the current filters."}
                    </AdminEmpty>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isOpen = Boolean(expanded[row.id]);
                  const text = row.responses?.text || {};
                  const roleAnswers = row.responses?.roleAnswers || [];
                  const evidence = row.responses?.evidence;
                  const quotes = Object.entries(text).filter(([, v]) => v);
                  const hasDetails = quotes.length > 0 || roleAnswers.length > 0 || Boolean(evidence);
                  return (
                    <FragmentRow
                      key={row.id}
                      row={row}
                      isOpen={isOpen}
                      hasDetails={hasDetails}
                      onToggle={() =>
                        setExpanded((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                      }
                      quotes={quotes}
                      roleAnswers={roleAnswers}
                      evidence={evidence}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  isOpen,
  hasDetails,
  onToggle,
  quotes,
  roleAnswers,
  evidence,
}: {
  row: PilotFeedbackRow;
  isOpen: boolean;
  hasDetails: boolean;
  onToggle: () => void;
  quotes: [string, string][];
  roleAnswers: { question: string; answer: string }[];
  evidence?: {
    mostUseful?: string | null;
    leastUseful?: string | null;
    scorePreference?: string | null;
  };
}) {
  const ratingSummary = [
    ["C", row.clarity_rating],
    ["E", row.task_ease_rating],
    ["R", row.realism_rating],
    ["A", row.result_accuracy_rating],
    ["T", row.report_trust_rating],
  ]
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}${v}`)
    .join(" ");

  return (
    <>
      <tr className="border-b border-white/[0.05] transition-colors hover:bg-white/[0.02]">
        <td className="px-4 py-3.5 tabular-nums text-white/55">
          {new Date(row.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3.5">
          <div className="text-white">{row.tester_name || "Anonymous"}</div>
          <div className="text-[12px] text-white/40">
            {row.organization || row.tester_email || ""}
          </div>
        </td>
        <td className="px-4 py-3.5 text-white/70">
          <div>{row.tester_perspective || ""}</div>
          <div className="max-w-[220px] text-[12px] text-white/40">{row.role_familiarity || ""}</div>
        </td>
        <td className="px-4 py-3.5 text-white/70">
          {row.role_key ? ROLE_LABELS[row.role_key] || row.role_key : ""}
          {row.template_slug ? (
            <div className="text-[12px] text-white/40">{row.template_slug}</div>
          ) : null}
        </td>
        <td
          className="px-4 py-3.5 tabular-nums text-white/70"
          title="C clarity, E ease, R realism, A accuracy, T trust (1 to 5)"
        >
          {ratingSummary || ""}
        </td>
        <td className="px-4 py-3.5 text-white/70">{row.interview_value || ""}</td>
        <td className="px-4 py-3.5 text-white/70">{row.candidate_pilot_interest || ""}</td>
        <td className="px-4 py-3.5 text-right">
          {hasDetails ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              className="rounded-[6px] border border-white/[0.14] px-2.5 py-1 text-[12px] text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              {isOpen ? "Hide" : "Details"}
            </button>
          ) : null}
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-b border-white/[0.05] bg-white/[0.015]">
          <td colSpan={8} className="px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                {quotes.map(([key, value]) => (
                  <QuoteBlock key={key} label={TEXT_LABELS[key] || key} text={value} />
                ))}
                {evidence?.mostUseful || evidence?.leastUseful || evidence?.scorePreference ? (
                  <div className="text-[13px] text-white/70">
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-white/40">
                      Evidence preferences
                    </p>
                    <p className="mt-1">
                      {evidence?.mostUseful ? `Most useful: ${evidence.mostUseful}. ` : ""}
                      {evidence?.leastUseful ? `Least useful: ${evidence.leastUseful}. ` : ""}
                      {evidence?.scorePreference ? `Prefers: ${evidence.scorePreference}.` : ""}
                    </p>
                  </div>
                ) : null}
                <div className="text-[12px] text-white/45">
                  Completed without help: {row.completed_without_help || "no answer"}. Duration:{" "}
                  {row.duration_opinion || "no answer"}. Trusted score:{" "}
                  {row.trust_score || "no answer"}. Contact ok:{" "}
                  {row.contact_ok === null ? "no answer" : row.contact_ok ? "yes" : "no"}.
                </div>
              </div>
              <div className="space-y-4">
                {roleAnswers.length > 0 ? (
                  roleAnswers.map((qa) => (
                    <QuoteBlock key={qa.question} label={qa.question} text={qa.answer} />
                  ))
                ) : (
                  <p className="text-[13px] text-white/40">No role-specific answers.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
