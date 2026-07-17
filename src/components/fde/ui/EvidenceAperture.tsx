"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type ApertureEventRef = {
  id: string;
  eventType: string;
  actor: string;
  sourceSurface: string | null;
  createdAt: string;
  summary: string;
};

export type ApertureArtifactRef = {
  id: string;
  type: string;
  createdAt: string;
};

export type ApertureFinding = {
  id: string;
  dimension: string;
  observation: string;
  interpretation: string | null;
  confidence: string;
  eventRefs: string[];
  artifactRefs: string[];
};

/**
 * One finding, expandable to its source event/artifact refs — the "aperture"
 * onto the raw evidence behind a generated observation. Renders nothing extra
 * when a finding has no linked refs (e.g. a heartbeat-derived finding).
 */
export default function EvidenceAperture({
  finding,
  eventsById,
  artifactsById = {},
}: {
  finding: ApertureFinding;
  eventsById: Record<string, ApertureEventRef>;
  artifactsById?: Record<string, ApertureArtifactRef>;
}) {
  const [open, setOpen] = useState(false);

  const eventRefs = finding.eventRefs.map((id) => eventsById[id]).filter((e): e is ApertureEventRef => Boolean(e));
  const artifactRefs = finding.artifactRefs
    .map((id) => artifactsById[id])
    .filter((a): a is ApertureArtifactRef => Boolean(a));
  const refCount = eventRefs.length + artifactRefs.length;
  const hasRefs = refCount > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold capitalize text-white">
          {finding.dimension.replace(/_/g, " ")}
        </h3>
        <span className="text-[11px] text-white/40">{finding.confidence} confidence</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{finding.observation}</p>
      {finding.interpretation && (
        <p className="mt-1 text-[13px] leading-relaxed text-white/55">{finding.interpretation}</p>
      )}

      <button
        type="button"
        onClick={() => hasRefs && setOpen((v) => !v)}
        disabled={!hasRefs}
        aria-expanded={open}
        className={
          "mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium " +
          (hasRefs ? "text-[#8FA3FF] hover:text-[#B8C4FF]" : "cursor-default text-white/30")
        }
      >
        {hasRefs && <ChevronDown className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")} />}
        {hasRefs
          ? `${open ? "Hide" : "Show"} ${refCount} source ${refCount === 1 ? "reference" : "references"}`
          : "No linked events recorded for this finding"}
      </button>

      {open && hasRefs && (
        <ol className="mt-2.5 space-y-2 rounded-[10px] border border-white/[0.06] bg-[#0E1118] p-3">
          {eventRefs.map((ref) => (
            <li key={ref.id} className="text-[12px] leading-relaxed text-white/60">
              <span className="font-medium capitalize text-white/80">{ref.eventType.replace(/_/g, " ")}</span>
              {ref.sourceSurface && <span className="text-white/35"> · {ref.sourceSurface}</span>}
              <span className="mx-1.5 text-white/25">—</span>
              <span>{ref.summary}</span>
              <time
                dateTime={ref.createdAt}
                className="ml-2 whitespace-nowrap text-white/35"
                title={new Date(ref.createdAt).toLocaleString()}
              >
                {new Date(ref.createdAt).toLocaleTimeString()}
              </time>
            </li>
          ))}
          {artifactRefs.map((ref) => (
            <li key={ref.id} className="text-[12px] leading-relaxed text-white/60">
              <span className="font-medium capitalize text-white/80">Artifact · {ref.type}</span>
              <time
                dateTime={ref.createdAt}
                className="ml-2 whitespace-nowrap text-white/35"
                title={new Date(ref.createdAt).toLocaleString()}
              >
                {new Date(ref.createdAt).toLocaleTimeString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
