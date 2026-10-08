"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleX, FileCode2, FileText, Info, Lock } from "lucide-react";
import type { DiffOp, FileDiff, LineRange } from "@/lib/sandbox-demo/diff";
import { toHunks } from "@/lib/sandbox-demo/diff";
import { CRITERION_STATE_LABEL, type CriterionState } from "@/lib/sandbox-demo/report";
import type { DemoDifficulty } from "@/lib/sandbox-demo/catalog-types";
import type { TestMeta, TestStatus } from "@/lib/sandbox-demo/types";
import s from "./demo.module.css";

export const DIFFICULTY_LABEL: Record<DemoDifficulty, string> = {
  introductory: "Introductory",
  moderate: "Moderate",
  challenging: "Challenging",
};

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function Note({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className={s.note}>
      <span className={s.noteIcon} aria-hidden>
        {icon ?? <Info size={15} />}
      </span>
      <div>{children}</div>
    </div>
  );
}

const STATE_TONE: Record<CriterionState, "positive" | "attention" | "concern" | "neutral"> = {
  demonstrated: "positive",
  partially_demonstrated: "attention",
  concern_observed: "concern",
  not_assessed: "neutral",
};

export function StateBadge({ state }: { state: CriterionState }) {
  return (
    <span className={s.badge} data-tone={STATE_TONE[state]}>
      {CRITERION_STATE_LABEL[state]}
    </span>
  );
}

export type BadgeTone = "positive" | "attention" | "concern" | "neutral" | "info";

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={s.badge} data-tone={tone}>
      {children}
    </span>
  );
}

export function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "pass") return <CircleCheck size={15} className={cx(s.testIcon, s.pass)} aria-label="Passed" />;
  if (status === "fail") return <CircleX size={15} className={cx(s.testIcon, s.fail)} aria-label="Failed" />;
  return <CircleDashed size={15} className={cx(s.testIcon, s.notRun)} aria-label="Not run" />;
}

export type TestRowData = { meta: TestMeta; status: TestStatus; message: string | null };

/**
 * `audience` decides how protected tests appear: candidates only ever see the
 * requirement a protected test checks, never its name or input.
 */
export function TestList({ rows, audience }: { rows: TestRowData[]; audience: "candidate" | "evaluator" }) {
  return (
    <ul className={s.testList}>
      {rows.map(({ meta, status, message }) => {
        const hideName = audience === "candidate" && meta.visibility === "protected";
        return (
          <li key={meta.id} className={s.testRow}>
            <StatusIcon status={status} />
            <div className="min-w-0">
              {hideName ? (
                <p className={s.testReq}>{meta.requirement}</p>
              ) : (
                <>
                  <p className={s.testName}>{meta.name}</p>
                  <p className={s.meta}>{meta.requirement}</p>
                </>
              )}
              {status === "fail" && message && !hideName ? <pre className={s.testMsg}>{message}</pre> : null}
              {status === "not_run" ? <p className={s.meta}>Not run in this scope.</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FileIcon({ path }: { path: string }) {
  return path.endsWith(".md") ? <FileText size={14} aria-hidden /> : <FileCode2 size={14} aria-hidden />;
}

export function LockIcon() {
  return <Lock size={12} aria-hidden />;
}

function inRanges(line: number, ranges: LineRange[]): boolean {
  return ranges.some((r) => line >= r.start && line <= r.end);
}

/** Read-only source with line numbers and optional highlighted ranges. */
export function CodeView({ text, label, highlight = [] }: { text: string; label: string; highlight?: LineRange[] }) {
  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
  return (
    <div className={s.code} role="region" aria-label={label} tabIndex={0} data-lenis-prevent>
      {lines.map((line, i) => {
        const hl = inRanges(i + 1, highlight);
        return (
          <div key={i} className={s.codeLines}>
            <span className={cx(s.codeNum, hl && s.codeHl)}>{i + 1}</span>
            <span className={cx(s.codeText, hl && s.codeHl)}>{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

function DiffRow({ op, path, highlight }: { op: DiffOp; path: string; highlight: LineRange[] }) {
  const hl = op.newLine !== null && inRanges(op.newLine, highlight);
  const sign = op.kind === "add" ? "+" : op.kind === "del" ? "\u2212" : " ";
  return (
    <div
      className={s.diffRow}
      data-kind={op.kind}
      data-hl={hl ? "true" : undefined}
      id={op.newLine !== null ? `diff-${path}-${op.newLine}` : undefined}
    >
      <span>{op.oldLine ?? ""}</span>
      <span>{op.newLine ?? ""}</span>
      <span aria-hidden>{sign}</span>
      <span>
        <span className="sr-only">{op.kind === "add" ? "Added: " : op.kind === "del" ? "Removed: " : ""}</span>
        {op.text || " "}
      </span>
    </div>
  );
}

export function DiffView({ diffs, highlight }: { diffs: FileDiff[]; highlight?: { path: string; ranges: LineRange[] } | null }) {
  if (diffs.length === 0) {
    return <p className={cx(s.panelBody, s.meta)}>No files differ from the starter code.</p>;
  }
  return (
    <div className={s.diff} data-lenis-prevent>
      {diffs.map((d) => (
        <section key={d.path} className={s.diffFile} aria-label={`Changes in ${d.path}`}>
          <div className={s.diffFileHead}>
            <FileIcon path={d.path} />
            <span className={s.mono}>{d.path}</span>
            <span className={s.add}>+{d.added}</span>
            <span className={s.del}>{"\u2212"}{d.removed}</span>
          </div>
          {toHunks(d.ops, 3).map((h) => (
            <div key={h.header}>
              <div className={s.diffHunk}>{h.header}</div>
              {h.ops.map((op, i) => (
                <DiffRow key={i} op={op} path={d.path} highlight={highlight && highlight.path === d.path ? highlight.ranges : []} />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const index = tabs.findIndex((t) => t.id === value);
    const next =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    const el = document.getElementById(`${idPrefix}-tab-${tabs[next].id}`);
    el?.focus();
  }
  return (
    <div className={s.tabs} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`${idPrefix}-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={t.id === value ? 0 : -1}
          className={s.tab}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
