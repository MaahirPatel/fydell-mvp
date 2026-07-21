"use client";

import { useMemo, useRef, useState, useEffect } from "react";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ROW_H = 32;
const OVERSCAN = 12;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function looksMismatchedId(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^\d{4,}$/.test(v)) return true;
  if (/^[a-z]+-\d+$/.test(v)) return true;
  if (/^[A-Z]+\d+$/.test(v)) return true;
  if (/^[A-Z]+-\d{1,3}$/.test(v)) return true;
  return false;
}

/**
 * Virtualized editable data grid — sustained scroll without DOM explosion.
 */
export default function VirtualizedDataGrid({
  content,
  path,
  onCellEdit,
  compareContent,
}: {
  content: string;
  path: string;
  onCellEdit?: (row: number, col: number, newValue: string) => void;
  compareContent?: string | null;
}) {
  const rows = useMemo(() => parseCsv(content), [content]);
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(400);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  if (!rows.length) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#687182]">
        {path} is empty.
      </div>
    );
  }

  const [header, ...body] = rows;
  const idCol = header.findIndex((h) => /shipment|id/i.test(h));

  const indexed = useMemo(() => {
    let next = body.map((r, idx) => ({ r, idx: idx + 1 }));
    const q = filter.trim().toLowerCase();
    if (q) next = next.filter(({ r }) => r.some((c) => (c || "").toLowerCase().includes(q)));
    if (sortCol != null) {
      next = [...next].sort((a, b) => {
        const av = a.r[sortCol] ?? "";
        const bv = b.r[sortCol] ?? "";
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return next;
  }, [body, filter, sortCol, sortAsc]);

  const unmatched = idCol >= 0 ? body.filter((r) => looksMismatchedId(r[idCol] || "")).length : 0;
  const totalH = indexed.length * ROW_H;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visibleCount = Math.ceil(viewportH / ROW_H) + OVERSCAN * 2;
  const slice = indexed.slice(start, start + visibleCount);
  const compareRows = compareContent ? Math.max(0, parseCsv(compareContent).length - 1) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080A0F]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <p className="text-[12px] text-[#9AA3B2]">
          <span className="text-[#F4F5F7]">{path.split("/").pop()}</span>
          {" · "}
          {body.length} rows
          {unmatched ? ` · ${unmatched} possible ID issues` : ""}
          {compareRows != null ? ` · compare source ${compareRows} rows` : ""}
          {" · virtualized"}
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="ml-auto h-8 w-[160px] rounded-[7px] border border-white/10 bg-[#0B0F16] px-2 text-[12px]"
        />
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: totalH + ROW_H, position: "relative" }}>
          <table className="w-full border-collapse text-[12px]" style={{ fontFamily: MONO }}>
            <thead className="sticky top-0 z-10 bg-[#10141D]">
              <tr>
                {header.map((cell, i) => (
                  <th key={i} className="border-b border-white/15 px-2 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        if (sortCol === i) setSortAsc((a) => !a);
                        else {
                          setSortCol(i);
                          setSortAsc(true);
                        }
                      }}
                      className="font-medium text-[#F4F5F7]/80"
                    >
                      {cell || `col_${i + 1}`}
                      {sortCol === i ? (sortAsc ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* spacer */}
              <tr style={{ height: start * ROW_H }}>
                <td colSpan={header.length} />
              </tr>
              {slice.map(({ r: row, idx }) => {
                const mismatch = idCol >= 0 && looksMismatchedId(row[idCol] || "");
                return (
                  <tr
                    key={idx}
                    style={{ height: ROW_H }}
                    className={mismatch ? "bg-[#F26B82]/[0.12]" : undefined}
                  >
                    {header.map((_, j) => (
                      <td
                        key={j}
                        className={`border-b border-white/[0.06] px-2 ${
                          mismatch && j === idCol ? "text-[#fda4b0]" : "text-[#9AA3B2]"
                        }`}
                      >
                        {onCellEdit ? (
                          <input
                            defaultValue={row[j] ?? ""}
                            key={`${idx}-${j}-${row[j]}`}
                            onBlur={(e) => {
                              if (e.target.value !== (row[j] ?? "")) {
                                onCellEdit(idx, j, e.target.value);
                              }
                            }}
                            className="w-full min-w-[4rem] bg-transparent outline-none focus:bg-white/[0.06]"
                            aria-label={`Row ${idx} column ${header[j]}`}
                          />
                        ) : (
                          row[j] ?? ""
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
