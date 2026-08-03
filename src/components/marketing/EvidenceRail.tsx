/**
 * Brand signature: a thin cobalt rail connecting requirement → action → citation.
 * Information design, not decoration.
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
        className="absolute bottom-3 left-[7px] top-3 w-px bg-[#3157D5]"
        aria-hidden
      />
      {nodes.map((node, i) => (
        <li key={`${node.label}-${i}`} className="relative flex gap-4 py-3 pl-0">
          <span
            className="relative z-10 mt-1.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center"
            aria-hidden
          >
            <span className="h-[9px] w-[9px] rounded-full border-2 border-[#3157D5] bg-[#FCFCFA]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#0B1020]">{node.label}</p>
            <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#586273]">{node.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
