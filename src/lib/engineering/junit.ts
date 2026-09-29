/**
 * Minimal JUnit XML reader for pytest's xunit1 output (pure).
 *
 * Only <testcase> elements are read. Each yields a stable test id
 * "path::name[param]" built from the `file` attribute (xunit1) and `name`.
 * Anything that does not parse is dropped; the caller treats missing
 * expected tests as an integrity problem rather than guessing.
 */

import type { TestOutcome } from "./types";

export interface ParsedTestCase {
  id: string;
  baseId: string;
  file: string;
  outcome: TestOutcome;
  message?: string;
}

const MAX_MESSAGE = 300;

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "amp") return "&";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    const code = e.startsWith("#x") ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  });
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag)) !== null) out[m[1]] = decodeEntities(m[3] ?? m[4] ?? "");
  return out;
}

function fileFromClassname(classname: string): string {
  // Fallback when `file` is absent: "tests.hidden.test_x" -> "tests/hidden/test_x.py".
  // Classes inside modules cannot be told apart from packages here, so the
  // caller's expected-test check will flag anything that maps wrongly.
  return `${classname.replace(/\./g, "/")}.py`;
}

export function parseJUnitXml(xml: string): ParsedTestCase[] {
  const cases: ParsedTestCase[] = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = attributes(m[1]);
    const name = attrs.name;
    if (!name) continue;
    const file = (attrs.file || (attrs.classname ? fileFromClassname(attrs.classname) : "")).replace(/\\/g, "/");
    if (!file) continue;
    const body = m[3] ?? "";
    let outcome: TestOutcome = "passed";
    let message: string | undefined;
    const detail = /<(failure|error|skipped)\b([^>]*?)(\/>|>)/.exec(body);
    if (detail) {
      outcome = detail[1] === "failure" ? "failed" : detail[1] === "error" ? "error" : "skipped";
      const msg = attributes(detail[2]).message;
      if (msg) message = msg.split("\n")[0].slice(0, MAX_MESSAGE);
    }
    const bracket = name.indexOf("[");
    const baseName = bracket === -1 ? name : name.slice(0, bracket);
    cases.push({ id: `${file}::${name}`, baseId: `${file}::${baseName}`, file, outcome, message });
  }
  return cases;
}
