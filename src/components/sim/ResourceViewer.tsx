"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// CSV parsing (quoted fields supported)
// ---------------------------------------------------------------------------
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  const headers = rows.shift() || [];
  return { headers, rows };
}

function CsvTable({ content }: { content: string }) {
  const { headers, rows } = useMemo(() => parseCsv(content), [content]);
  const [query, setQuery] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const filtered = useMemo(() => {
    let out = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) => r.some((c) => c.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      out = [...out].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const an = parseFloat(av);
        const bn = parseFloat(bv);
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * sortDir;
        return av.localeCompare(bv) * sortDir;
      });
    }
    return out;
  }, [rows, query, sortCol, sortDir]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter rows…"
          aria-label="Filter table rows"
          className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
        <span className="text-xs text-slate-500">
          {filtered.length} of {rows.length} rows
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border-b border-slate-200 p-0 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortCol === i) setSortDir((d) => (d === 1 ? -1 : 1));
                      else {
                        setSortCol(i);
                        setSortDir(1);
                      }
                    }}
                    className="flex w-full items-center gap-1 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {h}
                    {sortCol === i && (
                      <span aria-hidden className="text-slate-400">
                        {sortDir === 1 ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-slate-50/60">
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="whitespace-nowrap border-b border-slate-100 px-3 py-1.5 font-mono text-[12.5px] text-slate-800"
                  >
                    {r[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No rows match that filter.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimal markdown rendering (headings, tables, lists, bold/code). Content
// is authored in-house, not user-generated.
// ---------------------------------------------------------------------------
function inlineMd(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**"))
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else
      parts.push(
        <code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px]">
          {token.slice(1, -1)}
        </code>
      );
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownDoc({ content }: { content: string }) {
  const blocks = useMemo(() => {
    // Keep fenced code blocks intact while splitting on blank lines.
    const out: string[] = [];
    let buffer: string[] = [];
    let inFence = false;
    for (const line of content.split("\n")) {
      if (line.trimStart().startsWith("```")) {
        inFence = !inFence;
        buffer.push(line);
        if (!inFence) {
          out.push(buffer.join("\n"));
          buffer = [];
        }
        continue;
      }
      if (inFence) {
        buffer.push(line);
        continue;
      }
      if (line.trim() === "") {
        if (buffer.length) out.push(buffer.join("\n"));
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
    if (buffer.length) out.push(buffer.join("\n"));
    return out;
  }, [content]);
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6 text-[15px] leading-relaxed text-slate-800">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        // Fenced code block
        if (lines[0].trimStart().startsWith("```")) {
          const code = lines.slice(1, lines[lines.length - 1].trimStart().startsWith("```") ? -1 : undefined).join("\n");
          return (
            <pre
              key={bi}
              className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-[12.5px] leading-[1.7] text-slate-200"
            >
              {code}
            </pre>
          );
        }
        // Table
        if (lines.length >= 2 && lines[0].includes("|") && /^[\s|:-]+$/.test(lines[1])) {
          const parse = (l: string) =>
            l.split("|").map((c) => c.trim()).filter((_, i, a) => !(i === 0 && a[0] === "") && !(i === a.length - 1 && a[a.length - 1] === ""));
          const headers = parse(lines[0]);
          const rows = lines.slice(2).map(parse);
          return (
            <div key={bi} className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-800">
                        {inlineMd(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri} className="odd:bg-white even:bg-slate-50/50">
                      {headers.map((_, ci) => (
                        <td key={ci} className="border border-slate-200 px-3 py-2 text-slate-800">
                          {inlineMd(r[ci] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // Headings
        if (block.startsWith("### "))
          return <h4 key={bi} className="pt-2 text-[14px] font-semibold text-slate-900">{inlineMd(block.slice(4))}</h4>;
        if (block.startsWith("## "))
          return <h3 key={bi} className="pt-2 text-[15px] font-semibold text-slate-900">{inlineMd(block.slice(3))}</h3>;
        if (block.startsWith("# "))
          return <h2 key={bi} className="text-lg font-semibold text-slate-900">{inlineMd(block.slice(2))}</h2>;
        // Lists
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{inlineMd(l.replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={bi}>{lines.map((l, li) => (
          <span key={li}>
            {inlineMd(l)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}</p>;
      })}
    </div>
  );
}

function LogView({ content }: { content: string }) {
  const [query, setQuery] = useState("");
  const lines = useMemo(() => content.split("\n"), [content]);
  const filtered = query.trim()
    ? lines.filter((l) => l.toLowerCase().includes(query.toLowerCase()))
    : lines;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search log lines…"
          aria-label="Search log lines"
          className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-[13px] focus:border-slate-500 focus:outline-none"
        />
        <span className="text-xs text-slate-500">{filtered.length} lines</span>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto bg-slate-950 p-4 font-mono text-[12px] leading-[1.7] text-slate-200">
        {filtered.map((l, i) => (
          <div key={i} className={/error|fail|warn/i.test(l) ? "text-amber-300" : undefined}>
            {l || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
export function ResourceViewer({
  kind,
  content,
}: {
  kind: string;
  content: string;
}) {
  if (kind === "csv") return <CsvTable content={content} />;
  if (kind === "log") return <LogView content={content} />;
  if (kind === "json")
    return (
      <pre className="h-full overflow-auto bg-slate-950 p-4 font-mono text-[12.5px] leading-relaxed text-emerald-200">
        {content}
      </pre>
    );
  return (
    <div className="h-full overflow-auto">
      <MarkdownDoc content={content} />
    </div>
  );
}
