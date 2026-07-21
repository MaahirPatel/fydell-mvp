/**
 * Three-way merge for text artifacts and non-overlapping dataset cells.
 */

export type MergeResult =
  | { ok: true; merged: string; strategy: "auto" | "local" | "remote" | "identical" }
  | { ok: false; base: string; local: string; remote: string; reason: string };

/** Line-based three-way merge. Unsafe overlap → conflict for UI. */
export function mergeText(base: string, local: string, remote: string): MergeResult {
  if (local === remote) return { ok: true, merged: local, strategy: "identical" };
  if (local === base) return { ok: true, merged: remote, strategy: "remote" };
  if (remote === base) return { ok: true, merged: local, strategy: "local" };

  const b = base.replace(/\r\n/g, "\n").split("\n");
  const l = local.replace(/\r\n/g, "\n").split("\n");
  const r = remote.replace(/\r\n/g, "\n").split("\n");

  // Simple LCS-free heuristic: if changed regions don't overlap by line index, splice.
  const max = Math.max(b.length, l.length, r.length);
  const out: string[] = [];
  let conflict = false;
  for (let i = 0; i < max; i++) {
    const bv = b[i];
    const lv = l[i];
    const rv = r[i];
    if (lv === rv) {
      out.push(lv ?? "");
    } else if (lv === bv) {
      out.push(rv ?? "");
    } else if (rv === bv) {
      out.push(lv ?? "");
    } else {
      conflict = true;
      out.push(`<<<<<<< LOCAL\n${lv ?? ""}\n=======\n${rv ?? ""}\n>>>>>>> REMOTE`);
    }
  }
  if (conflict) {
    return { ok: false, base, local, remote, reason: "Overlapping line edits require explicit resolution." };
  }
  return { ok: true, merged: out.join("\n"), strategy: "auto" };
}

export type CellDelta = { row: number; col: number; value: string };

/** Merge cell patches when coordinates do not overlap. */
export function mergeCellPatches(
  baseContent: string,
  localPatches: CellDelta[],
  remotePatches: CellDelta[]
): MergeResult {
  const localKeys = new Set(localPatches.map((p) => `${p.row}:${p.col}`));
  for (const p of remotePatches) {
    if (localKeys.has(`${p.row}:${p.col}`)) {
      return {
        ok: false,
        base: baseContent,
        local: baseContent,
        remote: baseContent,
        reason: `Overlapping cell edit at row ${p.row}, col ${p.col}.`,
      };
    }
  }
  let content = baseContent;
  const apply = (patches: CellDelta[]) => {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    for (const p of patches) {
      if (p.row < 0 || p.row >= lines.length) continue;
      const cells = splitCsvLine(lines[p.row]);
      if (p.col < 0 || p.col >= cells.length) continue;
      cells[p.col] = /[",\n]/.test(p.value) ? `"${p.value.replace(/"/g, '""')}"` : p.value;
      lines[p.row] = cells.join(",");
    }
    content = lines.join("\n");
  };
  apply(remotePatches);
  apply(localPatches);
  return { ok: true, merged: content, strategy: "auto" };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
