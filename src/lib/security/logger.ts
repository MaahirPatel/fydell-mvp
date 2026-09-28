import "server-only";

/**
 * Structured logging with correlation IDs and secret redaction (OPS-01).
 *
 * - Every log line is JSON: { ts, level, scope, correlationId, msg, ...fields }.
 * - Correlation IDs are created per request/job and propagated with child().
 * - Secret-shaped values are redacted before serialization (SEC-05).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const SECRET_KEY_NAMES = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "private_key",
  "service_role",
  "webhook_secret",
  "stripe_secret",
  "authorization",
  "cookie",
  "set-cookie",
] as const;

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /sk_(live|test)_[A-Za-z0-9]+/g,
  /rk_(live|test)_[A-Za-z0-9]+/g,
  /whsec_[A-Za-z0-9]+/g,
  /sbp_[A-Za-z0-9]+/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT-shaped
  /xox[baprs]-[A-Za-z0-9-]+/g,
];

export const REDACTED = "[REDACTED]";

/** Redact secrets from an arbitrary value before it reaches a log sink. */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value == null) return value;
  if (typeof value === "string") {
    let out = value;
    for (const pattern of SECRET_VALUE_PATTERNS) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, REDACTED);
    }
    // query-string / header shaped credentials: password=..., token: ...
    out = out.replace(
      /((?:password|passwd|secret|token|api[_-]?key|authorization)[=:]\s*)([^\s&;,}"']+)/gi,
      `$1${REDACTED}`
    );
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(record)) {
      const lowered = key.toLowerCase();
      if (SECRET_KEY_NAMES.some((name) => lowered.includes(name))) {
        out[key] = REDACTED;
      } else {
        out[key] = redactSecrets(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** 128-bit correlation ID, URL-safe. */
export function newCorrelationId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export interface LogFields {
  correlationId?: string;
  [key: string]: unknown;
}

export interface LogSink {
  write(line: string): void;
}

const consoleSink: LogSink = {
  write(line: string) {
    // eslint-disable-next-line no-console
    console.log(line);
  },
};

export class PlatformLogger {
  private scope: string;
  private correlationId: string;
  private sink: LogSink;

  constructor(scope: string, opts: { correlationId?: string; sink?: LogSink } = {}) {
    this.scope = scope;
    this.correlationId = opts.correlationId ?? newCorrelationId();
    this.sink = opts.sink ?? consoleSink;
  }

  get id(): string {
    return this.correlationId;
  }

  child(scope: string): PlatformLogger {
    return new PlatformLogger(`${this.scope}/${scope}`, {
      correlationId: this.correlationId,
      sink: this.sink,
    });
  }

  private emit(level: LogLevel, msg: string, fields: LogFields = {}): void {
    const { correlationId: _ignored, ...rest } = fields;
    const record = {
      ts: new Date().toISOString(),
      level,
      scope: this.scope,
      correlationId: this.correlationId,
      msg,
      ...(redactSecrets(rest) as Record<string, unknown>),
    };
    this.sink.write(JSON.stringify(record));
  }

  debug(msg: string, fields?: LogFields): void {
    this.emit("debug", msg, fields);
  }
  info(msg: string, fields?: LogFields): void {
    this.emit("info", msg, fields);
  }
  warn(msg: string, fields?: LogFields): void {
    this.emit("warn", msg, fields);
  }
  error(msg: string, fields?: LogFields): void {
    this.emit("error", msg, fields);
  }
}

export function createLogger(scope: string, opts?: { correlationId?: string; sink?: LogSink }): PlatformLogger {
  return new PlatformLogger(scope, opts);
}

/**
 * Pull a correlation ID from an incoming request, or mint one.
 * Callers forward it on every downstream call (DB, Stripe, email, evaluator).
 */
export function correlationIdFromRequest(req: Request): string {
  const header = req.headers.get("x-correlation-id") || req.headers.get("x-request-id");
  if (header && /^[A-Za-z0-9_-]{8,64}$/.test(header)) return header;
  return newCorrelationId();
}
