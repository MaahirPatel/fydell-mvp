import type { CodeLine } from "@/lib/marketing/demo-fixture";

const TOKEN =
  /(#.*$|\/\/.*$)|(f?"[^"]*")|(@[\w.]+)|\b(def|async|await|return|if|not|from|import|class|None|True|False|const|let|export|function|for|new|true|false)\b|\b(\d+)\b/g;

function highlight(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const [value, comment, str, decorator, keyword, num] = m;
    const color = comment
      ? "text-[var(--text-tertiary)]"
      : str
        ? "text-[var(--ink-teal)]"
        : decorator
          ? "text-[var(--ink-coral)]"
          : keyword
            ? "text-[var(--ink-violet)]"
            : num
              ? "text-[var(--ink-warm)]"
              : "";
    out.push(
      <span key={start} className={color}>
        {value}
      </span>,
    );
    last = start + value.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const MARK: Record<NonNullable<CodeLine["mark"]>, string> = {
  cited: "bg-[var(--accent-soft)]",
  observed: "bg-[var(--field-violet)]",
  added: "bg-[var(--ev-success-field)]",
  removed: "bg-[var(--ev-error-field)]",
};

export function CodeBlock({
  path,
  meta,
  lines,
  compact = false,
}: {
  path: string;
  meta?: string;
  lines: readonly CodeLine[];
  compact?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-panel)] text-[var(--text-primary)]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 font-mono text-app-meta text-[var(--text-tertiary)]">
        <span className="truncate">{path}</span>
        {meta ? <span className="shrink-0">{meta}</span> : null}
      </figcaption>
      <pre className={`overflow-x-auto py-2 font-mono leading-[1.75] ${compact ? "text-app-caption" : "text-app-meta"}`}>
        <code>
          {lines.map((line) => (
            <span
              key={line.n}
              className={`flex min-w-max pr-4 ${line.mark ? MARK[line.mark] : ""}`}
            >
              <span aria-hidden className={`shrink-0 select-none pr-3 text-right text-[var(--text-tertiary)] ${compact ? "w-8" : "w-11"}`}>
                {line.n}
              </span>
              {line.mark === "added" ? (
                <span aria-hidden className="w-3 shrink-0 text-[var(--status-positive-ink)]">+</span>
              ) : (
                <span aria-hidden className="w-3 shrink-0" />
              )}
              <span className="whitespace-pre">{highlight(line.text)}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
