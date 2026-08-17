"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function CodeEditorSurface({
  value,
  onChange,
  language,
  onLanguageChange,
  onRun,
  output,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  language: "javascript" | "typescript" | "python";
  onLanguageChange?: (l: "javascript" | "typescript" | "python") => void;
  onRun: () => void;
  output?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <label className="text-[11px] text-[var(--text-tertiary)]" htmlFor="lang">
          Language
        </label>
        <select
          id="lang"
          className="platform-select h-7 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-[12px] text-[var(--text-primary)]"
          value={language}
          disabled={readOnly}
          onChange={(e) => onLanguageChange?.(e.target.value as "javascript" | "typescript" | "python")}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
        </select>
        <div className="flex-1" />
        <Button size="sm" variant="accent" onClick={onRun} disabled={readOnly}>
          Run
        </Button>
      </div>
      <textarea
        className={cn(
          "min-h-0 flex-1 resize-none bg-[var(--surface-canvas)] p-3 font-mono text-[12px] leading-relaxed text-[var(--text-primary)] outline-none",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--action-ink)]"
        )}
        spellCheck={false}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Integration script editor"
      />
      {output ? (
        <pre className="max-h-28 overflow-auto border-t border-[var(--border-default)] bg-[var(--surface-raised)] p-3 font-mono text-[11px] text-[var(--text-secondary)]">
          {output}
        </pre>
      ) : null}
    </div>
  );
}

export function ApiConsole({
  method,
  path,
  headers,
  body,
  onChange,
  onExecute,
  result,
  readOnly,
}: {
  method: string;
  path: string;
  headers: string;
  body: string;
  onChange: (patch: { method?: string; path?: string; headers?: string; body?: string }) => void;
  onExecute: () => void;
  result?: { status: number; body: string; requestId?: string; success: boolean };
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <div className="flex gap-2">
        <select
          className="platform-select h-8 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-[12px]"
          value={method}
          disabled={readOnly}
          onChange={(e) => onChange({ method: e.target.value })}
          aria-label="HTTP method"
        >
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          className="platform-input h-8 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 font-mono text-[12px]"
          value={path}
          disabled={readOnly}
          onChange={(e) => onChange({ path: e.target.value })}
          aria-label="API path"
        />
        <Button size="sm" variant="accent" onClick={onExecute} disabled={readOnly}>
          Send
        </Button>
      </div>
      <label className="text-[11px] text-[var(--text-tertiary)]">Headers</label>
      <textarea
        className="platform-input min-h-[72px] rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 font-mono text-[11px]"
        value={headers}
        readOnly={readOnly}
        onChange={(e) => onChange({ headers: e.target.value })}
      />
      <label className="text-[11px] text-[var(--text-tertiary)]">Body</label>
      <textarea
        className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 font-mono text-[11px]"
        value={body}
        readOnly={readOnly}
        onChange={(e) => onChange({ body: e.target.value })}
      />
      {result ? (
        <div
          className={cn(
            "rounded-[var(--radius-control)] border p-2 font-mono text-[11px]",
            result.success
              ? "border-[var(--fydell-good)] text-[var(--text-primary)]"
              : "border-[var(--fydell-risk)] text-[var(--text-primary)]"
          )}
        >
          <div className="mb-1 text-[12px] font-medium">
            {result.status}
            {result.requestId ? ` · ${result.requestId}` : ""}
          </div>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[var(--text-secondary)]">{result.body}</pre>
        </div>
      ) : null}
    </div>
  );
}

export function ResourceBrowser({
  items,
  activeId,
  query,
  onSearch,
  onOpen,
}: {
  items: Array<{ id: string; title: string; summary?: string; visible: boolean; opened: boolean }>;
  activeId?: string;
  query: string;
  onSearch: (q: string) => void;
  onOpen: (id: string) => void;
}) {
  const visible = items.filter((i) => i.visible);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border-subtle)] p-2">
        <input
          className="platform-input h-8 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-[12px]"
          placeholder="Search resources"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search resources"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-auto p-1">
        {visible.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={cn(
                "w-full rounded-[var(--radius-control)] px-2 py-2 text-left hover:bg-[var(--surface-hover)]",
                activeId === item.id && "bg-[var(--surface-selected)]"
              )}
              onClick={() => onOpen(item.id)}
            >
              <div className="text-[12px] font-medium text-[var(--text-primary)]">{item.title}</div>
              {item.summary ? (
                <div className="text-[11px] text-[var(--text-tertiary)]">{item.summary}</div>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DocumentationViewer({ title, content }: { title: string; content: string }) {
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="mb-3 text-[14px] font-semibold text-[var(--text-primary)]">{title}</h2>
      <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[var(--text-secondary)]">
        {content}
      </pre>
    </div>
  );
}

export function TaskList({
  tasks,
  onOpen,
}: {
  tasks: Array<{ id: string; title: string; status: string; priority: string; description: string }>;
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="space-y-1 p-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className="w-full rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-2 py-2 text-left hover:border-[var(--border-strong)]"
            onClick={() => onOpen(t.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t.title}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                {t.status}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{t.description}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function InternalChat({
  people,
  activePersonId,
  messages,
  draft,
  onSelectPerson,
  onDraftChange,
  onSend,
  readOnly,
}: {
  people: Array<{ id: string; name: string; title: string; channel: string; unread?: boolean }>;
  activePersonId?: string;
  messages: Array<{ id: string; direction: string; body: string }>;
  draft: string;
  onSelectPerson: (id: string) => void;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] p-2">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              "shrink-0 rounded-[var(--radius-control)] border px-2 py-1 text-left text-[11px]",
              activePersonId === p.id
                ? "border-[var(--fydell-brand-blue)] bg-[var(--surface-selected)]"
                : "border-[var(--border-default)]"
            )}
            onClick={() => onSelectPerson(p.id)}
          >
            <div className="font-medium text-[var(--text-primary)]">{p.name}</div>
            <div className="text-[var(--text-tertiary)]">{p.title}</div>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] rounded-[var(--radius-control)] px-2 py-1.5 text-[12px]",
              m.direction === "outbound"
                ? "ml-auto bg-[var(--surface-selected)] text-[var(--text-primary)]"
                : "bg-[var(--surface-panel)] text-[var(--text-secondary)]"
            )}
          >
            {m.body}
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-[var(--border-default)] p-2">
        <textarea
          className="platform-input min-h-[64px] flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 text-[12px]"
          value={draft}
          disabled={readOnly || !activePersonId}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Ask a specific question…"
          aria-label="Message draft"
        />
        <Button size="sm" variant="primary" onClick={onSend} disabled={readOnly || !draft.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

export function CustomerComposer({
  value,
  onChange,
  onSave,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-3">
      <p className="text-[11px] text-[var(--text-tertiary)]">
        Customer-safe update. Avoid unsupported promises. Saved as a customer_message artifact.
      </p>
      <textarea
        className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Customer update"
      />
      <Button size="sm" variant="primary" onClick={onSave} disabled={readOnly || value.trim().length < 20}>
        Save customer update
      </Button>
    </div>
  );
}

export function AiAssistant({
  history,
  draft,
  onDraftChange,
  onAsk,
  readOnly,
}: {
  history: Array<{ id: string; prompt: string; response: string; editedAfterResponse?: boolean }>;
  draft: string;
  onDraftChange: (v: string) => void;
  onAsk: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] text-[var(--text-tertiary)]">
        AI Assistant (tool) — distinct from coworker chat
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {history.map((h) => (
          <div key={h.id} className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] p-2 text-[12px]">
            <div className="text-[var(--text-tertiary)]">You</div>
            <div className="text-[var(--text-primary)]">{h.prompt}</div>
            <div className="mt-2 text-[var(--text-tertiary)]">Assistant</div>
            <div className="text-[var(--text-secondary)]">{h.response}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-[var(--border-default)] p-2">
        <textarea
          className="platform-input min-h-[64px] flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 text-[12px]"
          value={draft}
          disabled={readOnly}
          onChange={(e) => onDraftChange(e.target.value)}
          aria-label="AI prompt"
        />
        <Button size="sm" variant="secondary" onClick={onAsk} disabled={readOnly || !draft.trim()}>
          Ask
        </Button>
      </div>
    </div>
  );
}

export function ArtifactComposer({
  technicalRecommendation,
  executiveSummary,
  onChangeReco,
  onChangeExec,
  onSaveReco,
  onSaveExec,
  readOnly,
}: {
  value?: string;
  technicalRecommendation: string;
  executiveSummary: string;
  onChangeReco: (v: string) => void;
  onChangeExec: (v: string) => void;
  onSaveReco: () => void;
  onSaveExec: () => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"reco" | "exec">("reco");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
        <Button size="sm" variant={tab === "reco" ? "secondary" : "quiet"} onClick={() => setTab("reco")}>
          Technical recommendation
        </Button>
        <Button size="sm" variant={tab === "exec" ? "secondary" : "quiet"} onClick={() => setTab("exec")}>
          Executive summary
        </Button>
      </div>
      {tab === "reco" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={technicalRecommendation}
            readOnly={readOnly}
            onChange={(e) => onChangeReco(e.target.value)}
            aria-label="Technical recommendation"
          />
          <Button size="sm" variant="primary" onClick={onSaveReco} disabled={readOnly || technicalRecommendation.trim().length < 20}>
            Save recommendation
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={executiveSummary}
            readOnly={readOnly}
            onChange={(e) => onChangeExec(e.target.value)}
            aria-label="Executive summary"
          />
          <Button size="sm" variant="primary" onClick={onSaveExec} disabled={readOnly || executiveSummary.trim().length < 20}>
            Save executive summary
          </Button>
        </div>
      )}
    </div>
  );
}

export function SqlWorkbench({
  dialectLabel,
  value,
  onChange,
  onExecute,
  result,
  knownTables,
  readOnly,
}: {
  dialectLabel?: string;
  value: string;
  onChange: (v: string) => void;
  onExecute: () => void;
  result?: {
    success: boolean;
    error?: string;
    columns: string[];
    rows: Array<Record<string, import("@/lib/sim-engine/types").JsonValue>>;
    patternId?: string;
    rowCount: number;
  };
  knownTables?: string[];
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="text-[11px] text-[var(--text-tertiary)]">
          {dialectLabel ?? "SQL"}
          {knownTables?.length ? ` · ${knownTables.join(", ")}` : ""}
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="accent" onClick={onExecute} disabled={readOnly || !value.trim()}>
          Run query
        </Button>
      </div>
      <textarea
        className={cn(
          "min-h-[36%] resize-none bg-[var(--surface-canvas)] p-3 font-mono text-[12px] leading-relaxed text-[var(--text-primary)] outline-none",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--action-ink)]"
        )}
        spellCheck={false}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        aria-label="SQL editor"
      />
      <div className="min-h-0 flex-1 overflow-auto border-t border-[var(--border-default)] bg-[var(--surface-raised)]">
        {!result ? (
          <div className="p-3 text-[12px] text-[var(--text-tertiary)]">Run a query to see results.</div>
        ) : !result.success ? (
          <div className="p-3 font-mono text-[12px] text-[var(--fydell-risk)]">{result.error ?? "Query failed"}</div>
        ) : (
          <div className="p-2">
            <div className="mb-2 px-1 text-[11px] text-[var(--text-tertiary)]">
              {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
              {result.patternId ? ` · ${result.patternId}` : ""}
            </div>
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="border-b border-[var(--border-default)] px-2 py-1 font-medium text-[var(--text-secondary)]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, idx) => (
                  <tr key={idx}>
                    {result.columns.map((col) => (
                      <td
                        key={col}
                        className="border-b border-[var(--border-subtle)] px-2 py-1 font-mono text-[var(--text-primary)]"
                      >
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCell(value: import("@/lib/sim-engine/types").JsonValue | undefined): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AnalysisMemoComposer({
  memo,
  execSummary,
  onChangeMemo,
  onChangeExec,
  onSaveMemo,
  onSaveExec,
  readOnly,
}: {
  memo: string;
  execSummary: string;
  onChangeMemo: (v: string) => void;
  onChangeExec: (v: string) => void;
  onSaveMemo: () => void;
  onSaveExec: () => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"memo" | "exec">("memo");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
        <Button size="sm" variant={tab === "memo" ? "secondary" : "quiet"} onClick={() => setTab("memo")}>
          Analysis memo
        </Button>
        <Button size="sm" variant={tab === "exec" ? "secondary" : "quiet"} onClick={() => setTab("exec")}>
          Exec summary
        </Button>
      </div>
      {tab === "memo" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Primary driver, evidence, what you ruled out, caveats, next verification.
          </p>
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={memo}
            readOnly={readOnly}
            onChange={(e) => onChangeMemo(e.target.value)}
            aria-label="Analysis memo"
          />
          <Button size="sm" variant="primary" onClick={onSaveMemo} disabled={readOnly || memo.trim().length < 40}>
            Save memo
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={execSummary}
            readOnly={readOnly}
            onChange={(e) => onChangeExec(e.target.value)}
            aria-label="Executive summary"
          />
          <Button size="sm" variant="primary" onClick={onSaveExec} disabled={readOnly || execSummary.trim().length < 20}>
            Save executive summary
          </Button>
        </div>
      )}
    </div>
  );
}

export function CutoverChecklist({
  title,
  items,
  completed,
  onToggle,
  readOnly,
}: {
  title?: string;
  items: Array<{ id: string; label: string; description?: string; required?: boolean }>;
  completed: Record<string, boolean>;
  onToggle: (id: string) => void;
  readOnly?: boolean;
}) {
  const done = items.filter((i) => completed[i.id]).length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
        {title ?? "Launch checklist"} · {done}/{items.length} confirmed
      </div>
      <ul className="min-h-0 flex-1 overflow-auto p-2">
        {items.map((item) => (
          <li key={item.id} className="mb-1">
            <label
              className={cn(
                "flex cursor-pointer gap-2 rounded-[var(--radius-control)] px-2 py-2 hover:bg-[var(--surface-hover)]",
                readOnly && "cursor-default"
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(completed[item.id])}
                disabled={readOnly}
                onChange={() => onToggle(item.id)}
              />
              <span>
                <span className="block text-[12px] font-medium text-[var(--text-primary)]">{item.label}</span>
                {item.description ? (
                  <span className="block text-[11px] text-[var(--text-tertiary)]">{item.description}</span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FieldMappingPanel({
  mappings,
  values,
  onChange,
  readOnly,
}: {
  mappings: Array<{
    id: string;
    sourceField: string;
    sampleValue?: string;
    options: string[];
  }>;
  values: Record<string, string>;
  onChange: (mappingId: string, target: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-3">
      <p className="mb-3 text-[11px] text-[var(--text-tertiary)]">
        Map customer columns to system fields before import.
      </p>
      <div className="flex flex-col gap-3">
        {mappings.map((m) => (
          <div
            key={m.id}
            className="rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3"
          >
            <div className="mb-1 font-mono text-[12px] text-[var(--text-primary)]">{m.sourceField}</div>
            {m.sampleValue ? (
              <div className="mb-2 text-[11px] text-[var(--text-tertiary)]">sample: {m.sampleValue}</div>
            ) : null}
            <select
              className="platform-select h-8 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 text-[12px]"
              value={values[m.id] ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange(m.id, e.target.value)}
              aria-label={`Map ${m.sourceField}`}
            >
              <option value="">Select target field…</option>
              {m.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketQueue({
  title,
  tickets,
  selectedId,
  triage,
  onSelect,
  onTriage,
  readOnly,
}: {
  title?: string;
  tickets: Array<{
    id: string;
    customer: string;
    reportedAt: string;
    summary: string;
    severity: string;
  }>;
  selectedId?: string;
  triage: Record<string, "incident" | "unrelated" | "unknown">;
  onSelect: (id: string) => void;
  onTriage: (id: string, classification: "incident" | "unrelated" | "unknown") => void;
  readOnly?: boolean;
}) {
  const active = tickets.find((t) => t.id === selectedId) ?? tickets[0];
  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-[42%] min-w-0 flex-col border-r border-[var(--border-default)]">
        <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
          {title ?? "Tickets"}
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-1">
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-[var(--radius-control)] px-2 py-2 text-left hover:bg-[var(--surface-hover)]",
                  selectedId === t.id && "bg-[var(--surface-selected)]"
                )}
                onClick={() => onSelect(t.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">{t.id}</span>
                  <span className="text-[10px] uppercase text-[var(--text-tertiary)]">{t.severity}</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">{t.customer}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">
                  {triage[t.id] === "unknown" ? "untriaged" : triage[t.id]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        {active ? (
          <>
            <div className="mb-1 font-mono text-[12px] text-[var(--text-primary)]">{active.id}</div>
            <div className="mb-1 text-[13px] font-medium text-[var(--text-primary)]">{active.customer}</div>
            <div className="mb-2 text-[11px] text-[var(--text-tertiary)]">{active.reportedAt}</div>
            <p className="mb-4 text-[12px] leading-relaxed text-[var(--text-secondary)]">{active.summary}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={triage[active.id] === "incident" ? "secondary" : "quiet"}
                disabled={readOnly}
                onClick={() => onTriage(active.id, "incident")}
              >
                Part of incident
              </Button>
              <Button
                size="sm"
                variant={triage[active.id] === "unrelated" ? "secondary" : "quiet"}
                disabled={readOnly}
                onClick={() => onTriage(active.id, "unrelated")}
              >
                Unrelated
              </Button>
            </div>
          </>
        ) : (
          <div className="text-[12px] text-[var(--text-tertiary)]">No tickets</div>
        )}
      </div>
    </div>
  );
}

export function CutoverPlanComposer({
  plan,
  customerMessage,
  onChangePlan,
  onChangeCustomer,
  onSavePlan,
  onSaveCustomer,
  readOnly,
}: {
  plan: string;
  customerMessage: string;
  onChangePlan: (v: string) => void;
  onChangeCustomer: (v: string) => void;
  onSavePlan: () => void;
  onSaveCustomer: () => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"plan" | "customer">("plan");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
        <Button size="sm" variant={tab === "plan" ? "secondary" : "quiet"} onClick={() => setTab("plan")}>
          Cutover plan
        </Button>
        <Button size="sm" variant={tab === "customer" ? "secondary" : "quiet"} onClick={() => setTab("customer")}>
          Customer message
        </Button>
      </div>
      {tab === "plan" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={plan}
            readOnly={readOnly}
            onChange={(e) => onChangePlan(e.target.value)}
            aria-label="Cutover plan"
          />
          <Button size="sm" variant="primary" onClick={onSavePlan} disabled={readOnly || plan.trim().length < 40}>
            Save cutover plan
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={customerMessage}
            readOnly={readOnly}
            onChange={(e) => onChangeCustomer(e.target.value)}
            aria-label="Customer message"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={onSaveCustomer}
            disabled={readOnly || customerMessage.trim().length < 40}
          >
            Save customer message
          </Button>
        </div>
      )}
    </div>
  );
}

export function EscalationComposer({
  escalation,
  customerMessage,
  onChangeEscalation,
  onChangeCustomer,
  onSaveEscalation,
  onSaveCustomer,
  readOnly,
}: {
  escalation: string;
  customerMessage: string;
  onChangeEscalation: (v: string) => void;
  onChangeCustomer: (v: string) => void;
  onSaveEscalation: () => void;
  onSaveCustomer: () => void;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<"escalation" | "customer">("escalation");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b border-[var(--border-subtle)] p-2">
        <Button
          size="sm"
          variant={tab === "escalation" ? "secondary" : "quiet"}
          onClick={() => setTab("escalation")}
        >
          Escalation
        </Button>
        <Button size="sm" variant={tab === "customer" ? "secondary" : "quiet"} onClick={() => setTab("customer")}>
          Customer update
        </Button>
      </div>
      {tab === "escalation" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Cite log evidence, release, and requested action (e.g. skew revert).
          </p>
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={escalation}
            readOnly={readOnly}
            onChange={(e) => onChangeEscalation(e.target.value)}
            aria-label="Escalation note"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={onSaveEscalation}
            disabled={readOnly || escalation.trim().length < 40}
          >
            Save escalation
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <textarea
            className="platform-input min-h-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-[12px]"
            value={customerMessage}
            readOnly={readOnly}
            onChange={(e) => onChangeCustomer(e.target.value)}
            aria-label="Customer update"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={onSaveCustomer}
            disabled={readOnly || customerMessage.trim().length < 40}
          >
            Save customer update
          </Button>
        </div>
      )}
    </div>
  );
}

export function RulesWorkbenchPanel({
  title,
  rules,
  selectedRuleId,
  selectedFixId,
  selectedImpactCount,
  impactPrompt,
  impactOptions,
  fixOptions,
  onSelectRule,
  onSelectFix,
  onSelectImpact,
  readOnly,
}: {
  title?: string;
  rules: Array<{
    id: string;
    label: string;
    condition: string;
    routesTo: string;
    order: number;
  }>;
  selectedRuleId?: string;
  selectedFixId?: string;
  selectedImpactCount?: number;
  impactPrompt?: string;
  impactOptions?: number[];
  fixOptions: Array<{ id: string; label: string; compliant: boolean }>;
  onSelectRule: (id: string) => void;
  onSelectFix: (id: string) => void;
  onSelectImpact: (count: number) => void;
  readOnly?: boolean;
}) {
  const sorted = [...rules].sort((a, b) => a.order - b.order);
  const active = sorted.find((r) => r.id === selectedRuleId) ?? sorted[0];
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[12px] text-[var(--text-secondary)]">
        {title ?? "Workflow rules"} · evaluated top-down
      </div>
      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
        <ul className="border-b border-[var(--border-default)] p-2 lg:border-b-0 lg:border-r">
          {sorted.map((rule) => (
            <li key={rule.id}>
              <button
                type="button"
                className={cn(
                  "mb-1 w-full rounded-[var(--radius-control)] px-2 py-2 text-left hover:bg-[var(--surface-hover)]",
                  selectedRuleId === rule.id && "bg-[var(--surface-selected)]"
                )}
                onClick={() => onSelectRule(rule.id)}
              >
                <div className="font-mono text-[12px] text-[var(--text-primary)]">{rule.label}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{rule.condition}</div>
                <div className="text-[11px] text-[var(--text-secondary)]">→ {rule.routesTo}</div>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 p-3">
          {active ? (
            <div>
              <div className="mb-1 font-mono text-[13px] text-[var(--text-primary)]">{active.label}</div>
              <p className="text-[12px] text-[var(--text-secondary)]">
                If <span className="font-mono">{active.condition}</span>, route to{" "}
                <strong>{active.routesTo}</strong>.
              </p>
              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                Select the rule that best explains the defect, then quantify impact and choose a fix.
              </p>
            </div>
          ) : null}

          {impactPrompt && impactOptions?.length ? (
            <div>
              <div className="mb-2 text-[11px] font-medium text-[var(--text-secondary)]">{impactPrompt}</div>
              <div className="flex flex-wrap gap-2">
                {impactOptions.map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={selectedImpactCount === n ? "secondary" : "quiet"}
                    disabled={readOnly}
                    onClick={() => onSelectImpact(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="mb-2 text-[11px] font-medium text-[var(--text-secondary)]">Recommended fix</div>
            <div className="flex flex-col gap-2">
              {fixOptions.map((fix) => (
                <button
                  key={fix.id}
                  type="button"
                  disabled={readOnly}
                  className={cn(
                    "rounded-[var(--radius-control)] border px-3 py-2 text-left text-[12px]",
                    selectedFixId === fix.id
                      ? "border-[var(--action-ink)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                      : "border-[var(--border-default)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  )}
                  onClick={() => onSelectFix(fix.id)}
                >
                  {fix.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationToasts({
  items,
}: {
  items: Array<{ id: string; message: string; tone: string }>;
}) {
  if (!items.length) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex w-80 flex-col gap-2">
      {items.slice(-3).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[12px] text-[var(--text-primary)] shadow-[var(--shadow-pop)]"
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}

export function DevInspector({
  attempt,
}: {
  attempt: import("@/lib/sim-engine/types").SimulationAttempt;
}) {
  return (
    <aside className="max-h-64 overflow-auto border-t border-[var(--border-strong)] bg-[var(--surface-deep)] p-2 font-mono text-[10px] text-[var(--text-tertiary)]">
      <div className="mb-1 text-[11px] font-semibold text-[var(--text-secondary)]">DEV INSPECTOR</div>
      <div>status={attempt.status} seed={attempt.metadata.seed}</div>
      <div>telemetry={attempt.telemetry.length} scenarioEvents={attempt.world.scenarioEvents.length}</div>
      <div>flags={JSON.stringify(attempt.world.flags)}</div>
      <div>
        visibleResources=
        {Object.values(attempt.resources)
          .filter((r) => r.visible)
          .map((r) => r.id)
          .join(",")}
      </div>
      <div>
        hidden=
        {Object.values(attempt.resources)
          .filter((r) => !r.visible)
          .map((r) => r.id)
          .join(",")}
      </div>
      <div>
        tasks=
        {Object.values(attempt.tasks)
          .map((t) => `${t.id}:${t.status}`)
          .join(" | ")}
      </div>
    </aside>
  );
}
