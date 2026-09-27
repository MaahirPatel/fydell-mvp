import "server-only";

/**
 * Secret hygiene (SEC-05):
 * - SECRET_PATTERNS: high-confidence shapes of real credentials.
 * - scanTextForSecrets: finds them in arbitrary text (source, bundles, logs).
 * - redactSecrets is in ./logger.ts; this module owns detection policy.
 *
 * Detection policy is deliberately conservative for test/example strings:
 * obvious fakes ("FAKE", "EXAMPLE", "placeholder", "xxx", "<...>") are
 * allowlisted so fixture docs don't trip the scanner.
 */

export interface SecretFinding {
  pattern: string;
  line: number;
  column: number;
  /** redacted preview, never the raw value */
  preview: string;
}

interface SecretPattern {
  name: string;
  regex: RegExp;
  /** extra guard: the match must look like a real credential */
  looksReal?: (match: string, line: string, nextLine?: string) => boolean;
}

const FAKE_MARKERS = /FAKE|EXAMPLE|PLACEHOLDER|SAMPLE|DUMMY|xxx+|<[^>]*>|\.\.\.|your[_-]?/i;

/**
 * Canonical documentation fixtures that are shaped like credentials but are
 * published by vendors as examples (e.g. AWS docs). Never real secrets.
 */
export const KNOWN_DOC_FIXTURES = new Set([
  "AKIAIOSFODNN7EXAMPLE", // AWS documentation example access key
]);

function notFake(match: string, line: string): boolean {
  if (KNOWN_DOC_FIXTURES.has(match)) return false;
  return !FAKE_MARKERS.test(match) && !FAKE_MARKERS.test(line);
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "stripe_live_secret",
    regex: /sk_live_[A-Za-z0-9]{16,}/g,
  },
  {
    name: "stripe_restricted_key",
    regex: /rk_(live|test)_[A-Za-z0-9]{16,}/g,
    looksReal: notFake,
  },
  {
    name: "stripe_test_secret",
    regex: /sk_test_[A-Za-z0-9]{20,}/g,
    looksReal: notFake,
  },
  {
    name: "stripe_webhook_secret",
    regex: /whsec_[A-Za-z0-9]{16,}/g,
    looksReal: notFake,
  },
  {
    name: "supabase_service_role_jwt",
    regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    looksReal: (match, line) => notFake(match, line) && match.length > 80,
  },
  {
    name: "aws_access_key",
    regex: /AKIA[0-9A-Z]{16}/g,
    looksReal: notFake,
  },
  {
    name: "generic_private_key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    // A real key has a long base64 body; test stubs use a short placeholder.
    looksReal: (_match, _line, nextLine) => /^[A-Za-z0-9+/=]{60,}$/.test((nextLine ?? "").trim()),
  },
  {
    name: "resend_api_key",
    regex: /re_[A-Za-z0-9]{24,}/g,
    looksReal: notFake,
  },
];

export function scanTextForSecrets(text: string, sourceLabel = "<text>"): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        if (pattern.looksReal && !pattern.looksReal(match[0], line, lines[i + 1])) continue;
        findings.push({
          pattern: pattern.name,
          line: i + 1,
          column: match.index + 1,
          preview: `${sourceLabel}:${i + 1} ${match[0].slice(0, 8)}…[${match[0].length} chars]`,
        });
        if (match[0].length === 0) pattern.regex.lastIndex += 1;
      }
    }
  }
  return findings;
}

/** Directories that must never contain real secrets, even in built output. */
export const SCAN_ROOTS = ["src", "scripts", "supabase", "docs", "public"] as const;

/** File extensions worth scanning in built web output. */
export const BUNDLE_SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".map", ".html", ".json"]);
