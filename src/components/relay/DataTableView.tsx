"use client";

import { useMemo, useState } from "react";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const MAX_ROWS = 500;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // skip
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Heuristic: IDs that look inconsistently normalized (case / separators). */
function looksMismatchedId(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^[a-z]+_\d+$/i.test(v) && v !== v.toUpperCase().replace("_", "-")) return true;
  if (/^\d{4,}$/.test(v)) return true;
  if (/^[a-z]+-\d+$/.test(v)) return true;
  if (/^[A-Z]+\d+$/.test(v)) return true;
  return false;
}

export default function DataTableView({
  content,
  path,
  compareContent,
  comparePath,
  onCellEdit,
}: {
  content: string;
  path: string;
  compareContent?: string | null;
  comparePath?: string | null;
  /** When set, cells are editable and call back with (rowIndex, colIndex, newValue). */
  onCellEdit?: (row: number, col: number, newValue: string) => void;
}) {
  const rows = useMemo(() => parseCsv(content), [content]);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState("");
  const [highlightMismatches, setHighlightMismatches] = useState(true);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#687182]">
        {path} is empty.
      </div>
    );
  }

  const [header, ...body] = rows;
  const idCol = header.findIndex((h) => /shipment|id/i.test(h));

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let next = body.map((r, idx) => ({ r, idx: idx + 1 })); // idx = CSV line number (header is 0)
    if (q) {
      next = next.filter(({ r }) => r.some((c) => (c || "").toLowerCase().includes(q)));
    }
    if (sortCol != null) {
      next = [...next].sort((a, b) => {
        const av = a.r[sortCol] ?? "";
        const bv = b.r[sortCol] ?? "";
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return next;
  }, [body, filter, sortCol, sortAsc]);

  const unmatchedEstimate = useMemo(() => {
    if (idCol < 0) return 0;
    return body.filter((r) => looksMismatchedId(r[idCol] || "")).length;
  }, [body, idCol]);

  const truncated = filtered.length > MAX_ROWS;
  const visibleBody = truncated ? filtered.slice(0, MAX_ROWS) : filtered;

  const compareRows = compareContent ? parseCsv(compareContent) : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080A0F]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <p className="text-[12px] text-[#9AA3B2]">
          <span className="text-[#F4F5F7]">{path.split("/").pop()}</span>
          {" · "}
          {body.length} rows
          {unmatchedEstimate > 0 ? ` · ${unmatchedEstimate} possible ID issues` : ""}
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter rows…"
          className="ml-auto h-8 w-[160px] rounded-[7px] border border-white/10 bg-[#0B0F16] px-2 text-[12px] text-white/80 placeholder:text-[#687182]"
        />
        <button
          type="button"
          onClick={() => setHighlightMismatches((v) => !v)}
          className="h-8 rounded-[7px] border border-white/12 px-2.5 text-[11.5px] text-[#9AA3B2] hover:bg-white/[0.04]"
        >
          {highlightMismatches ? "Highlights on" : "Highlights off"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        <table className="w-full border-collapse text-[12px]" style={{ fontFamily: MONO }}>
          <thead>
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="sticky top-0 border-b border-white/15 bg-[#10141D] px-2 py-2 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortCol === i) setSortAsc((a) => !a);
                      else {
                        setSortCol(i);
                        setSortAsc(true);
                      }
                    }}
                    className="font-medium text-[#F4F5F7]/80 hover:text-white"
                  >
                    {cell || `col_${i + 1}`}
                    {sortCol === i ? (sortAsc ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleBody.map(({ r: row, idx }, i) => {
              const mismatch =
                highlightMismatches && idCol >= 0 && looksMismatchedId(row[idCol] || "");
              return (
                <tr
                  key={idx}
                  className={mismatch ? "bg-[#F26B82]/[0.12]" : i % 2 === 0 ? "bg-white/[0.015]" : ""}
                >
                  {header.map((_, j) => (
                    <td
                      key={j}
                      className={`border-b border-white/[0.06] px-2 py-1.5 ${
                        mismatch && j === idCol ? "text-[#fda4b0]" : "text-[#9AA3B2]"
                      }`}
                    >
                      {onCellEdit ? (
                        <input
                          defaultValue={row[j] ?? ""}
                          onBlur={(e) => {
                            if (e.target.value !== (row[j] ?? "")) {
                              onCellEdit(idx, j, e.target.value);
                            }
                          }}
                          className="w-full min-w-[4rem] bg-transparent outline-none focus:bg-white/[0.06]"
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
        <p className="mt-2 text-[11px] text-[#687182]">
          Showing {visibleBody.length}
          {truncated ? ` of ${filtered.length}` : ""} rows
          {comparePath && compareRows
            ? ` · Compare open: ${comparePath} (${Math.max(0, compareRows.length - 1)} rows)`
            : ""}
        </p>
      </div>
    </div>
  );
}
