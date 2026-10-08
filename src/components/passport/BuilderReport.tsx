"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, ChevronRight, GitBranch, GitCommitHorizontal, Link2, RotateCcw } from "lucide-react";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DetailList, FigureRow, Notice, SectionHeader, Status, type StatusKind } from "@/components/ui/report";
import "./passport.css";
import type { Correction, CorrectionKind } from "@/lib/passport/corrections";
import { ANALYSIS_VERSION, type ManifestEntry } from "@/lib/passport/github/types";
import type { ScopePreview } from "@/lib/passport/github/extract";
import type { FindingDiff } from "@/lib/passport/versions";
import type { ContributionContext, DecisionRecord } from "@/lib/passport/context-contract";
import { ContributionSection, DecisionsSection } from "./ContributionContext";
import type { PassportEvidence, PassportProject } from "@/lib/passport/view";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_TONE,
  REPORT_STATE,
  REPORT_VIEWS,
  SKIP_REASON_LABEL,
  formatDate,
  formatDateTime,
  parseReportView,
  reportState,
  shortSha,
  type ReportView,
  type StateTone,
} from "@/lib/passport/record-states";

export type VersionSummary = {
  id: string;
  commitSha: string;
  revisionRef: string | null;
  analyzedAt: string;
  status: PassportProject["status"];
  findings: number;
  analyzedFiles: number;
  analysisVersion: string | null;
};

const TONE_KIND: Record<StateTone, StatusKind> = { neutral: "neutral", active: "pending", changed: "attention", risk: "failed", good: "success" };

/** Short area names for the figure row and the result sentence. */
const AREA_SHORT: Record<string, string> = {
  backend: "Backend",
  software: "Software design",
  testing: "Testing",
  ml_engineering: "ML engineering",
  applied_ai: "Applied AI",
  frontend: "Interface",
  delivery: "Delivery",
  declared: "Declared dependencies",
  other: "Other",
};

const KIND_LABEL: Record<CorrectionKind, string> = {
  context: "Context",
  inaccurate: "Marked inaccurate",
  correction: "Proposed correction",
};

const KIND_CHOICE: Record<CorrectionKind, string> = {
  context: "Add context",
  inaccurate: "This is inaccurate",
  correction: "Propose a correction",
};

const KIND_HELP: Record<CorrectionKind, string> = {
  context: "Background a reviewer should know, such as who else worked on this.",
  inaccurate: "Say what the finding gets wrong. It stays visible, with your note beside it.",
  correction: "Propose how the finding should read. Reviewers see both versions.",
};

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function NoteList({ notes, onWithdraw, busyId }: { notes: Correction[]; onWithdraw: (id: string) => void; busyId: string | null }) {
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className={`border-l pl-3 ${n.kind === "context" ? "border-[var(--border-strong)]" : "border-[#e9c27a]"} ${n.withdrawnAt ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{KIND_LABEL[n.kind]}</span>
            <span className="text-[13px] text-[var(--text-tertiary)]" title={formatDateTime(n.createdAt)}>
              {formatDate(n.createdAt)}
              {n.withdrawnAt ? " · withdrawn" : n.status === "resolved" ? " · resolved" : ""}
            </span>
            {!n.withdrawnAt ? (
              <button
                type="button"
                disabled={busyId === n.id}
                onClick={() => onWithdraw(n.id)}
                className="ml-auto text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {busyId === n.id ? "Withdrawing…" : "Withdraw"}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-body)]">{n.reason}</p>
          {n.proposedInterpretation ? (
            <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Should read: </span>
              {n.proposedInterpretation}
            </p>
          ) : null}
          {n.resolutionNote ? <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">Resolution: {n.resolutionNote}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function NoteForm({ onSubmit }: { onSubmit: (kind: CorrectionKind, reason: string, proposed: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CorrectionKind>("context");
  const [reason, setReason] = useState("");
  const [proposed, setProposed] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[14px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
        Add context or a correction
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSubmit(kind, reason, proposed);
    setSaving(false);
    if (err) setError(err);
    else {
      setReason("");
      setProposed("");
      setOpen(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="sr-only">What kind of note?</legend>
        <div className="inline-flex flex-wrap rounded-[8px] bg-[var(--surface-panel)] p-0.5">
          {(Object.keys(KIND_LABEL) as CorrectionKind[]).map((k) => (
            <label
              key={k}
              className={`cursor-pointer rounded-[6px] px-2.5 py-1 text-[13px] font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent-line)] ${
                kind === k ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <input type="radio" name="note-kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {KIND_CHOICE[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{KIND_HELP[kind]}</p>
      <label className="mt-2 block">
        <span className="sr-only">Your note</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} required className="platform-input text-[14px]" />
      </label>
      {kind === "correction" ? (
        <label className="mt-2 block">
          <span className="text-[13px] font-medium">How the finding should read</span>
          <textarea value={proposed} onChange={(e) => setProposed(e.target.value)} maxLength={1000} rows={2} required className="platform-input mt-1 text-[14px]" />
        </label>
      ) : null}
      {error ? <Notice tone="error" className="mt-2">{error}</Notice> : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="quiet" type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={saving} disabled={!reason.trim() || (kind === "correction" && !proposed.trim())}>
          Save note
        </Button>
      </div>
    </form>
  );
}

type RevisionCheck =
  | { status: "idle" | "checking" | "starting" }
  | { status: "same" }
  | { status: "new"; preview: Extract<ScopePreview, { ok: true }> }
  | { status: "started" }
  | { status: "error"; message: string };

function NewRevision({ project, reanalysisBlockedBy }: { project: PassportProject; reanalysisBlockedBy: "pinned" | "notes" | null }) {
  const [check, setCheck] = useState<RevisionCheck>({ status: "idle" });

  async function look() {
    setCheck({ status: "checking" });
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: project.repoFullName, preview: true }),
      });
      const data = (await res.json()) as { preview?: Extract<ScopePreview, { ok: true }>; error?: string };
      if (!res.ok || !data.preview) return setCheck({ status: "error", message: data.error ?? "Could not reach GitHub." });
      if (data.preview.commitSha === project.commitSha && project.analysisVersion === ANALYSIS_VERSION) return setCheck({ status: "same" });
      setCheck({ status: "new", preview: data.preview });
    } catch {
      setCheck({ status: "error", message: "Fydell could not be reached." });
    }
  }

  async function start(preview: Extract<ScopePreview, { ok: true }>) {
    setCheck({ status: "starting" });
    try {
      const res = await fetch("/api/passport/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository: preview.repository.fullName,
          commitSha: preview.commitSha,
          revisionRef: preview.revisionRef,
          contribution: project.contributionStatement,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) return setCheck({ status: "error", message: data.error ?? "Could not start the analysis." });
      setCheck({ status: "started" });
    } catch {
      setCheck({ status: "error", message: "Fydell could not be reached." });
    }
  }

  const text = "text-[14px] leading-[1.5] text-[var(--text-secondary)]";
  switch (check.status) {
    case "idle":
      return (
        <Button size="md" variant="secondary" onClick={() => void look()}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Analyze new revision
        </Button>
      );
    case "checking":
      return (
        <Button size="md" variant="secondary" loading>
          Checking GitHub…
        </Button>
      );
    case "same":
      return (
        <p role="status" className={`${text} inline-flex items-center gap-1.5`}>
          <Check className="h-4 w-4 text-[var(--badge-success-ink)]" aria-hidden /> Up to date with {project.revisionRef ?? "the default branch"}
        </p>
      );
    case "started":
      return (
        <p role="status" className={`${text} inline-flex items-center gap-2`}>
          <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-[var(--accent)] border-r-transparent" />
          Analyzing…
          <Link href="/app/candidate/work-record#imports" className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
            Track progress
          </Link>
        </p>
      );
    case "error":
      return (
        <Notice
          tone="error"
          action={
            <button type="button" onClick={() => void look()} className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
              Retry
            </button>
          }
        >
          {check.message}
        </Notice>
      );
    default: {
      const p = check.status === "new" ? check.preview : null;
      const sameCommit = p !== null && p.commitSha === project.commitSha;
      if (sameCommit && reanalysisBlockedBy) {
        return (
          <p className={`${text} max-w-[46ch]`}>
            This report stays as it is because {reanalysisBlockedBy === "pinned" ? "a share link pins it" : "it has your notes"}. The newer analysis will apply to your next commit.
          </p>
        );
      }
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className={text}>
            {sameCommit ? (
              "Newer analysis available"
            ) : p ? (
              <>
                New commit <span className="font-mono text-[13px] text-[var(--text-primary)]">{shortSha(p.commitSha)}</span>
              </>
            ) : null}
          </span>
          <Button size="md" variant="primary" loading={check.status === "starting"} onClick={() => p && void start(p)}>
            {check.status === "starting" ? "Starting…" : sameCommit ? "Re-analyze" : "Analyze this revision"}
          </Button>
          <Button size="md" variant="quiet" onClick={() => setCheck({ status: "idle" })} disabled={check.status === "starting"}>
            Cancel
          </Button>
        </div>
      );
    }
  }
}

function FileCoverage({ manifest, project }: { manifest: ManifestEntry[]; project: PassportProject }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"excluded" | "included">("excluded");
  const { analyzedFiles, totalFiles, skippedFiles } = project.coverage;
  const rows = manifest.filter((m) => (filter === "included" ? m.included : !m.included));
  return (
    <div>
      <span className="tabular-nums">
        {analyzedFiles} of {totalFiles}
        {skippedFiles ? ` · ${skippedFiles} excluded` : ""}
      </span>
      {manifest.length ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="ml-3 inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4"
        >
          {open ? "Hide files" : "Show files"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      ) : null}
      {open ? (
        <div className="mt-2 max-w-[640px]">
          <div className="flex gap-4 text-[13px]">
            {(["excluded", "included"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`border-b-2 pb-1 font-medium ${filter === f ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
              >
                {f === "excluded" ? `Excluded (${manifest.filter((m) => !m.included).length})` : `Reviewed (${manifest.filter((m) => m.included).length})`}
              </button>
            ))}
          </div>
          <ul className="mt-1 max-h-72 divide-y divide-[var(--border-subtle)] overflow-auto">
            {rows.map((m) => (
              <li key={m.path} className="flex items-baseline justify-between gap-4 py-1.5">
                <span className="min-w-0 truncate font-mono text-[13px] text-[var(--text-body)]" title={m.path}>
                  {m.path}
                </span>
                {!m.included ? <span className="shrink-0 text-[13px] text-[var(--text-tertiary)]">{(m.reason && SKIP_REASON_LABEL[m.reason]) ?? "Excluded"}</span> : null}
              </li>
            ))}
          </ul>
          {manifest.length < totalFiles ? <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">First {manifest.length} of {totalFiles} files listed.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

const DIFF_INK = { good: "text-[var(--badge-success-ink)]", changed: "text-[var(--badge-attention-ink)]", risk: "text-[var(--badge-failed-ink)]" } as const;

function DiffList({ title, items, tone }: { title: string; items: PassportEvidence[]; tone: keyof typeof DIFF_INK }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[14px] font-medium text-[var(--text-primary)]">
        <span className={`tabular-nums ${DIFF_INK[tone]}`}>{items.length}</span> {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((e) => (
          <li key={e.id} className="text-[14px] leading-[1.5] text-[var(--text-body)]">
            {e.finding} <span className="font-mono text-[13px] text-[var(--text-tertiary)]">{e.path.split("/").pop()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BuilderReport({
  project,
  versions,
  diff,
  previousVersion,
  latestId,
  manifest,
  initialNotes,
  initialFindingId,
  openOnPrevious,
  contribution,
  decisions,
  initialView,
  pinnedByShare,
}: {
  project: PassportProject & { id: string };
  versions: VersionSummary[];
  diff: FindingDiff | null;
  previousVersion: VersionSummary | null;
  latestId: string;
  manifest: ManifestEntry[];
  initialNotes: Correction[];
  initialFindingId: string | null;
  openOnPrevious: number;
  contribution: ContributionContext;
  decisions: DecisionRecord[];
  initialView: ReportView;
  pinnedByShare: boolean;
}) {
  const [view, setView] = useState<ReportView>(initialView);
  const [area, setArea] = useState<string | null>(null);
  const evidence = project.evidence;
  const currentPaths = useMemo(() => new Set(manifest.filter((m) => m.included).map((m) => m.path)), [manifest]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (evidence.some((e) => e.id === initialFindingId)) return initialFindingId;
    for (const cat of CATEGORY_ORDER) {
      const first = evidence.find((e) => e.basis === "repository_observation" && e.category === cat);
      if (first) return first.id;
    }
    return evidence[0]?.id ?? null;
  });
  const [notes, setNotes] = useState<Correction[]>(initialNotes);
  const [busyNote, setBusyNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const selected = evidence.find((e) => e.id === selectedId) ?? null;
  const state = reportState(project);
  const isLatest = project.id === latestId;
  const findingIds = useMemo(() => new Set(evidence.map((e) => e.id)), [evidence]);
  const notesFor = (id: string) => notes.filter((n) => n.findingId === id);
  const openNotes = notes.filter((n) => !n.withdrawnAt && n.status === "open").length;
  const [owner, name] = project.repoFullName.includes("/") ? project.repoFullName.split("/", 2) : ["", project.repoFullName];

  const groups = useMemo(() => {
    const observed = evidence.filter((e) => e.basis === "repository_observation");
    const out: Array<{ key: string; label: string; items: PassportEvidence[] }> = [];
    for (const cat of CATEGORY_ORDER) {
      const items = observed.filter((e) => e.category === cat);
      if (items.length) out.push({ key: cat, label: CATEGORY_LABEL[cat], items });
    }
    const other = observed.filter((e) => !(CATEGORY_ORDER as readonly string[]).includes(e.category));
    if (other.length) out.push({ key: "other", label: "Other observations", items: other });
    const declared = evidence.filter((e) => e.basis === "dependency_declaration");
    if (declared.length) out.push({ key: "declared", label: "Declared dependencies", items: declared });
    return out;
  }, [evidence]);
  const shownGroups = area ? groups.filter((g) => g.key === area) : groups;
  const ordered = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const visible = useMemo(() => shownGroups.flatMap((g) => g.items), [shownGroups]);
  const observedAreas = groups.filter((g) => g.key !== "declared" && g.key !== "other");
  const figures = [...observedAreas]
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 4)
    .map((g) => ({ key: g.key, label: AREA_SHORT[g.key] ?? g.label, value: g.items.length, color: CATEGORY_TONE[g.key] }));

  useEffect(() => {
    const onPop = () => {
      const params = new URL(window.location.href).searchParams;
      const id = params.get("finding");
      if (id && evidence.some((e) => e.id === id)) setSelectedId(id);
      setView(parseReportView(params.get("view")));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [evidence]);

  function select(id: string, focus = false) {
    if (id === selectedId && view === "findings") return;
    setSelectedId(id);
    setView("findings");
    setCopied(false);
    const url = new URL(window.location.href);
    url.searchParams.set("finding", id);
    url.searchParams.delete("view");
    window.history.pushState(null, "", url);
    if (focus) document.getElementById(`finding-${id}`)?.focus();
  }

  function filterArea(key: string) {
    const next = area === key ? null : key;
    setArea(next);
    setView("findings");
    const first = next ? groups.find((g) => g.key === next)?.items[0] : null;
    if (first && !groups.find((g) => g.key === next)?.items.some((e) => e.id === selectedId)) setSelectedId(first.id);
  }

  function go(next: ReportView) {
    if (next === view) return;
    setView(next);
    const url = new URL(window.location.href);
    if (next === "findings") url.searchParams.delete("view");
    else url.searchParams.set("view", next);
    window.history.pushState(null, "", url);
  }

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = REPORT_VIEWS.indexOf(view);
    const next = REPORT_VIEWS[(i + (e.key === "ArrowRight" ? 1 : REPORT_VIEWS.length - 1)) % REPORT_VIEWS.length];
    go(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = visible.findIndex((x) => x.id === selectedId);
    const next = e.key === "Home" ? 0 : e.key === "End" ? visible.length - 1 : Math.min(visible.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)));
    if (visible[next]) select(visible[next].id, true);
  }

  async function copyLink() {
    if (!selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set("finding", selected.id);
    url.searchParams.delete("view");
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function keepRelevant(list: Correction[]) {
    return list.filter((n) => findingIds.has(n.findingId) && (n.projectId === null || n.projectId === project.id));
  }

  async function addNote(kind: CorrectionKind, reason: string, proposed: string): Promise<string | null> {
    if (!selected) return "Choose a finding first.";
    try {
      const res = await fetch("/api/passport/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: project.repoFullName, findingId: selected.id, projectId: project.id, kind, reason, proposedInterpretation: proposed }),
      });
      const data = (await res.json()) as { corrections?: Correction[]; error?: string };
      if (!res.ok || !data.corrections) return data.error ?? "Could not save your note. Your text is kept; try again.";
      setNotes(keepRelevant(data.corrections));
      return null;
    } catch {
      return "Fydell could not be reached. Your text is kept; try again.";
    }
  }

  async function withdraw(id: string) {
    setBusyNote(id);
    try {
      const res = await fetch("/api/passport/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "withdraw" }),
      });
      const data = (await res.json()) as { corrections?: Correction[] };
      if (res.ok && data.corrections) setNotes(keepRelevant(data.corrections));
    } finally {
      setBusyNote(null);
    }
  }

  const activeDecisions = decisions.filter((d) => !d.withdrawnAt).length;
  const tabs: Array<{ key: ReportView; label: string; count: number }> = [
    { key: "findings", label: "Findings", count: evidence.length },
    { key: "decisions", label: "Decisions", count: activeDecisions },
    { key: "versions", label: "Versions", count: versions.length },
  ];
  const { analyzedFiles, totalFiles } = project.coverage;
  const areaNames = observedAreas.map((g) => AREA_SHORT[g.key] ?? g.label);
  const uploaded = project.sourceKind === "upload";
  const ref = uploaded ? "the uploaded snapshot" : (project.revisionRef ?? "the default branch");

  return (
    <article>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] text-[var(--text-tertiary)]">
        <Link href="/app/candidate/work-record" className="hover:text-[var(--text-primary)]">
          Passport
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span>{project.sourceKind === "upload" ? "Uploaded project" : owner || "Project"}</span>
      </nav>

      <header className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">{name}</h1>
            <Status kind={TONE_KIND[REPORT_STATE[state].tone]}>{REPORT_STATE[state].label}</Status>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[var(--text-secondary)]">
            {uploaded ? (
              <span className="inline-flex items-center gap-1.5" title={`Content hash ${project.commitSha}`}>
                <GitCommitHorizontal className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                Uploaded <span className="font-mono text-[13px]">{shortSha(project.commitSha)}</span>
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                  {project.revisionRef ?? "default branch"}
                </span>
                <a href={`${project.htmlUrl}/tree/${project.commitSha}`} target="_blank" rel="noreferrer noopener" title={project.commitSha} className="inline-flex items-center gap-1.5 hover:text-[var(--text-primary)]">
                  <GitCommitHorizontal className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                  <span className="font-mono text-[13px]">{shortSha(project.commitSha)}</span>
                </a>
              </>
            )}
            <span title={formatDateTime(project.analyzedAt)}>Analyzed {formatDate(project.analyzedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLatest && !uploaded ? (
            <NewRevision project={project} reanalysisBlockedBy={pinnedByShare ? "pinned" : notes.some((n) => !n.withdrawnAt && n.projectId === project.id) ? "notes" : null} />
          ) : null}
          {uploaded ? (
            <ButtonLink href="/app/candidate/work-record#upload-project" size="md" variant="quiet">
              Upload a new version
            </ButtonLink>
          ) : (
            <ButtonLink href={project.htmlUrl} target="_blank" rel="noreferrer noopener" size="md" variant="quiet">
              View on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </ButtonLink>
          )}
        </div>
      </header>

      <p className="mt-6 max-w-[72ch] text-[16px] leading-[1.55] text-[var(--text-body)]">
        {evidence.length === 0 ? (
          <>
            No findings from {analyzedFiles} of {totalFiles} files at {ref} @ <span className="font-mono text-[14.5px]">{shortSha(project.commitSha)}</span>.
          </>
        ) : (
          <>
            <span className="font-semibold text-[var(--text-primary)]">
              {evidence.length} finding{evidence.length === 1 ? "" : "s"}
            </span>
            {areaNames.length ? ` across ${listJoin(areaNames)}` : ""}, from {analyzedFiles} of {totalFiles} files at{" "}
            <span className="whitespace-nowrap">
              {ref} <span className="font-mono text-[14.5px]">{shortSha(project.commitSha)}</span>
            </span>
            .
          </>
        )}
      </p>

      {figures.length > 1 ? <FigureRow className="mt-5" figures={figures} active={area} onSelect={filterArea} /> : null}

      {!isLatest || project.notices.length ? (
        <div className="mt-5 space-y-2">
          {!isLatest ? (
            <Notice
              action={
                <Link href={`/app/candidate/projects/${latestId}`} className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                  Open latest
                </Link>
              }
            >
              This is an earlier version. Links pinned to it keep showing exactly this.
            </Notice>
          ) : null}
          {project.notices.map((n) => (
            <Notice key={n} tone="attention">
              {n}
            </Notice>
          ))}
        </div>
      ) : null}

      <div role="tablist" aria-label="Report sections" onKeyDown={onTabKey} className="mt-8 flex gap-7 overflow-x-auto overflow-y-hidden border-b border-[var(--border-default)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={view === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={view === t.key ? 0 : -1}
            onClick={() => go(t.key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-3 pt-1 text-[14px] font-medium transition-colors ${
              view === t.key ? "border-[var(--accent)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
            {t.count ? <span className={`tabular-nums ${view === t.key ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "findings" ? (
          <div id="panel-findings" role="tabpanel" aria-labelledby="tab-findings">
            <h2 className="sr-only">Findings</h2>
            {evidence.length === 0 ? (
              <div className="py-12">
                <p className="text-[16px] font-semibold">No findings at this revision</p>
                <p className="mt-1 max-w-[60ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
                  None of the checks matched the files reviewed. That says nothing about quality; see which files were excluded in Report details below.
                </p>
              </div>
            ) : (
              <div className="grid overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div
                  role="group"
                  aria-label="Findings. Use the arrow keys to move between them."
                  onKeyDown={onListKey}
                  className="max-h-[720px] overflow-auto border-b border-[var(--border-subtle)] lg:border-b-0 lg:border-r"
                >
                  {area ? (
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2 text-[13px]">
                      <span className="text-[var(--text-secondary)]">Showing {AREA_SHORT[area] ?? area}</span>
                      <button type="button" onClick={() => setArea(null)} className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                        Show all
                      </button>
                    </div>
                  ) : null}
                  {shownGroups.map((g) => (
                    <section key={g.key} aria-label={g.label}>
                      <h3 className="sticky top-0 z-[1] flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)]">
                        <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_TONE[g.key] ?? "var(--text-quaternary)" }} />
                        {g.label}
                        <span className="ml-auto font-normal tabular-nums text-[var(--text-tertiary)]">{g.items.length}</span>
                      </h3>
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {g.items.map((e) => {
                          const active = e.id === selected?.id;
                          const count = notesFor(e.id).filter((n) => !n.withdrawnAt).length;
                          return (
                            <li key={e.id}>
                              <button
                                id={`finding-${e.id}`}
                                type="button"
                                aria-pressed={active}
                                tabIndex={active ? 0 : -1}
                                onClick={() => select(e.id)}
                                className={`report-row ${active ? "is-active shadow-none!" : ""}`}
                              >
                                <span className={`block text-[14px] leading-[1.45] ${active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-body)]"}`}>{e.finding}</span>
                                <span className="mt-1 flex min-w-0 items-center gap-2 text-[13px]">
                                  <span className="truncate font-mono text-[var(--text-tertiary)]" title={e.path}>
                                    {e.path.split("/").pop()}:{e.startLine}
                                  </span>
                                  {count ? (
                                    <span className="shrink-0 text-[var(--badge-attention-ink)]">
                                      · {count} note{count === 1 ? "" : "s"}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>

                {selected ? (
                  <div aria-live="polite" className="min-w-0 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: CATEGORY_TONE[selected.category] ?? "var(--text-quaternary)" }} />
                        {CATEGORY_LABEL[selected.category] ?? selected.category}
                      </span>
                      <span aria-hidden className="text-[var(--text-quaternary)]">·</span>
                      <span>{selected.basis === "repository_observation" ? "Observed in code" : "Declared dependency"}</span>
                      <button type="button" onClick={() => void copyLink()} className="ml-auto inline-flex items-center gap-1 font-medium hover:text-[var(--text-primary)]">
                        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
                        {copied ? "Copied" : "Copy link"}
                      </button>
                    </div>
                    <h3 className="mt-3 text-[17px] font-semibold leading-[1.35] tracking-[-0.012em]">{selected.finding}</h3>
                    <div className="mt-4">
                      <CodeBlock path={selected.path} lines={selected.excerpt.map((text, i) => ({ n: selected.startLine + i, text, mark: "cited" as const }))} />
                    </div>
                    {selected.sourceUrl ? (
                      <a
                        href={selected.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4"
                      >
                        Open lines on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : (
                      <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">From your uploaded files. There is no hosted copy to open.</p>
                    )}
                    <details className="group mt-6 border-t border-[var(--border-subtle)] pt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-[var(--text-primary)]">
                        <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)] transition-transform group-open:rotate-90" aria-hidden />
                        What this does not show
                      </summary>
                      <ul className="mt-2 space-y-1 pl-6 text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                        {selected.limitations.map((l) => (
                          <li key={l} className="list-disc">
                            {l}
                          </li>
                        ))}
                      </ul>
                    </details>
                    <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
                      <NoteList notes={notesFor(selected.id)} onWithdraw={(id) => void withdraw(id)} busyId={busyNote} />
                      <NoteForm key={selected.id} onSubmit={addNote} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {view === "decisions" ? (
          <div id="panel-decisions" role="tabpanel" aria-labelledby="tab-decisions">
            <DecisionsSection projectId={project.id} findings={ordered} initial={decisions} onOpenFinding={(id) => select(id)} />
          </div>
        ) : null}

        {view === "versions" ? (
          <section id="panel-versions" role="tabpanel" aria-labelledby="tab-versions">
            <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
                  <span className="min-w-[140px] text-[14px] text-[var(--text-primary)]">
                    {v.revisionRef ?? "default"} <span className="font-mono text-[13px] text-[var(--text-secondary)]">{shortSha(v.commitSha)}</span>
                  </span>
                  <span className="text-[14px] text-[var(--text-secondary)]" title={formatDateTime(v.analyzedAt)}>
                    {formatDate(v.analyzedAt)}
                  </span>
                  <span className="text-[14px] tabular-nums text-[var(--text-secondary)]">
                    {v.findings} finding{v.findings === 1 ? "" : "s"}
                  </span>
                  {v.id === latestId ? <span className="text-[13px] font-medium text-[var(--badge-success-ink)]">Latest</span> : null}
                  {v.id === project.id ? (
                    <span className="ml-auto text-[14px] text-[var(--text-tertiary)]">Viewing</span>
                  ) : (
                    <Link href={`/app/candidate/projects/${v.id}`} className="ml-auto text-[14px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                      Open
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {diff && previousVersion ? (
              <div className="mt-8 space-y-4">
                <SectionHeader
                  title={`Changes since ${shortSha(previousVersion.commitSha)}`}
                  description={`${diff.unchanged} unchanged · files reviewed ${previousVersion.analyzedFiles} → ${analyzedFiles}${openOnPrevious ? ` · ${openOnPrevious} open note${openOnPrevious === 1 ? "" : "s"} on the earlier version` : ""}`}
                />
                {previousVersion.analysisVersion !== project.analysisVersion ? (
                  <Notice>The analysis itself changed between these versions, so some differences come from Fydell, not the code.</Notice>
                ) : null}
                <DiffList title="newly supported" items={diff.added} tone="good" />
                <DiffList title="affected by changed source" items={diff.changed.map((c) => c.after)} tone="changed" />
                <DiffList title="no longer supported: file changed" items={diff.removed.filter((e) => manifest.length === 0 || currentPaths.has(e.path))} tone="risk" />
                <DiffList title="no longer supported: file deleted, renamed or not reviewed" items={diff.removed.filter((e) => manifest.length > 0 && !currentPaths.has(e.path))} tone="risk" />
                {!diff.added.length && !diff.removed.length && !diff.changed.length ? <p className="text-[14px] text-[var(--text-secondary)]">No differences in findings.</p> : null}
              </div>
            ) : versions.length === 1 ? (
              <p className="mt-4 text-[14px] text-[var(--text-secondary)]">{uploaded ? "Upload a new version under the same name to compare what changed." : "Analyze a new revision to compare what changed."}</p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <ContributionSection projectId={project.id} findings={ordered} initial={contribution} onOpenFinding={(id) => select(id)} />
        <section aria-labelledby="details-heading">
          <SectionHeader id="details-heading" title="Report details" />
          <DetailList
            className="mt-3"
            rows={[
              uploaded
                ? { label: "Source", value: <span>Uploaded ZIP · <span className="font-mono text-[13px]">{shortSha(project.commitSha)}</span></span> }
                : {
                    label: "Commit",
                    value: (
                      <a href={`${project.htmlUrl}/tree/${project.commitSha}`} target="_blank" rel="noreferrer noopener" className="font-mono text-[13px] text-[var(--accent-ink)] hover:underline">
                        {shortSha(project.commitSha)}
                      </a>
                    ),
                  },
              ...(uploaded ? [] : [{ label: "Branch", value: project.revisionRef ?? "Default branch" }]),
              { label: "Analyzed", value: formatDateTime(project.analyzedAt) },
              { label: "Files reviewed", value: <FileCoverage manifest={manifest} project={project} /> },
              ...(project.primaryLanguage ? [{ label: "Main language", value: project.primaryLanguage }] : []),
              ...(openNotes ? [{ label: "Open notes", value: <span className="tabular-nums">{openNotes}</span> }] : []),
              { label: "Analyzer", value: <span className="font-mono text-[13px] text-[var(--text-secondary)]">{project.analysisVersion ?? "unversioned"}</span> },
            ]}
          />
          <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-tertiary)]">Static code review. Runtime behavior and authorship were not verified.</p>
        </section>
      </div>
    </article>
  );
}
