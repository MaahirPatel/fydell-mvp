/**
 * Thin evidence rail: requirement → action → citation.
 * Dark-surface variant for marketing pages.
 */
export type EvidenceRailNode = {
  label: string;
  detail: string;
};

export default function EvidenceRail({
  nodes,
  className = "",
}: {
  nodes: EvidenceRailNode[];
  className?: string;
}) {
  return (
    <ol
      className={`relative space-y-0 ${className}`}
      aria-label="Evidence path from requirement to citation"
    >
      <span
        className="absolute bottom-3 left-[7px] top-3 w-px bg-violet-500/50"
        aria-hidden
      />
      {nodes.map((node, i) => (
        <li key={`${node.label}-${i}`} className="relative flex gap-4 py-3 pl-0">
          <span
            className="relative z-10 mt-1.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center"
            aria-hidden
          >
            <span className="h-[9px] w-[9px] rounded-full border-2 border-violet-400 bg-[#0c0d10]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#F4F5F7]">{node.label}</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
              {node.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
