import type { CodeLine } from "@/lib/marketing/demo-fixture";

const TOKEN =
  /(#.*$)|(f?"[^"]*")|(@[\w.]+)|\b(def|async|await|return|if|not|from|import|class|None|True|False)\b|\b(\d+)\b/g;

function highlight(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const [value, comment, str, decorator, keyword, num] = m;
    const color = comment
      ? "text-[oklch(55%_0.012_258)]"
      : str
        ? "text-[oklch(44%_0.09_178)]"
        : decorator
          ? "text-[oklch(50%_0.17_18)]"
          : keyword
            ? "text-[oklch(46%_0.2_285)]"
            : num
              ? "text-[oklch(52%_0.13_60)]"
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
  cited: "bg-[oklch(95%_0.04_178)] shadow-[inset_2px_0_0_oklch(58%_0.11_178)]",
  observed: "bg-[oklch(95.5%_0.035_285)] shadow-[inset_2px_0_0_oklch(56%_0.2_285)]",
  added: "bg-[oklch(95.5%_0.045_150)] shadow-[inset_2px_0_0_oklch(56%_0.14_150)]",
  removed: "bg-[oklch(95.5%_0.03_18)] shadow-[inset_2px_0_0_oklch(58%_0.19_18)]",
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
    <figure className="overflow-hidden rounded-[6px] border border-[oklch(22%_0.02_258/0.12)] bg-[oklch(98.6%_0.003_258)] text-[oklch(24%_0.02_258)]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-[oklch(22%_0.02_258/0.1)] px-4 py-2.5 font-mono text-app-meta text-[oklch(48%_0.016_258)]">
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
              <span aria-hidden className={`shrink-0 select-none pr-3 text-right text-[oklch(62%_0.01_258)] ${compact ? "w-8" : "w-11"}`}>
                {line.n}
              </span>
              {line.mark === "added" ? (
                <span aria-hidden className="w-3 shrink-0 text-[oklch(50%_0.14_150)]">+</span>
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
