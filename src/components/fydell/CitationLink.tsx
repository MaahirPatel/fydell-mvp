"use client";

/**
 * Citation geometry.
 *
 * A citation in Fydell is always the same shape: an index, a source file, and
 * the location inside it. Keeping that shape identical in the workbench, the
 * report and the marketing scenes is what makes it read as one product rather
 * than three separate designs.
 *
 * Deliberately not a chip or pill. It is a numbered marker followed by a
 * monospaced location, so it looks like a reference rather than a tag.
 */

export type Citation = {
  /** Position in the claim's citation list, rendered as the marker. */
  index: number;
  /** File or artifact the claim draws on. */
  source: string;
  /** Where inside the source, e.g. "rows 41-52" or "Q-303, Q-304". */
  locator: string;
  /** Blue for supporting source material, red where the citation is what contradicts a claim. */
  tone?: "source" | "contradiction";
};

const TONE = {
  source: {
    marker:
      "border-[var(--border-default)] bg-[var(--surface-selected)] text-[var(--text-secondary)]",
    /** Named so the meaning survives without colour. */
    role: "Source",
  },
  contradiction: {
    marker:
      "border-[color-mix(in_srgb,var(--fydell-risk)_30%,transparent)] bg-[color-mix(in_srgb,var(--fydell-risk)_8%,transparent)] text-[var(--fydell-risk)]",
    role: "Contradicts",
  },
} as const;

export function CitationMarker({
  index,
  tone = "source",
}: {
  index: number;
  tone?: Citation["tone"];
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[4px] border px-1 text-[10.5px] font-medium tabular-nums ${TONE[tone].marker}`}
    >
      {index}
    </span>
  );
}

export function CitationLink({
  citation,
  selected = false,
  onSelect,
}: {
  citation: Citation;
  selected?: boolean;
  /** Omit to render a static reference rather than an openable one. */
  onSelect?: (citation: Citation) => void;
}) {
  const tone = citation.tone ?? "source";
  const inner = (
    <>
      <CitationMarker index={citation.index} tone={tone} />
      <span className="truncate text-[12px] text-[var(--text-secondary)]">
        {citation.source}
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
        {citation.locator}
      </span>
    </>
  );

  const label = `${TONE[tone].role}: ${citation.source}, ${citation.locator}`;

  if (!onSelect) {
    return (
      <span className="inline-flex items-center gap-1.5" title={label}>
        <span className="sr-only">{TONE[tone].role}: </span>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(citation)}
      aria-pressed={selected}
      className={`inline-flex w-full items-center gap-1.5 rounded-[var(--radius-control)] px-1.5 py-1 text-left transition-colors ${
        selected
          ? "bg-[var(--surface-hover)]"
          : "hover:bg-[var(--surface-hover)]"
      }`}
    >
      <span className="sr-only">
        {selected ? "Open citation. " : ""}
        {TONE[tone].role}:{" "}
      </span>
      {inner}
    </button>
  );
}

/**
 * The opened source. Shows the actual lines a claim rests on, so "inspectable"
 * is demonstrated rather than asserted.
 */
export function CitationSource({
  citation,
  lines,
}: {
  citation: Citation;
  /** The excerpt, already trimmed to what matters. Highlighted rows carry the claim. */
  lines: { text: string; highlight?: boolean }[];
}) {
  const tone = citation.tone ?? "source";
  return (
    <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-2.5 py-1.5">
        <CitationMarker index={citation.index} tone={tone} />
        <span className="truncate text-[12px] text-[var(--text-secondary)]">
          {citation.source}
        </span>
        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
          {citation.locator}
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`flex gap-2 px-2.5 py-1 text-[12px] tabular-nums ${
              line.highlight
                ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)]"
            }`}
          >
            <span className="truncate">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
