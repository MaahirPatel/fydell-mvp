"use client";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const MAX_ROWS = 500;

/** Minimal RFC-4180-ish CSV split — handles quoted fields with embedded commas/quotes. */
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
      // skip — paired \n handles the row break
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

/** Reads a .csv file as a plain HTML table — a readable view, not a spreadsheet. */
export default function DataTableView({ content, path }: { content: string; path: string }) {
  const rows = parseCsv(content);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-white/35">
        {path} is empty.
      </div>
    );
  }

  const [header, ...body] = rows;
  const truncated = body.length > MAX_ROWS;
  const visibleBody = truncated ? body.slice(0, MAX_ROWS) : body;

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#08090C] p-3">
      <table className="w-full border-collapse text-[12px]" style={{ fontFamily: MONO }}>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="sticky top-0 border-b border-white/15 bg-[#0A0C11] px-3 py-2 text-left font-medium text-white/75"
              >
                {cell || `col_${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleBody.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/[0.015]" : ""}>
              {header.map((_, j) => (
                <td key={j} className="border-b border-white/[0.06] px-3 py-1.5 text-white/65">
                  {row[j] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-white/35">
        {body.length} row{body.length === 1 ? "" : "s"}
        {truncated ? ` (showing first ${MAX_ROWS})` : ""} · read-only table view
      </p>
    </div>
  );
}
