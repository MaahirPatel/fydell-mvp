import type { ReactNode } from "react";
import v from "./visuals.module.css";

const KEYWORDS = new Set([
  "def", "return", "if", "elif", "else", "try", "except", "in", "not", "and", "or", "import", "from",
  "for", "while", "None", "True", "False", "raise", "with", "as", "class", "func", "range", "err", "nil",
]);

/** A deliberately small highlighter: keywords, strings, numbers, comments, call names. */
export function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(#.*$|\/\/.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(?=\s*\()|([A-Za-z_][A-Za-z0-9_]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const [tok, com, str, num, call, word] = m;
    if (com) out.push(<span key={k++} className={v.com}>{tok}</span>);
    else if (str) out.push(<span key={k++} className={v.str}>{tok}</span>);
    else if (num) out.push(<span key={k++} className={v.num}>{tok}</span>);
    else if (call) out.push(KEYWORDS.has(call) ? <span key={k++} className={v.kw}>{tok}</span> : <span key={k++} className={v.fn}>{tok}</span>);
    else if (word && KEYWORDS.has(word)) out.push(<span key={k++} className={v.kw}>{tok}</span>);
    else out.push(tok);
    last = m.index + tok.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

export type DiffLine = { n?: number; t: " " | "+" | "-" | "@"; src: string; focus?: boolean };

export function CodeLines({ lines, className }: { lines: DiffLine[]; className?: string }) {
  return (
    <div className={className ?? v.code}>
      {lines.map((l, i) =>
        l.t === "@" ? (
          <span key={i} className={v.hunk}>
            {l.src}
          </span>
        ) : (
          <div
            key={i}
            className={[v.line, l.t === "+" && v.lineAdd, l.t === "-" && v.lineDel, l.focus && v.lineFocus]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={v.ln}>{l.n ?? ""}</span>
            <span className={v.sign}>{l.t === " " ? "" : l.t}</span>
            <span className={v.src}>{highlight(l.src)}</span>
          </div>
        ),
      )}
    </div>
  );
}
