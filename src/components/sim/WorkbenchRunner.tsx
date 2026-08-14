"use client";

/**
 * Professional workbench runtime for the micro → v2 vertical slice.
 * Prefers the candidate-safe `workbench` payload from GET /api/sim/sessions/{id}.
 * Never imports microToV2 (answer keys) on the client.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FydellMark from "@/components/brand/FydellMark";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { StatusTag } from "@/components/ui/StatusTag";
import type {
  CandidateModuleV2,
  CandidateSimulationViewV2,
  CandidateStakeholderV2,
} from "@/lib/simulations/v2/candidate-view";

const DISCLOSURE_KEY = "__aiDisclosure";
const REVIEW_ID = "__review";

interface Disclosure {
  used: boolean;
  note?: string;
}
type Answer = string | number | string[] | Disclosure;

interface Message {
  id: string;
  thread: string;
  sender: string;
  body: string;
}

interface MicroFallback {
  format: "micro";
  slug: string;
  roleKey: string;
  title: string;
  tagline: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  resources: { id: string; title: string; kind: string; content: string }[];
  stakeholder: { id: string; name: string; role: string; blurb: string };
  questions: {
    id: string;
    kind: string;
    prompt: string;
    helpText?: string;
    options?: string[];
    maxChars?: number;
  }[];
}

interface Payload {
  session: {
    id: string;
    status: string;
    durationMinutes: number;
    startedAt: string | null;
    endsAt: string | null;
    curveballPresentedAt?: string | null;
    curveballAcknowledgedAt?: string | null;
  };
  content: MicroFallback;
  workbench?: CandidateSimulationViewV2;
  gate?: {
    consentPolicyVersion: string;
    consentAccepted: boolean;
    preflightOk: boolean;
    preflightLimitations: string[];
    desktopRequired: boolean;
  };
  state: {
    revision: number;
    currentTaskId: string | null;
    deliverable: Record<string, Answer>;
    workspace?: Record<string, unknown> | null;
  };
  messages: Message[];
}

interface WorkspaceState {
  activeModuleId: string;
  openedResources: string[];
  flaggedRows: Record<string, string[]>;
  /** SE: requirement item ids mapped / flagged against capabilities. */
  mappedRequirements?: string[];
  /** Support: currently selected ticket id. */
  selectedTicketId?: string | null;
  /** Implementation: completed cutover step ids. */
  toggledSteps?: string[];
  /** BSA: expanded / reviewed rule ids. */
  reviewedRules?: string[];
  semanticEventsLocal?: { type: string; at: string; resourceId?: string; moduleId?: string }[];
}

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isAnswered(v: Answer | undefined): boolean {
  return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
}

/** Parse pipe markdown tables from authored resource content. */
export function parseMarkdownTables(content: string): { headers: string[]; rows: string[][] }[] {
  const lines = content.split("\n");
  const tables: { headers: string[]; rows: string[][] }[] = [];
  let i = 0;
  const parseRow = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => !(idx === 0 && arr[0] === "") && !(idx === arr.length - 1 && arr[arr.length - 1] === ""));

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (line?.includes("|") && next && /^[\s|:-]+$/.test(next)) {
      const headers = parseRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && !/^[\s|:-]+$/.test(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      if (headers.length) tables.push({ headers, rows });
      continue;
    }
    i++;
  }
  return tables;
}

function moduleLabel(m: CandidateModuleV2): string {
  if (m.kind === "briefing") return m.title || "Briefing";
  if (m.kind === "resource_table" || m.kind === "resource_doc") return m.title;
  if (m.kind === "data_workbench") return m.title || "Data workbench";
  if (m.kind === "requirements_board") return m.title || "Requirements board";
  if (m.kind === "ticket_queue") return m.title || "Ticket queue";
  if (m.kind === "cutover_plan") return m.title || "Cutover plan";
  if (m.kind === "rules_panel") return m.title || "Rules";
  if (m.kind === "structured_decision") return "Decision";
  if (m.kind === "written_deliverable") return "Written response";
  if (m.kind === "stakeholder") return m.title || "Stakeholder";
  if (m.kind === "curveball") return "Update";
  return "Module";
}

function parseBulletItems(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.match(/^\s*[-*]\s+(.+)$/)?.[1]?.replace(/\*\*/g, "").trim())
    .filter((x): x is string => Boolean(x));
}

function inferTicketSeverity(report: string): "critical" | "high" | "medium" | "low" {
  const t = report.toLowerCase();
  if (/whole team|locked out|all users|outage/.test(t)) return "critical";
  if (/intermittent|half the time|can't log|cannot log|fails/.test(t)) return "high";
  if (/one user|recently changed|password/.test(t)) return "low";
  return "medium";
}

function parseTicketsFromTable(content: string): {
  id: string;
  customer: string;
  time: string;
  report: string;
  severity: "critical" | "high" | "medium" | "low";
}[] {
  const tables = parseMarkdownTables(content);
  const table = tables[0];
  if (!table) return [];
  return table.rows.map((cells, idx) => {
    const id = cells[0] || `ticket_${idx}`;
    const customer = cells[1] || "";
    const time = cells[2] || "";
    const report = cells[3] || cells.slice(1).join(" · ");
    return { id, customer, time, report, severity: inferTicketSeverity(report) };
  });
}

function parseRulesFromTable(content: string): {
  id: string;
  condition: string;
  routesTo: string;
}[] {
  const tables = parseMarkdownTables(content);
  const table = tables[0];
  if (!table) return [];
  return table.rows.map((cells, idx) => ({
    id: cells[0] || `rule_${idx}`,
    condition: cells[1] || "",
    routesTo: cells[2] || "",
  }));
}

function fallbackWorkbench(content: MicroFallback): CandidateSimulationViewV2 {
  const modules: CandidateModuleV2[] = [
    { id: "briefing", kind: "briefing", title: "Mission", body: content.mission },
  ];
  const role = content.roleKey;
  const resources =
    role === "bi_analyst"
      ? [
          ...content.resources.filter((r) => r.kind !== "table"),
          ...content.resources.filter((r) => r.kind === "table"),
        ]
      : content.resources;
  const tableResourceIds: string[] = [];
  for (const r of resources) {
    if (r.kind === "table") {
      tableResourceIds.push(r.id);
      modules.push({
        id: `resource_${r.id}`,
        kind: "resource_table",
        resourceId: r.id,
        title: r.title,
        content: r.content,
      });
    } else {
      modules.push({
        id: `resource_${r.id}`,
        kind: "resource_doc",
        resourceId: r.id,
        title: r.title,
        content: r.content,
      });
    }
  }

  const allTableIds = content.resources.filter((r) => r.kind === "table").map((r) => r.id);
  if ((role === "data_analyst" || role === "bi_analyst") && allTableIds.length > 0) {
    modules.push({
      id: "workbench",
      kind: "data_workbench",
      title: role === "bi_analyst" ? "Metric workbench" : "Data workbench",
      instructions:
        role === "bi_analyst"
          ? "Start with the metric definition docs, then inspect the linked tables and flag rows that support your decision."
          : "Inspect the tables, sort or filter as needed, and flag rows that support your decision.",
      tableResourceIds: [...allTableIds],
    });
  } else if (role === "solutions_engineer") {
    const req = content.resources.find((r) => /requirement/i.test(`${r.id} ${r.title}`));
    const caps = content.resources.find((r) => /capacit|product/i.test(`${r.id} ${r.title}`));
    if (req && caps) {
      modules.push({
        id: "requirements_board",
        kind: "requirements_board",
        title: "Requirements vs capabilities",
        instructions:
          "Map each customer requirement to product support. Flag gaps before you commit an architecture.",
        requirementsResourceId: req.id,
        capabilitiesResourceId: caps.id,
      });
    }
  } else if (role === "technical_support_engineer") {
    const tickets = content.resources.find((r) => /ticket/i.test(`${r.id} ${r.title}`));
    if (tickets) {
      modules.push({
        id: "ticket_queue",
        kind: "ticket_queue",
        title: "Ticket queue",
        instructions: "Triage by severity. Select a ticket to inspect the report detail.",
        ticketResourceId: tickets.id,
      });
    }
  } else if (role === "implementation_consultant") {
    const md = content.resources.filter((r) => r.kind !== "table");
    const steps = md.flatMap((r) =>
      parseBulletItems(r.content).map((label, i) => ({
        id: `step_${r.id}_${i}`,
        label,
        detail: r.title,
      }))
    );
    modules.push({
      id: "cutover_plan",
      kind: "cutover_plan",
      title: "Cutover checklist",
      instructions:
        "Work the dependency steps in order. Toggle each step as you confirm it before go-live.",
      steps:
        steps.length > 0
          ? steps
          : content.resources.map((r, i) => ({
              id: `step_${i + 1}`,
              label: `Review: ${r.title}`,
            })),
      sourceResourceIds: md.map((r) => r.id),
    });
  } else if (role === "business_systems_analyst") {
    const rules = content.resources.find((r) => /rule|approval/i.test(`${r.id} ${r.title}`));
    if (rules) {
      modules.push({
        id: "rules_panel",
        kind: "rules_panel",
        title: "Workflow rules",
        instructions:
          "Review each rule in evaluation order. Expand a rule to see its condition and routing.",
        rulesResourceId: rules.id,
      });
    }
  }

  for (const q of content.questions) {
    if (q.kind === "text") {
      modules.push({
        id: q.id,
        kind: "written_deliverable",
        prompt: q.prompt,
        helpText: q.helpText,
        maxChars: q.maxChars,
        competencyKey: "written",
      });
    } else {
      modules.push({
        id: q.id,
        kind: "structured_decision",
        prompt: q.prompt,
        helpText: q.helpText,
        decisionKind: q.kind as "single_select" | "multi_select" | "number",
        options: q.options,
        competencyKey: "decision",
      });
    }
  }
  modules.push({
    id: "stakeholder",
    kind: "stakeholder",
    stakeholderId: content.stakeholder.id,
    title: `Ask ${content.stakeholder.name}`,
  });
  return {
    format: "v2",
    schemaVersion: 2,
    id: `v2:${content.slug}`,
    slug: content.slug,
    roleKey: content.roleKey,
    title: content.title,
    tagline: content.tagline,
    mission: content.mission,
    companyName: content.companyName,
    durationMinutes: content.durationMinutes,
    version: 1,
    modules,
    competencies: [],
    stakeholders: [content.stakeholder],
    opportunities: [],
  };
}

// ---------------------------------------------------------------------------
// Interactive table
// ---------------------------------------------------------------------------
function InteractiveTable({
  resourceId,
  title,
  content,
  flagged,
  locked,
  onFlag,
  onSort,
  onFilter,
}: {
  resourceId: string;
  title: string;
  content: string;
  flagged: string[];
  locked: boolean;
  onFlag: (rowId: string) => void;
  onSort: (column: string, direction: "asc" | "desc") => void;
  onFilter: (query: string) => void;
}) {
  const tables = useMemo(() => parseMarkdownTables(content), [content]);
  const table = tables[0] || { headers: [] as string[], rows: [] as string[][] };
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    let out = table.rows.map((cells, idx) => ({ id: `row_${idx}`, cells }));
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) => r.cells.some((c) => c.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      out = [...out].sort((a, b) => {
        const av = a.cells[sortCol] ?? "";
        const bv = b.cells[sortCol] ?? "";
        const an = parseFloat(av);
        const bn = parseFloat(bv);
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * sortDir;
        return av.localeCompare(bv) * sortDir;
      });
    }
    return out;
  }, [table.rows, query, sortCol, sortDir]);

  if (!table.headers.length) {
    return (
      <div className="whitespace-pre-wrap px-5 py-5 text-[14px] leading-relaxed text-[var(--text-primary)]">
        {content}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <p className="mr-auto text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
        <input
          type="search"
          value={query}
          disabled={locked}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (filterTimer.current) clearTimeout(filterTimer.current);
            filterTimer.current = setTimeout(() => onFilter(v), 400);
          }}
          placeholder="Filter rows…"
          aria-label={`Filter ${title}`}
          className="w-52 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--fydell-brand-blue)] focus:outline-none disabled:bg-[var(--surface-panel)]"
        />
        <span className="text-[12px] text-[var(--text-tertiary)]">
          {filtered.length} of {table.rows.length} · {flagged.length} flagged
        </span>
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-[var(--surface-canvas)]">
            <tr>
              <th className="w-10 border-b border-[var(--border-subtle)] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Flag
              </th>
              {table.headers.map((h, i) => (
                <th key={i} className="border-b border-[var(--border-subtle)] p-0 text-left">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      let nextDir: 1 | -1 = 1;
                      if (sortCol === i) nextDir = sortDir === 1 ? -1 : 1;
                      setSortCol(i);
                      setSortDir(nextDir);
                      onSort(h, nextDir === 1 ? "asc" : "desc");
                    }}
                    className="flex w-full items-center gap-1 px-3 py-2 font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed"
                  >
                    {h}
                    {sortCol === i && (
                      <span aria-hidden className="text-[var(--text-tertiary)]">
                        {sortDir === 1 ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isFlagged = flagged.includes(r.id);
              return (
                <tr
                  key={r.id}
                  onClick={() => !locked && onFlag(r.id)}
                  className={`cursor-pointer ${
                    isFlagged ? "bg-[var(--surface-selected)]" : "odd:bg-[var(--surface-raised)] even:bg-[var(--surface-panel)]"
                  } ${locked ? "cursor-not-allowed opacity-70" : "hover:bg-[var(--surface-hover)]"}`}
                >
                  <td className="border-b border-[var(--border-subtle)] px-2 py-1.5 text-center">
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 rounded-sm ${
                        isFlagged ? "bg-[var(--fydell-brand-blue)]" : "border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
                      }`}
                    />
                  </td>
                  {table.headers.map((_, ci) => (
                    <td
                      key={ci}
                      className="whitespace-nowrap border-b border-[var(--border-subtle)] px-3 py-1.5 font-mono text-[12.5px] text-[var(--text-primary)]"
                    >
                      {r.cells[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">No rows match that filter.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export function WorkbenchRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [activeModuleId, setActiveModuleId] = useState("briefing");
  const [openedResources, setOpenedResources] = useState<string[]>([]);
  const [flaggedRows, setFlaggedRows] = useState<Record<string, string[]>>({});
  const [mappedRequirements, setMappedRequirements] = useState<string[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [toggledSteps, setToggledSteps] = useState<string[]>([]);
  const [reviewedRules, setReviewedRules] = useState<string[]>([]);
  const [activeTableTab, setActiveTableTab] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const [now, setNow] = useState(() => Date.now());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatDelivered, setChatDelivered] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [preflightMsg, setPreflightMsg] = useState<string | null>(null);
  const [tabBlocked, setTabBlocked] = useState(false);
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine
  );
  const [curveballBanner, setCurveballBanner] = useState<{
    announcement: string;
    requiredAdaptation: string;
  } | null>(null);

  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const retryQueueRef = useRef<(() => Promise<void>)[]>([]);
  const persistRef = useRef<() => Promise<void>>(async () => {});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const drawerInputRef = useRef<HTMLTextAreaElement>(null);
  const semanticLocalRef = useRef<WorkspaceState["semanticEventsLocal"]>([]);

  const emitEvent = useCallback(
    (eventType: string, opts?: { resourceId?: string; taskId?: string; payload?: Record<string, unknown>; clientEventId?: string }) => {
      semanticLocalRef.current = [
        ...(semanticLocalRef.current || []).slice(-40),
        {
          type: eventType,
          at: new Date().toISOString(),
          resourceId: opts?.resourceId,
          moduleId: opts?.taskId,
        },
      ];
      dirtyRef.current = true;
      setSaveStatus("pending");
      void fetch(`/api/sim/sessions/${sessionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          resourceId: opts?.resourceId,
          taskId: opts?.taskId,
          payload: opts?.payload,
          clientEventId: opts?.clientEventId ?? `${eventType}_${uid()}`,
        }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the evaluation");
      const p = data as Payload;
      setPayload(p);
      setMessages(p.messages.filter((m) => m.thread === "stakeholder"));
      revisionRef.current = p.state.revision;
      if (!dirtyRef.current) {
        setAnswers((p.state.deliverable || {}) as Record<string, Answer>);
        const ws = (p.state.workspace || {}) as Partial<WorkspaceState>;
        if (typeof ws.activeModuleId === "string" && ws.activeModuleId) {
          setActiveModuleId(ws.activeModuleId);
        } else if (p.state.currentTaskId) {
          setActiveModuleId(p.state.currentTaskId);
        }
        if (Array.isArray(ws.openedResources)) {
          setOpenedResources(ws.openedResources.filter((x): x is string => typeof x === "string"));
        }
        if (ws.flaggedRows && typeof ws.flaggedRows === "object") {
          const next: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(ws.flaggedRows)) {
            if (Array.isArray(v)) next[k] = v.filter((x): x is string => typeof x === "string");
          }
          setFlaggedRows(next);
        }
        if (Array.isArray(ws.mappedRequirements)) {
          setMappedRequirements(ws.mappedRequirements.filter((x): x is string => typeof x === "string"));
        }
        if (typeof ws.selectedTicketId === "string" || ws.selectedTicketId === null) {
          setSelectedTicketId(ws.selectedTicketId ?? null);
        }
        if (Array.isArray(ws.toggledSteps)) {
          setToggledSteps(ws.toggledSteps.filter((x): x is string => typeof x === "string"));
        }
        if (Array.isArray(ws.reviewedRules)) {
          setReviewedRules(ws.reviewedRules.filter((x): x is string => typeof x === "string"));
        }
        if (Array.isArray(ws.semanticEventsLocal)) {
          semanticLocalRef.current = ws.semanticEventsLocal as WorkspaceState["semanticEventsLocal"];
        }
      }
      setLoadError(null);
      if (
        p.session.status === "submitted" ||
        p.session.status === "analyzed" ||
        p.session.status === "report_ready"
      ) {
        router.replace(`/sim/${sessionId}/result`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the evaluation");
    }
  }, [sessionId, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Second-tab lock: only one active writer per session.
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(`fydell-sim-${sessionId}`);
    const tabId = uid();
    channel.postMessage({ type: "hello", tabId });
    channel.onmessage = (ev) => {
      const data = ev.data as { type?: string; tabId?: string };
      if (data?.type === "hello" && data.tabId !== tabId) {
        channel.postMessage({ type: "claim", tabId });
      }
      if (data?.type === "claim" && data.tabId !== tabId) {
        setTabBlocked(true);
      }
      if (data?.type === "release" && data.tabId !== tabId) {
        setTabBlocked(false);
      }
    };
    channel.postMessage({ type: "claim", tabId });
    return () => {
      channel.postMessage({ type: "release", tabId });
      channel.close();
    };
  }, [sessionId]);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      const queue = retryQueueRef.current.splice(0);
      void (async () => {
        for (const job of queue) await job();
      })();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Poll curveball presentation after a fair investigation window.
  useEffect(() => {
    if (!payload || payload.session.status !== "active") return;
    if (payload.session.curveballPresentedAt || curveballBanner) return;
    const t = setInterval(() => {
      void fetch(`/api/sim/sessions/${sessionId}/curveball`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "present" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.presented && data.announcement) {
            setCurveballBanner({
              announcement: data.announcement,
              requiredAdaptation: data.requiredAdaptation || "",
            });
            void load();
          }
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [payload, sessionId, curveballBanner, load]);

  const persist = useCallback(async () => {
    if (tabBlocked) return;
    if (savingRef.current || !dirtyRef.current) return;
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveStatus("saving");
    const workspace: WorkspaceState = {
      activeModuleId,
      openedResources,
      flaggedRows,
      mappedRequirements,
      selectedTicketId,
      toggledSteps,
      reviewedRules,
      semanticEventsLocal: semanticLocalRef.current,
    };
    const body = {
      baseRevision: revisionRef.current,
      deliverable: answers,
      currentTaskId: activeModuleId === REVIEW_ID ? activeModuleId : activeModuleId,
      workspace,
    };
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        dirtyRef.current = true;
        setSaveStatus("error");
        setOffline(true);
        retryQueueRef.current.push(async () => {
          dirtyRef.current = true;
          await persistRef.current();
        });
        return;
      }
      const res = await fetch(`/api/sim/sessions/${sessionId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        revisionRef.current = data.revision;
        setSaveStatus(dirtyRef.current ? "pending" : "saved");
        setOffline(false);
      } else if (res.status === 409 && data.conflict) {
        revisionRef.current = data.conflict.revision;
        dirtyRef.current = true;
        setSaveStatus("pending");
      } else {
        dirtyRef.current = true;
        setSaveStatus("error");
      }
    } catch {
      dirtyRef.current = true;
      setSaveStatus("error");
      setOffline(true);
      retryQueueRef.current.push(async () => {
        dirtyRef.current = true;
        await persistRef.current();
      });
    } finally {
      savingRef.current = false;
    }
  }, [
    sessionId,
    answers,
    activeModuleId,
    openedResources,
    flaggedRows,
    mappedRequirements,
    selectedTicketId,
    toggledSteps,
    reviewedRules,
    tabBlocked,
  ]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!payload || payload.session.status !== "active" || !dirtyRef.current) return;
    const t = setTimeout(() => void persist(), 900);
    return () => clearTimeout(t);
  }, [
    answers,
    activeModuleId,
    openedResources,
    flaggedRows,
    mappedRequirements,
    selectedTicketId,
    toggledSteps,
    reviewedRules,
    payload,
    persist,
  ]);

  useEffect(() => {
    if (saveStatus !== "error") return;
    const t = setTimeout(() => void persist(), 3500);
    return () => clearTimeout(t);
  }, [saveStatus, persist]);

  const setAnswer = (id: string, value: Answer, eventType?: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    dirtyRef.current = true;
    setSaveStatus("pending");
    if (eventType) {
      emitEvent(eventType, {
        taskId: id,
        payload: { field: id, value },
        clientEventId: `${eventType}_${id}_${uid()}`,
      });
    }
  };

  const markResourceOpened = (resourceId: string) => {
    setOpenedResources((prev) => {
      if (prev.includes(resourceId)) return prev;
      dirtyRef.current = true;
      setSaveStatus("pending");
      return [...prev, resourceId];
    });
    emitEvent("resource_opened", {
      resourceId,
      clientEventId: `open_${resourceId}`,
    });
  };

  const focusModule = (id: string, modules: CandidateModuleV2[]) => {
    const mod = modules.find((m) => m.id === id);
    if (mod?.kind === "stakeholder") {
      setDrawerOpen(true);
      return;
    }
    setActiveModuleId(id);
    dirtyRef.current = true;
    setSaveStatus("pending");
    if (mod?.kind === "resource_table" || mod?.kind === "resource_doc") {
      markResourceOpened(mod.resourceId);
    }
    if (mod?.kind === "data_workbench") {
      const first = mod.tableResourceIds[0];
      if (first) {
        setActiveTableTab(first);
        markResourceOpened(first);
      }
    }
    if (mod?.kind === "requirements_board") {
      markResourceOpened(mod.requirementsResourceId);
      markResourceOpened(mod.capabilitiesResourceId);
    }
    if (mod?.kind === "ticket_queue") {
      markResourceOpened(mod.ticketResourceId);
    }
    if (mod?.kind === "cutover_plan") {
      for (const rid of mod.sourceResourceIds) markResourceOpened(rid);
    }
    if (mod?.kind === "rules_panel") {
      markResourceOpened(mod.rulesResourceId);
      for (const rid of mod.contextResourceIds || []) markResourceOpened(rid);
    }
  };

  const toggleFlag = (resourceId: string, rowId: string) => {
    setFlaggedRows((prev) => {
      const current = prev[resourceId] || [];
      const next = current.includes(rowId)
        ? current.filter((x) => x !== rowId)
        : [...current, rowId];
      return { ...prev, [resourceId]: next };
    });
    dirtyRef.current = true;
    setSaveStatus("pending");
    emitEvent("row_flagged", {
      resourceId,
      payload: { rowId },
      clientEventId: `flag_${resourceId}_${rowId}_${uid()}`,
    });
  };

  useEffect(() => {
    if (drawerOpen) {
      chatEndRef.current?.scrollIntoView({ block: "end" });
      drawerInputRef.current?.focus();
    }
  }, [messages, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen && !exitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setExitOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, exitOpen]);

  const sendChat = async (stakeholder: CandidateStakeholderV2) => {
    const text = chatDraft.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    setChatError(null);
    setChatDelivered(false);
    const clientMsgId = uid();
    const optimistic: Message = {
      id: `local_${clientMsgId}`,
      thread: "stakeholder",
      sender: "candidate",
      body: text,
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatDraft("");
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stakeholderId: stakeholder.id, text, clientMsgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message failed to send");
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== optimistic.id);
        const additions = [data.candidateMessage, data.reply].filter(Boolean) as Message[];
        return [...rest, ...additions];
      });
      setChatDelivered(true);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatDraft(text);
      setChatError(err instanceof Error ? err.message : "Message failed. Try again.");
    } finally {
      setChatBusy(false);
    }
  };

  const submit = async () => {
    if (submitBusy || !payload) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const rawDisclosure = answers[DISCLOSURE_KEY] as Disclosure | undefined;
      const note = rawDisclosure?.note?.trim();
      const disclosure: Disclosure = {
        used: Boolean(rawDisclosure?.used),
        ...(rawDisclosure?.used && note ? { note } : {}),
      };

      for (let i = 0; i < 20 && savingRef.current; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
      dirtyRef.current = true;
      await persist();

      const res = await fetch(`/api/sim/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { ...answers, [DISCLOSURE_KEY]: disclosure },
          externalAiDisclosed: disclosure.used,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      await fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(() => {});
      router.push(`/sim/${sessionId}/result`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Your work is saved.");
      setSubmitBusy(false);
    }
  };

  const runPreflight = async () => {
    setPreflightBusy(true);
    setPreflightMsg(null);
    try {
      let localStorageOk = true;
      try {
        window.localStorage.setItem("__fydell_pf", "1");
        window.localStorage.removeItem("__fydell_pf");
      } catch {
        localStorageOk = false;
      }
      const res = await fetch(`/api/sim/sessions/${sessionId}/preflight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          userAgent: navigator.userAgent,
          localStorageOk,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preflight failed");
      if (!data.canStart) {
        setPreflightMsg(
          (data.result?.limitations || []).join(" ") ||
            "Desktop and network checks did not pass. Use a laptop or desktop."
        );
      } else {
        setPreflightMsg("Checks passed. You can start when consent is accepted.");
      }
      await load();
    } catch (err) {
      setPreflightMsg(err instanceof Error ? err.message : "Preflight failed");
    } finally {
      setPreflightBusy(false);
    }
  };

  const acceptConsent = async () => {
    if (!consentChecked || !payload?.gate) return;
    setConsentBusy(true);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted: true,
          policyVersion: payload.gate.consentPolicyVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record consent");
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not record consent");
    } finally {
      setConsentBusy(false);
    }
  };

  const startSession = async () => {
    setSubmitBusy(true);
    try {
      if (!payload?.gate?.consentAccepted) {
        throw new Error("Accept the consent terms before starting.");
      }
      if (!payload?.gate?.preflightOk) {
        await runPreflight();
        throw new Error("Complete the desktop and network checks before starting.");
      }
      const res = await fetch(`/api/sim/sessions/${sessionId}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not start");
      }
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setSubmitBusy(false);
    }
  };

  const workbench = useMemo(() => {
    if (!payload) return null;
    return payload.workbench || fallbackWorkbench(payload.content);
  }, [payload]);

  const resourceById = useMemo(() => {
    const map = new Map<string, { title: string; content: string; kind: string }>();
    if (!workbench || !payload) return map;
    for (const m of workbench.modules) {
      if (m.kind === "resource_table" || m.kind === "resource_doc") {
        map.set(m.resourceId, { title: m.title, content: m.content, kind: m.kind });
      }
    }
    for (const r of payload.content.resources) {
      if (!map.has(r.id)) {
        map.set(r.id, { title: r.title, content: r.content, kind: r.kind });
      }
    }
    return map;
  }, [workbench, payload]);

  const tableByResource = useMemo(() => {
    const map = new Map<string, { title: string; content: string }>();
    for (const [id, meta] of resourceById) {
      if (meta.kind === "table" || meta.kind === "resource_table") {
        map.set(id, { title: meta.title, content: meta.content });
      }
    }
    return map;
  }, [resourceById]);

  if (loadError) {
    return (
      <Center>
        <p className="text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          {loadError}
        </p>
        <div className="mt-4">
          <Button variant="primary" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </Center>
    );
  }
  if (!payload || !workbench) {
    return (
      <Center>
        <p className="text-[15px] text-[var(--text-secondary)]" role="status">
          Loading your evaluation.
        </p>
      </Center>
    );
  }

  const stakeholder = workbench.stakeholders[0] || {
    id: payload.content.stakeholder.id,
    name: payload.content.stakeholder.name,
    role: payload.content.stakeholder.role,
    blurb: payload.content.stakeholder.blurb,
  };
  const roleTitle = ROLE_TITLES[workbench.roleKey] || workbench.roleKey;
  const modules = workbench.modules;
  const navModules = modules.filter((m) => m.kind !== "curveball");

  if (payload.session.status === "accepted") {
    const gate = payload.gate;
    const consentOk = Boolean(gate?.consentAccepted);
    const preflightOk = Boolean(gate?.preflightOk);
    return (
      <Center wide>
        <p className="text-[13px] font-medium text-[var(--text-tertiary)]">
          {roleTitle} · {workbench.durationMinutes} minutes · desktop required
        </p>
        <h1 className="mt-2 text-[clamp(1.4rem,2.6vw,1.75rem)] font-medium leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
          {workbench.title}
        </h1>
        <p className="mt-3.5 max-w-[62ch] text-[15px] leading-[1.65] text-[var(--text-secondary)]">
          {workbench.mission}
        </p>

        <Surface tone="panel" className="mt-7 overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              What happens once you start
            </h2>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              You have {workbench.durationMinutes} minutes in one sitting. The clock
              starts when you press the button at the bottom of this page, not
              before.
            </li>
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Your work saves as you go. If your connection drops or you close the
              tab by accident, you can come back to it, though the clock keeps
              running.
            </li>
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              You can ask {stakeholder.name}, the {stakeholder.role.toLowerCase()},
              questions at any point. Doing so is part of the work, not a penalty.
            </li>
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Something may change partway through, as it would at work. You are
              not being tricked; you are being given new information.
            </li>
          </ul>
        </Surface>

        <Surface tone="panel" className="mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              System check
            </h2>
            {preflightOk ? (
              <StatusTag tone="good">Passed</StatusTag>
            ) : (
              <StatusTag tone="neutral">Not run</StatusTag>
            )}
          </div>
          <div className="px-4 py-3.5">
            <p className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              {preflightOk
                ? "Your browser, screen size and connection to Fydell are all fine."
                : "This checks your browser, your screen size and whether you can reach Fydell. It takes a second and finds problems now rather than at minute twelve."}
            </p>
            {gate?.preflightLimitations?.length || preflightMsg ? (
              <p className="mt-2.5 text-[13px] leading-[1.6] text-[var(--fydell-changed)]">
                {preflightMsg || gate?.preflightLimitations?.join(" ")}
              </p>
            ) : null}
            <div className="mt-3.5">
              <Button
                variant="secondary"
                size="sm"
                loading={preflightBusy}
                onClick={() => void runPreflight()}
              >
                {preflightOk ? "Run the check again" : "Run the check"}
              </Button>
            </div>
          </div>
        </Surface>

        <Surface tone="panel" className="mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              Your consent
            </h2>
            {consentOk ? <StatusTag tone="good">Recorded</StatusTag> : null}
          </div>
          <div className="px-4 py-3.5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-[3px] h-[15px] w-[15px] shrink-0 accent-[var(--fydell-evidence)]"
                checked={consentOk || consentChecked}
                disabled={consentOk}
                onChange={(e) => setConsentChecked(e.target.checked)}
              />
              <span className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                I understand that what I open, ask, write and submit inside this
                workspace is recorded and shown to the company that invited me,
                that use of the assistant inside the workspace is observed rather
                than banned, and that I will be able to keep my own copy of this
                work afterwards.
              </span>
            </label>
            <p className="mt-2.5 pl-[27px] text-[12.5px] text-[var(--text-tertiary)]">
              Policy version {gate?.consentPolicyVersion || "current"}. This box is
              never ticked for you.
            </p>
            {!consentOk ? (
              <div className="mt-3.5 pl-[27px]">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={consentBusy}
                  disabled={!consentChecked}
                  onClick={() => void acceptConsent()}
                >
                  Record my consent
                </Button>
              </div>
            ) : null}
          </div>
        </Surface>

        {loadError ? (
          <p className="mt-4 text-[13px] text-[var(--fydell-risk)]" role="alert">
            {loadError}
          </p>
        ) : null}

        <div className="mt-7">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            loading={submitBusy}
            disabled={!consentOk || !preflightOk}
            onClick={() => void startSession()}
          >
            Start now: {workbench.durationMinutes} minutes
          </Button>
          {!consentOk || !preflightOk ? (
            <p className="mt-2.5 text-[13px] text-[var(--text-tertiary)]">
              {!preflightOk && !consentOk
                ? "Run the system check and record your consent first."
                : !preflightOk
                  ? "Run the system check first."
                  : "Record your consent first."}
            </p>
          ) : null}
        </div>
      </Center>
    );
  }

  if (tabBlocked) {
    return (
      <Center>
        <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          This evaluation is open in another tab
        </h1>
        <p className="mt-3 text-[14px] leading-[1.65] text-[var(--text-secondary)]">
          Two tabs writing to the same session can overwrite each other, so only
          one runs at a time. Carry on in the other tab, or close it and continue
          here. Nothing you have written is lost either way.
        </p>
        <div className="mt-5">
          <Button variant="secondary" onClick={() => setTabBlocked(false)}>
            I closed the other tab
          </Button>
        </div>
      </Center>
    );
  }

  const remainingMs = payload.session.endsAt ? new Date(payload.session.endsAt).getTime() - now : 0;
  const remaining = Math.max(0, Math.floor(remainingMs / 1000));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const timeUp = remaining === 0;
  const locked = timeUp;

  const activeModule =
    activeModuleId === REVIEW_ID ? null : modules.find((m) => m.id === activeModuleId) || modules[0];
  const decisionModules = modules.filter((m) => m.kind === "structured_decision");
  const writtenModules = modules.filter((m) => m.kind === "written_deliverable");
  const disclosure = (answers[DISCLOSURE_KEY] as Disclosure | undefined) ?? { used: false };

  const firstName = stakeholder.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-4">
          <span className="inline-flex items-center gap-2" aria-label="Fydell">
            <FydellMark width={24} />
            <span
              className="text-[16px] leading-none tracking-tight text-[var(--text-primary)]"
              style={{ fontWeight: 560, letterSpacing: "-0.045em" }}
            >
              fydell
            </span>
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{workbench.title}</p>
            <p className="truncate text-[11.5px] text-[var(--text-tertiary)]">{roleTitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[12px] sm:inline" role="status" aria-live="polite">
              {offline && <span className="mr-2 font-medium text-[var(--fydell-changed)]">Offline</span>}
              {!offline && saveStatus === "saved" && (
                <span className="font-medium text-[var(--fydell-good)]">Saved</span>
              )}
              {!offline && (saveStatus === "saving" || saveStatus === "pending") && (
                <span className="font-medium text-[var(--fydell-changed)]">Saving…</span>
              )}
              {saveStatus === "error" && (
                <button
                  onClick={() => void persist()}
                  className="rounded bg-[rgba(242,107,130,0.1)] px-2 py-0.5 font-medium text-[var(--fydell-risk)] hover:bg-[rgba(242,107,130,0.16)]"
                >
                  Save failed — Retry
                </button>
              )}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 font-mono text-[14px] font-semibold tabular-nums ${
                timeUp
                  ? "bg-[rgba(242,107,130,0.1)] text-[var(--fydell-risk)]"
                  : remaining < 60
                    ? "bg-[rgba(233,185,73,0.1)] text-[var(--fydell-changed)]"
                    : "bg-[var(--surface-panel)] text-[var(--text-primary)]"
              }`}
              aria-label={timeUp ? "Time has ended" : `${mm} minutes ${ss} seconds remaining`}
            >
              {timeUp ? "0:00" : `${mm}:${ss}`}
            </span>
            <button
              onClick={() => setExitOpen(true)}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-canvas)]"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {timeUp && (
        <div className="border-b border-[rgba(233,185,73,0.28)] bg-[rgba(233,185,73,0.08)]">
          <p className="mx-auto max-w-[1280px] px-4 py-2 text-[13.5px] text-[var(--fydell-changed)]">
            Time has ended. Submit your current work.
          </p>
        </div>
      )}

      {(curveballBanner || payload.session.curveballPresentedAt) && (
        <div className="border-b border-[var(--fydell-brand-blue)]/30 bg-[var(--surface-selected)]">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">
                Mid-session update
              </p>
              <p className="mt-1 text-[13.5px] text-[var(--text-primary)]">
                {curveballBanner?.announcement ||
                  "Operations needs residual risk addressed before the next shift."}
              </p>
              {curveballBanner?.requiredAdaptation && (
                <p className="mt-1 text-[12.5px] text-[var(--text-secondary)]">
                  {curveballBanner.requiredAdaptation}
                </p>
              )}
            </div>
            {!payload.session.curveballAcknowledgedAt && (
              <button
                type="button"
                className="rounded-lg bg-[var(--fydell-brand-blue)] px-3 py-2 text-[12.5px] font-semibold text-white"
                onClick={() => {
                  void fetch(`/api/sim/sessions/${sessionId}/curveball`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "acknowledge" }),
                  }).then(() => load());
                }}
              >
                Acknowledge update
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1280px] flex-col gap-0 lg:flex-row">
        {/* Left rail */}
        <aside className="w-full shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] lg:sticky lg:top-14 lg:max-h-screen lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="space-y-5 p-4">
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">Briefing</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">{workbench.mission}</p>
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Modules</p>
              <ul className="mt-2 space-y-0.5">
                {navModules.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => focusModule(m.id, modules)}
                      aria-current={activeModuleId === m.id ? "true" : undefined}
                      className={
                        activeModuleId === m.id
                          ? "flex w-full items-center rounded-md bg-[var(--surface-selected)] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--fydell-brand-blue)]"
                          : "flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-canvas)]"
                      }
                    >
                      <span className="min-w-0 truncate">{moduleLabel(m)}</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModuleId(REVIEW_ID);
                      dirtyRef.current = true;
                      setSaveStatus("pending");
                    }}
                    aria-current={activeModuleId === REVIEW_ID ? "true" : undefined}
                    className={
                      activeModuleId === REVIEW_ID
                        ? "flex w-full items-center rounded-md bg-[var(--surface-selected)] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--fydell-brand-blue)]"
                        : "flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-canvas)]"
                    }
                  >
                    Review and submit
                  </button>
                </li>
              </ul>
            </section>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-3 text-left hover:border-[var(--fydell-brand-blue)]"
            >
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Ask {firstName}</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">{stakeholder.role}</p>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 pb-16 sm:p-6">
          {activeModuleId === REVIEW_ID ? (
            <div className="space-y-4">
              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
                <h2 className="text-[17px] font-semibold">Review before you submit</h2>
                <dl className="mt-4 space-y-4">
                  {decisionModules.map((m) => {
                    if (m.kind !== "structured_decision") return null;
                    const val = answers[m.id];
                    return (
                      <div key={m.id}>
                        <dt className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {m.prompt}
                        </dt>
                        <dd className="mt-0.5 text-[15px] text-[var(--text-primary)]">
                          {Array.isArray(val) ? (
                            val.length ? (
                              <ul className="list-disc space-y-0.5 pl-5">
                                {val.map((v) => (
                                  <li key={v}>{v}</li>
                                ))}
                              </ul>
                            ) : (
                              "Not selected yet."
                            )
                          ) : isAnswered(val) ? (
                            String(val)
                          ) : (
                            "Not chosen yet."
                          )}
                        </dd>
                      </div>
                    );
                  })}
                  {writtenModules.map((m) => {
                    if (m.kind !== "written_deliverable") return null;
                    return (
                      <div key={m.id}>
                        <dt className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {m.prompt}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-line text-[15px] text-[var(--text-primary)]">
                          {String(answers[m.id] ?? "").trim() || "Not written yet."}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={disclosure.used}
                    onChange={(e) =>
                      setAnswer(DISCLOSURE_KEY, { used: e.target.checked, note: disclosure.note })
                    }
                    className="mt-0.5 h-4 w-4 accent-[var(--fydell-brand-blue)]"
                  />
                  <span className="text-[15px]">
                    I used an external AI tool while completing this evaluation.
                  </span>
                </label>
                {disclosure.used && (
                  <input
                    type="text"
                    value={disclosure.note ?? ""}
                    onChange={(e) =>
                      setAnswer(DISCLOSURE_KEY, { used: true, note: e.target.value.slice(0, 200) })
                    }
                    maxLength={200}
                    placeholder="Optional: which tool and how you used it"
                    aria-label="How you used the AI tool (optional)"
                    className="mt-3 w-full rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-[14px] focus:border-[var(--fydell-brand-blue)] focus:outline-none"
                  />
                )}
                <p className="mt-3 text-[12.5px] text-[var(--text-tertiary)]">
                  Disclosure is welcome. It does not lower your score by itself.
                </p>
              </section>

              {submitError && (
                <p className="rounded-xl bg-[rgba(242,107,130,0.1)] px-4 py-3 text-[14px] text-[var(--fydell-risk)]" role="alert">
                  {submitError}
                </p>
              )}

              <button
                onClick={() => void submit()}
                disabled={submitBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--fydell-brand-blue)] px-6 py-3 text-[15px] font-semibold text-white hover:bg-[#6872ff] disabled:opacity-50"
              >
                {submitBusy && <Spinner />}
                {submitBusy ? "Submitting..." : "Submit my work"}
              </button>
            </div>
          ) : activeModule ? (
            <ModulePanel
              module={activeModule}
              answers={answers}
              locked={locked}
              flaggedRows={flaggedRows}
              mappedRequirements={mappedRequirements}
              selectedTicketId={selectedTicketId}
              toggledSteps={toggledSteps}
              reviewedRules={reviewedRules}
              resourceById={resourceById}
              tableByResource={tableByResource}
              activeTableTab={activeTableTab || (activeModule.kind === "data_workbench" ? activeModule.tableResourceIds[0] || "" : "")}
              onTableTab={(rid) => {
                setActiveTableTab(rid);
                markResourceOpened(rid);
              }}
              onAnswer={setAnswer}
              onFlag={toggleFlag}
              onMapRequirement={(itemId, resourceId) => {
                setMappedRequirements((prev) =>
                  prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
                );
                dirtyRef.current = true;
                setSaveStatus("pending");
                emitEvent("row_flagged", {
                  resourceId,
                  taskId: "requirements_board",
                  payload: { rowId: itemId, mapped: true },
                  clientEventId: `map_req_${itemId}_${uid()}`,
                });
              }}
              onSelectTicket={(ticketId, resourceId) => {
                setSelectedTicketId(ticketId);
                dirtyRef.current = true;
                setSaveStatus("pending");
                emitEvent("ticket_selected", {
                  resourceId,
                  taskId: "ticket_queue",
                  payload: { ticketId },
                  clientEventId: `ticket_${ticketId}_${uid()}`,
                });
              }}
              onToggleStep={(stepId) => {
                setToggledSteps((prev) =>
                  prev.includes(stepId) ? prev.filter((x) => x !== stepId) : [...prev, stepId]
                );
                dirtyRef.current = true;
                setSaveStatus("pending");
                emitEvent("step_toggled", {
                  taskId: "cutover_plan",
                  payload: { stepId },
                  clientEventId: `step_${stepId}_${uid()}`,
                });
              }}
              onReviewRule={(ruleId, resourceId) => {
                const opening = !reviewedRules.includes(ruleId);
                setReviewedRules((prev) =>
                  prev.includes(ruleId) ? prev.filter((x) => x !== ruleId) : [...prev, ruleId]
                );
                dirtyRef.current = true;
                setSaveStatus("pending");
                if (opening) {
                  emitEvent("rule_reviewed", {
                    resourceId,
                    taskId: "rules_panel",
                    payload: { ruleId },
                    clientEventId: `rule_${ruleId}`,
                  });
                }
              }}
              onSort={(resourceId, column, direction) =>
                emitEvent("table_sorted", {
                  resourceId,
                  payload: { column, direction },
                })
              }
              onFilter={(resourceId, query) =>
                emitEvent("table_filtered", {
                  resourceId,
                  payload: { query },
                })
              }
              onOpenStakeholder={() => setDrawerOpen(true)}
              stakeholderName={firstName}
            />
          ) : null}
        </main>
      </div>

      {/* Stakeholder drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Message ${stakeholder.name}`}
        >
          <button
            aria-label="Close conversation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--surface-raised)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold">{stakeholder.name}</p>
                <p className="text-[12.5px] text-[var(--text-tertiary)]">
                  {stakeholder.role} · {workbench.companyName}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-2.5 py-1 text-[13px] font-medium text-[var(--text-tertiary)] hover:bg-[var(--surface-canvas)]"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-[13.5px] text-[var(--text-tertiary)]">
                  {stakeholder.blurb} Ask about anything that seems unclear.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    m.sender === "candidate"
                      ? "ml-auto bg-[var(--fydell-brand-blue)] text-white"
                      : "bg-[var(--surface-canvas)] text-[var(--text-primary)]"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              ))}
              {chatBusy && (
                <p className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]" role="status">
                  <Spinner dark /> Sending...
                </p>
              )}
              {!chatBusy && !chatError && chatDelivered && (
                <p className="text-right text-[11.5px] text-[var(--text-tertiary)]" role="status">
                  Delivered
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            {chatError && (
              <div className="flex items-center justify-between gap-3 border-t border-[rgba(242,107,130,0.28)] bg-[rgba(242,107,130,0.08)] px-5 py-2">
                <p className="text-[12.5px] text-[var(--fydell-risk)]">{chatError}</p>
                <button
                  onClick={() => void sendChat(stakeholder)}
                  className="shrink-0 rounded-lg bg-[var(--fydell-risk)] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#d85a70]"
                >
                  Retry
                </button>
              </div>
            )}
            <form
              className="flex shrink-0 items-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendChat(stakeholder);
              }}
            >
              <textarea
                ref={drawerInputRef}
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat(stakeholder);
                  }
                }}
                rows={2}
                maxLength={2000}
                disabled={locked}
                placeholder={`Message ${firstName}...`}
                aria-label="Message"
                className="min-h-[46px] flex-1 resize-none rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 text-[14px] focus:border-[var(--fydell-brand-blue)] focus:outline-none disabled:bg-[var(--surface-panel)]"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim() || chatBusy || locked}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--fydell-brand-blue)] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#6872ff] disabled:opacity-40"
              >
                {chatBusy && <Spinner />}
                Send
              </button>
            </form>
          </aside>
        </div>
      )}

      {exitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Leave this evaluation?"
        >
          <button
            aria-label="Stay"
            onClick={() => setExitOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-xl">
            <h2 className="text-[16px] font-semibold">Leave this evaluation?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">
              Your work is saved and you can come back. The timer keeps running while you are away.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setExitOpen(false)}
                autoFocus
                className="rounded-lg border border-[var(--border-subtle)] px-4 py-2.5 text-[14px] font-medium hover:bg-[var(--surface-canvas)]"
              >
                Stay
              </button>
              <button
                onClick={() => router.push("/app/candidate")}
                className="rounded-lg bg-[var(--fydell-brand-blue)] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#6872ff]"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModulePanel({
  module,
  answers,
  locked,
  flaggedRows,
  mappedRequirements,
  selectedTicketId,
  toggledSteps,
  reviewedRules,
  resourceById,
  tableByResource,
  activeTableTab,
  onTableTab,
  onAnswer,
  onFlag,
  onMapRequirement,
  onSelectTicket,
  onToggleStep,
  onReviewRule,
  onSort,
  onFilter,
  onOpenStakeholder,
  stakeholderName,
}: {
  module: CandidateModuleV2;
  answers: Record<string, Answer>;
  locked: boolean;
  flaggedRows: Record<string, string[]>;
  mappedRequirements: string[];
  selectedTicketId: string | null;
  toggledSteps: string[];
  reviewedRules: string[];
  resourceById: Map<string, { title: string; content: string; kind: string }>;
  tableByResource: Map<string, { title: string; content: string }>;
  activeTableTab: string;
  onTableTab: (rid: string) => void;
  onAnswer: (id: string, value: Answer, eventType?: string) => void;
  onFlag: (resourceId: string, rowId: string) => void;
  onMapRequirement: (itemId: string, resourceId: string) => void;
  onSelectTicket: (ticketId: string, resourceId: string) => void;
  onToggleStep: (stepId: string) => void;
  onReviewRule: (ruleId: string, resourceId: string) => void;
  onSort: (resourceId: string, column: string, direction: "asc" | "desc") => void;
  onFilter: (resourceId: string, query: string) => void;
  onOpenStakeholder: () => void;
  stakeholderName: string;
}) {
  if (module.kind === "briefing") {
    return (
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">Briefing</p>
        <h2 className="mt-1 text-[18px] font-semibold">{module.title}</h2>
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {module.body}
        </p>
      </section>
    );
  }

  if (module.kind === "resource_doc") {
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <p className="text-[13.5px] font-semibold">{module.title}</p>
        </div>
        <div className="whitespace-pre-wrap px-5 py-5 text-[14.5px] leading-relaxed text-[var(--text-primary)]">
          {module.content}
        </div>
      </section>
    );
  }

  if (module.kind === "resource_table") {
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <InteractiveTable
          resourceId={module.resourceId}
          title={module.title}
          content={module.content}
          flagged={flaggedRows[module.resourceId] || []}
          locked={locked}
          onFlag={(rowId) => onFlag(module.resourceId, rowId)}
          onSort={(column, direction) => onSort(module.resourceId, column, direction)}
          onFilter={(query) => onFilter(module.resourceId, query)}
        />
      </section>
    );
  }

  if (module.kind === "data_workbench") {
    const ids = module.tableResourceIds;
    const activeId = activeTableTab || ids[0] || "";
    const active = tableByResource.get(activeId);
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <p className="text-[13.5px] font-semibold">{module.title}</p>
          {module.instructions && (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{module.instructions}</p>
          )}
        </div>
        {ids.length > 1 && (
          <div className="flex gap-1 border-b border-[var(--border-subtle)] px-3 pt-2">
            {ids.map((rid) => {
              const meta = tableByResource.get(rid);
              return (
                <button
                  key={rid}
                  onClick={() => onTableTab(rid)}
                  className={`rounded-t-md px-3 py-2 text-[13px] font-medium ${
                    rid === activeId
                      ? "border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--fydell-brand-blue)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {meta?.title || rid}
                </button>
              );
            })}
          </div>
        )}
        {active ? (
          <InteractiveTable
            resourceId={activeId}
            title={active.title}
            content={active.content}
            flagged={flaggedRows[activeId] || []}
            locked={locked}
            onFlag={(rowId) => onFlag(activeId, rowId)}
            onSort={(column, direction) => onSort(activeId, column, direction)}
            onFilter={(query) => onFilter(activeId, query)}
          />
        ) : (
          <p className="px-5 py-8 text-sm text-[var(--text-tertiary)]">No table resources available.</p>
        )}
      </section>
    );
  }

  if (module.kind === "requirements_board") {
    const req = resourceById.get(module.requirementsResourceId);
    const caps = resourceById.get(module.capabilitiesResourceId);
    const requirements = req ? parseBulletItems(req.content) : [];
    const capTables = caps ? parseMarkdownTables(caps.content) : [];
    const capTable = capTables[0] || { headers: [] as string[], rows: [] as string[][] };
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <p className="text-[13.5px] font-semibold">{module.title}</p>
          {module.instructions && (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{module.instructions}</p>
          )}
        </div>
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 py-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Requirements
              </p>
            </div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {requirements.map((item, idx) => {
                const itemId = `req_${idx}`;
                const mapped = mappedRequirements.includes(itemId);
                return (
                  <li key={itemId}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onMapRequirement(itemId, module.requirementsResourceId)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left text-[14px] ${
                        mapped ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-panel)]"
                      } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${
                          mapped ? "bg-[var(--fydell-brand-blue)]" : "border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
                        }`}
                      />
                      <span className="text-[var(--text-primary)]">{item}</span>
                    </button>
                  </li>
                );
              })}
              {requirements.length === 0 && (
                <li className="px-4 py-6 text-sm text-[var(--text-tertiary)]">No requirements listed.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 py-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Capabilities
              </p>
            </div>
            {capTable.headers.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {capTable.headers.map((h, i) => (
                        <th
                          key={i}
                          className="border-b border-[var(--border-subtle)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {capTable.rows.map((cells, ri) => {
                      const rowId = `cap_${ri}`;
                      const isFlagged = (flaggedRows[module.capabilitiesResourceId] || []).includes(
                        rowId
                      );
                      return (
                        <tr
                          key={rowId}
                          onClick={() => !locked && onFlag(module.capabilitiesResourceId, rowId)}
                          className={`cursor-pointer ${
                            isFlagged ? "bg-[var(--surface-selected)]" : "odd:bg-[var(--surface-raised)] even:bg-[var(--surface-panel)]"
                          } ${locked ? "cursor-not-allowed opacity-70" : "hover:bg-[var(--surface-hover)]"}`}
                        >
                          {cells.map((c, ci) => (
                            <td
                              key={ci}
                              className="border-b border-[var(--border-subtle)] px-3 py-2 text-[var(--text-primary)]"
                            >
                              {c}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="whitespace-pre-wrap px-4 py-4 text-[14px] text-[var(--text-primary)]">
                {caps?.content || "No capabilities listed."}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (module.kind === "ticket_queue") {
    const ticketRes = resourceById.get(module.ticketResourceId);
    const tickets = ticketRes ? parseTicketsFromTable(ticketRes.content) : [];
    const selected = tickets.find((t) => t.id === selectedTicketId) || null;
    const severityClass: Record<string, string> = {
      critical: "bg-[rgba(242,107,130,0.12)] text-[var(--fydell-risk)]",
      high: "bg-[rgba(233,185,73,0.12)] text-[var(--fydell-changed)]",
      medium: "bg-[var(--surface-panel)] text-[var(--text-secondary)]",
      low: "bg-[rgba(103,217,160,0.12)] text-[var(--fydell-good)]",
    };
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <p className="text-[13.5px] font-semibold">{module.title}</p>
          {module.instructions && (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{module.instructions}</p>
          )}
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ul className="divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelectTicket(t.id, module.ticketResourceId)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left ${
                    selectedTicketId === t.id ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-panel)]"
                  } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                      {t.id}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${severityClass[t.severity]}`}
                    >
                      {t.severity}
                    </span>
                    <span className="ml-auto text-[12px] text-[var(--text-tertiary)]">{t.time}</span>
                  </div>
                  <p className="text-[13.5px] text-[var(--text-secondary)]">{t.customer}</p>
                </button>
              </li>
            ))}
            {tickets.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--text-tertiary)]">No open tickets.</li>
            )}
          </ul>
          <div className="px-5 py-4">
            {selected ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">
                  Ticket detail
                </p>
                <h3 className="mt-1 font-mono text-[16px] font-semibold text-[var(--text-primary)]">
                  {selected.id}
                </h3>
                <p className="mt-1 text-[14px] text-[var(--text-secondary)]">{selected.customer}</p>
                <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">Reported {selected.time} UTC</p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--text-primary)]">
                  {selected.report}
                </p>
              </>
            ) : (
              <p className="text-[14px] text-[var(--text-tertiary)]">Select a ticket to inspect the report.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (module.kind === "cutover_plan") {
    const done = toggledSteps.length;
    const total = module.steps.length;
    return (
      <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <p className="text-[13.5px] font-semibold">{module.title}</p>
          {module.instructions && (
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{module.instructions}</p>
          )}
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {done} of {total} steps confirmed
          </p>
        </div>
        <ol className="divide-y divide-[var(--border-subtle)]">
          {module.steps.map((step, idx) => {
            const on = toggledSteps.includes(step.id);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onToggleStep(step.id)}
                  className={`flex w-full items-start gap-3 px-5 py-3.5 text-left ${
                    on ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-panel)]"
                  } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[12px] font-semibold text-[var(--text-tertiary)]">
                    {on ? "✓" : idx + 1}
                  </span>
                  <span>
                    <span
                      className={`block text-[14.5px] font-medium ${
                        on ? "text-[var(--fydell-brand-blue)] line-through decoration-[var(--fydell-brand-blue)]/40" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.detail && (
                      <span className="mt-0.5 block text-[12.5px] text-[var(--text-tertiary)]">{step.detail}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  if (module.kind === "rules_panel") {
    const rulesRes = resourceById.get(module.rulesResourceId);
    const rules = rulesRes ? parseRulesFromTable(rulesRes.content) : [];
    const context = (module.contextResourceIds || [])
      .map((id) => resourceById.get(id))
      .filter(Boolean) as { title: string; content: string }[];
    return (
      <section className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <p className="text-[13.5px] font-semibold">{module.title}</p>
            {module.instructions && (
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{module.instructions}</p>
            )}
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {rules.map((rule, idx) => {
              const open = reviewedRules.includes(rule.id);
              return (
                <li key={rule.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onReviewRule(rule.id, module.rulesResourceId)}
                    className={`flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left ${
                      open ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-panel)]"
                    } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                  >
                    <span>
                      <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                        {idx + 1}. {rule.id}
                      </span>
                      <span className="mt-0.5 block text-[13.5px] text-[var(--text-secondary)]">
                        {rule.condition || "No condition listed"}
                      </span>
                      {open && (
                        <span className="mt-2 block text-[14px] text-[var(--text-primary)]">
                          Routes to: <strong className="font-semibold">{rule.routesTo || "-"}</strong>
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[12px] font-medium text-[var(--text-tertiary)]">
                      {open ? "Reviewed" : "Expand"}
                    </span>
                  </button>
                </li>
              );
            })}
            {rules.length === 0 && (
              <li className="px-5 py-6 text-sm text-[var(--text-tertiary)]">No workflow rules found.</li>
            )}
          </ul>
        </div>
        {context.map((doc) => (
          <div key={doc.title} className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3">
              <p className="text-[13.5px] font-semibold">{doc.title}</p>
            </div>
            <div className="whitespace-pre-wrap px-5 py-4 text-[14px] leading-relaxed text-[var(--text-primary)]">
              {doc.content}
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (module.kind === "structured_decision") {
    return (
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">Decision</p>
        <h2 className="mt-1 text-[16px] font-semibold">{module.prompt}</h2>
        {module.helpText && <p className="mt-1 text-[13.5px] text-[var(--text-tertiary)]">{module.helpText}</p>}

        {module.decisionKind === "single_select" && (
          <div className="mt-4 space-y-2" role="radiogroup" aria-label={module.prompt}>
            {(module.options || []).map((o) => (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[15px] ${
                  answers[module.id] === o
                    ? "border-[var(--fydell-brand-blue)] bg-[var(--surface-selected)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <input
                  type="radio"
                  name={module.id}
                  checked={answers[module.id] === o}
                  disabled={locked}
                  onChange={() => onAnswer(module.id, o, "decision_selected")}
                  className="h-4 w-4 accent-[var(--fydell-brand-blue)]"
                />
                {o}
              </label>
            ))}
          </div>
        )}

        {module.decisionKind === "multi_select" && (
          <div className="mt-4 space-y-2" role="group" aria-label={module.prompt}>
            {(module.options || []).map((o) => {
              const selected =
                Array.isArray(answers[module.id]) && (answers[module.id] as string[]).includes(o);
              return (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[15px] ${
                    selected
                      ? "border-[var(--fydell-brand-blue)] bg-[var(--surface-selected)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={locked}
                    onChange={() => {
                      const current = Array.isArray(answers[module.id])
                        ? (answers[module.id] as string[])
                        : [];
                      onAnswer(
                        module.id,
                        selected ? current.filter((x) => x !== o) : [...current, o],
                        "evidence_selected"
                      );
                    }}
                    className="h-4 w-4 accent-[var(--fydell-brand-blue)]"
                  />
                  {o}
                </label>
              );
            })}
          </div>
        )}

        {module.decisionKind === "number" && (
          <input
            type="number"
            step="any"
            value={answers[module.id] === undefined ? "" : String(answers[module.id])}
            disabled={locked}
            onChange={(e) =>
              onAnswer(
                module.id,
                e.target.value === "" ? "" : Number(e.target.value),
                "decision_selected"
              )
            }
            aria-label={module.prompt}
            className="mt-4 w-56 rounded-lg border border-[var(--border-subtle)] px-3 py-3 font-mono text-[15px] focus:border-[var(--fydell-brand-blue)] focus:outline-none disabled:bg-[var(--surface-panel)]"
          />
        )}
      </section>
    );
  }

  if (module.kind === "written_deliverable") {
    const limit = module.maxChars ?? 500;
    const text = String(answers[module.id] ?? "");
    return (
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-brand-blue)]">
          Written response
        </p>
        <h2 className="mt-1 text-[16px] font-semibold">{module.prompt}</h2>
        {module.helpText && <p className="mt-1 text-[13.5px] text-[var(--text-tertiary)]">{module.helpText}</p>}
        <textarea
          value={text}
          disabled={locked}
          onChange={(e) => onAnswer(module.id, e.target.value.slice(0, limit))}
          onBlur={() => {
            if (text.trim()) onAnswer(module.id, text, "deliverable_revised");
          }}
          rows={6}
          maxLength={limit}
          aria-label={module.prompt}
          className="mt-4 w-full resize-y rounded-lg border border-[var(--border-subtle)] px-4 py-3 text-[15px] leading-relaxed focus:border-[var(--fydell-brand-blue)] focus:outline-none disabled:bg-[var(--surface-panel)]"
        />
        <p className="mt-1 text-right text-[12px] text-[var(--text-tertiary)]" aria-live="polite">
          {text.length} / {limit}
        </p>
      </section>
    );
  }

  if (module.kind === "stakeholder") {
    return (
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
        <h2 className="text-[16px] font-semibold">{module.title || "Stakeholder"}</h2>
        <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
          Open the conversation panel to ask {stakeholderName} clarifying questions.
        </p>
        <button
          onClick={onOpenStakeholder}
          className="mt-4 rounded-lg bg-[var(--fydell-brand-blue)] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#6872ff]"
        >
          Ask {stakeholderName}
        </button>
      </section>
    );
  }

  if (module.kind === "curveball") {
    return (
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fydell-changed)]">Update</p>
        <p className="mt-2 text-[15px] leading-relaxed">{module.announcement}</p>
        <p className="mt-3 text-[14px] text-[var(--text-secondary)]">{module.requiredAdaptation}</p>
      </section>
    );
  }

  return null;
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${
        dark ? "border-[var(--text-tertiary)]" : "border-white/70"
      }`}
    />
  );
}

/**
 * Preflight, invitation, workbench and result share the same graphite chrome.
 * The work surface is no longer a separate light product.
 */
function Center({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <CandidateShell width={wide ? "default" : "narrow"}>{children}</CandidateShell>
  );
}
