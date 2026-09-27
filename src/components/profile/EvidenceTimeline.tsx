import { PROVENANCE_LABELS, type EvidenceProvenance, type TimelineItem } from "@/lib/profile/types";

const PROVENANCE_BADGE: Record<EvidenceProvenance, string> = {
  "observed-simulation": "badge-teal",
  "repository-observation": "badge-neutral",
  "local-import": "badge-attention",
};

export function ProvenanceBadge({ provenance }: { provenance: EvidenceProvenance }) {
  const label = PROVENANCE_LABELS[provenance];
  return (
    <span className={`badge ${PROVENANCE_BADGE[provenance]}`} title={label.detail}>
      {label.short}
    </span>
  );
}

const KIND_LABEL: Record<TimelineItem["kind"], string> = {
  simulation: "Simulation",
  "github-project": "GitHub",
  "editor-import": "Editor history",
};

export default function EvidenceTimeline({
  items,
  emptyHint,
}: {
  items: TimelineItem[];
  emptyHint?: string;
}) {
  if (!items.length) {
    return (
      <p className="rounded-[10px] border border-dashed border-[var(--border-default)] p-5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
        {emptyHint ?? "No evidence yet. Complete a simulation, connect GitHub, or import editor history to start building your timeline."}
      </p>
    );
  }
  return (
    <ol className="relative space-y-0 border-l border-[var(--border-subtle)] pl-0">
      {items.map((item) => (
        <li key={item.id} className="relative pb-6 pl-6 last:pb-0">
          <span
            aria-hidden
            className="absolute left-[-5px] top-[5px] h-[9px] w-[9px] rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-canvas)]"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="underline decoration-[var(--border-default)] underline-offset-4 hover:decoration-[var(--text-secondary)]">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </p>
            <ProvenanceBadge provenance={item.provenance} />
          </div>
          <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">{item.detail}</p>
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {KIND_LABEL[item.kind]}
            {" · "}
            {new Date(item.occurredAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </li>
      ))}
    </ol>
  );
}
