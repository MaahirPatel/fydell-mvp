/**
 * Secret redaction for displayed and model-bound content (GH-07).
 *
 * Findings carry short code excerpts that are shown to the candidate,
 * embedded in share links, and sent to a summarisation model. A repository
 * can contain real credentials (checked-in keys, tokens, passwords), so
 * every excerpt passes through redactSecrets before it is stored or
 * displayed. This is a best-effort safety net, not a guarantee: the
 * underlying files are still public on GitHub.
 */

const PEM_BLOCK = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g;

// Explicit high-confidence token shapes.
const TOKEN_SHAPES: Array<[RegExp, string]> = [
  [/\b(AKIA[0-9A-Z]{16})\b/g, "[REDACTED AWS KEY]"],
  [/\b(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED GITHUB TOKEN]"],
  [/\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g, "[REDACTED SLACK TOKEN]"],
  [/\b(sk-ant-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,})\b/g, "[REDACTED API KEY]"],
  [/\b(AIza[0-9A-Za-z_-]{30,})\b/g, "[REDACTED API KEY]"],
];

// `password = "..."`, `api_key: '...'`, `SECRET=...` - the name stays so the
// code still reads naturally, the value is replaced.
const SECRET_ASSIGNMENT =
  /\b(password|passwd|pwd|secret|api[_-]?key|apikey|auth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|db[_-]?password|private[_-]?token)\b(\s*[:=]\s*)(["']?)([^"'`\s;,)}\]]{4,}|["'][^"'`]{1,200}["'])/gi;

function redactAssignment(match: string, name: string, sep: string, quote: string, value: string): string {
  void match;
  void quote;
  // Leave obvious non-secrets alone: function calls, template holes, env lookups.
  const v = value.trim();
  if (/[(){}]/.test(v) || /^(os\.|process\.|getenv|get_|os\.environ)/i.test(v)) return `${name}${sep}${value}`;
  if (/^(true|false|null|none|undefined|\d+)$/i.test(v)) return `${name}${sep}${value}`;
  return `${name}${sep}[REDACTED]`;
}

export function redactSecrets(text: string): string {
  let out = text.replace(PEM_BLOCK, "[REDACTED PRIVATE KEY]");
  for (const [pattern, replacement] of TOKEN_SHAPES) out = out.replace(pattern, replacement);
  out = out.replace(SECRET_ASSIGNMENT, redactAssignment as (substring: string, ...args: unknown[]) => string);
  return out;
}

/** Redacts each line of an excerpt independently. */
export function redactExcerpt(lines: string[]): string[] {
  return lines.map(redactSecrets);
}
