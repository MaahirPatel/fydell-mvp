"use client";

/**
 * The evidence trace: how a piece of work became a judgement.
 *
 *   Source -> Candidate action -> Claim -> Citation -> Limitation -> Revision -> Judgment
 *
 * This is the most Fydell-specific object in the system, so it is one component
 * with three orientations rather than three lookalike drawings:
 *
 *   horizontal  wide marketing surfaces
 *   vertical    the rail beside a report
 *   compact     a lineage cell inside an app table row
 *
 * It is functional, not ornamental. Nodes are buttons when a caller passes
 * `onSelect`, and the stage name is always written out, so the trace never
 * depends on the blue/red distinction alone to be understood.
 */
import type { ReactNode } from "react";

export type TraceStage =
  | "source"
  | "action"
  | "claim"
  | "citation"
  | "limitation"
  | "revision"
  | "judgment";

export type TraceNode = {
  stage: TraceStage;
  /** Short noun phrase, e.g. "quality_events.csv". */
  label: string;
  /** One line of detail shown in the wider orientations. */
  detail?: string;
  /** Marks the node as the contradicted or risk-carrying step. */
  tone?: "neutral" | "risk" | "verified";
};

const STAGE_NAME: Record<TraceStage, string> = {
  source: "Source",
  action: "Candidate action",
  claim: "Claim",
  citation: "Citation",
  limitation: "Limitation",
  revision: "Revision",
  judgment: "Employer judgment",
};

const DOT: Record<NonNullable<TraceNode["tone"]>, string> = {
  neutral: "border-[rgba(107,140,255,0.5)] bg-[rgba(107,140,255,0.2)]",
  risk: "border-[rgba(242,107,130,0.55)] bg-[rgba(242,107,130,0.22)]",
  verified: "border-[rgba(176,127,208,0.55)] bg-[rgba(176,127,208,0.22)]",
};

const RULE: Record<NonNullable<TraceNode["tone"]>, string> = {
  neutral: "bg-[rgba(107,140,255,0.32)]",
  risk: "bg-[rgba(242,107,130,0.34)]",
  verified: "bg-[rgba(176,127,208,0.34)]",
};

function Dot({ tone = "neutral" }: { tone?: TraceNode["tone"] }) {
  return (
    <span
      aria-hidden
      className={`block h-[9px] w-[9px] shrink-0 rounded-full border ${DOT[tone ?? "neutral"]}`}
    />
  );
}

/* ---------------------------------------------------------------- horizontal */

function Horizontal({
  nodes,
  selected,
  onSelect,
}: {
  nodes: TraceNode[];
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="flex items-stretch gap-0">
      {nodes.map((node, i) => {
        const isSelected = selected === i;
        const body = (
          <>
            <div className="flex items-center gap-2">
              <Dot tone={node.tone} />
              {i < nodes.length - 1 ? (
                <span
                  aria-hidden
                  className={`h-px flex-1 ${RULE[node.tone ?? "neutral"]}`}
                />
              ) : null}
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-[var(--text-tertiary)]">
              {STAGE_NAME[node.stage]}
            </p>
            <p
              className={`mt-1 text-[12.5px] leading-[1.4] ${
                isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {node.label}
            </p>
            {node.detail ? (
              <p className="mt-1 text-[11.5px] leading-[1.45] text-[var(--text-tertiary)]">
                {node.detail}
              </p>
            ) : null}
          </>
        );

        return (
          <li key={i} className="min-w-0 flex-1">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={isSelected}
                className="w-full pr-3 text-left"
              >
                {body}
              </button>
            ) : (
              <div className="pr-3">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ vertical */

function Vertical({
  nodes,
  selected,
  onSelect,
}: {
  nodes: TraceNode[];
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="relative">
      {nodes.map((node, i) => {
        const isSelected = selected === i;
        const body = (
          <>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              {STAGE_NAME[node.stage]}
            </p>
            <p
              className={`mt-0.5 text-[12.5px] leading-[1.45] ${
                isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {node.label}
            </p>
            {node.detail ? (
              <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[var(--text-tertiary)]">
                {node.detail}
              </p>
            ) : null}
          </>
        );

        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="relative flex w-[9px] shrink-0 flex-col items-center">
              <span className="mt-[5px]">
                <Dot tone={node.tone} />
              </span>
              {i < nodes.length - 1 ? (
                <span
                  aria-hidden
                  className={`mt-1 w-px flex-1 ${RULE[node.tone ?? "neutral"]}`}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-pressed={isSelected}
                  className={`-mx-2 w-[calc(100%+1rem)] rounded-[var(--radius-control)] px-2 py-1 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--surface-hover)]"
                      : "hover:bg-[rgba(255,255,255,0.045)]"
                  }`}
                >
                  {body}
                </button>
              ) : (
                body
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------- compact */

function Compact({ nodes }: { nodes: TraceNode[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {nodes.map((node, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <Dot tone={node.tone} />
          {i < nodes.length - 1 ? (
            <span
              aria-hidden
              className={`h-px w-3 ${RULE[node.tone ?? "neutral"]}`}
            />
          ) : null}
        </span>
      ))}
      <span className="sr-only">
        {nodes.map((n) => `${STAGE_NAME[n.stage]}: ${n.label}`).join(". ")}
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------- public */

export function EvidenceTrace({
  nodes,
  orientation = "horizontal",
  selected,
  onSelect,
  caption,
  className = "",
}: {
  nodes: TraceNode[];
  orientation?: "horizontal" | "vertical" | "compact";
  selected?: number;
  onSelect?: (index: number) => void;
  /** Screen-reader summary of what the trace shows. */
  caption?: ReactNode;
  className?: string;
}) {
  if (orientation === "compact") {
    return (
      <span className={className}>
        <Compact nodes={nodes} />
      </span>
    );
  }

  return (
    <div className={className}>
      {caption ? <p className="sr-only">{caption}</p> : null}
      {orientation === "vertical" ? (
        <Vertical nodes={nodes} selected={selected} onSelect={onSelect} />
      ) : (
        <Horizontal nodes={nodes} selected={selected} onSelect={onSelect} />
      )}
    </div>
  );
}
