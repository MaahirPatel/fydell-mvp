import "server-only";
import { NextResponse } from "next/server";

/**
 * Typed JSON bodies for route handlers. Each declared field is checked for
 * type and size; a wrong shape is a 400 instead of a value of the wrong type
 * reaching the handler. Absent and null fields are left undefined, and
 * undeclared fields are ignored, so valid requests behave as before.
 */

export type FieldSpec =
  | { type: "string"; max: number }
  | { type: "boolean" }
  | { type: "number"; min?: number; max?: number; integer?: boolean }
  | { type: "enum"; values: readonly string[] }
  | { type: "stringArray"; maxItems: number; maxLength: number }
  | { type: "object"; maxBytes: number };

type FieldValue<S extends FieldSpec> = S extends { type: "string" }
  ? string
  : S extends { type: "boolean" }
    ? boolean
    : S extends { type: "number" }
      ? number
      : S extends { type: "enum"; values: readonly (infer V)[] }
        ? V
        : S extends { type: "stringArray" }
          ? string[]
          : S extends { type: "object" }
            ? Record<string, unknown>
            : never;

export type BodyOf<T extends Record<string, FieldSpec>> = { [K in keyof T]?: FieldValue<T[K]> };

export type ParsedBody<T extends Record<string, FieldSpec>> =
  | { ok: true; body: BodyOf<T> }
  | { ok: false; response: NextResponse };

function bad(message: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: message }, { status: 400 }) };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkField(key: string, value: unknown, spec: FieldSpec): string | null {
  switch (spec.type) {
    case "string":
      if (typeof value !== "string") return `${key} must be text.`;
      if (value.length > spec.max) return `${key} must be at most ${spec.max} characters.`;
      return null;
    case "boolean":
      return typeof value === "boolean" ? null : `${key} must be true or false.`;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return `${key} must be a number.`;
      if (spec.integer && !Number.isInteger(value)) return `${key} must be a whole number.`;
      if (spec.min !== undefined && value < spec.min) return `${key} must be at least ${spec.min}.`;
      if (spec.max !== undefined && value > spec.max) return `${key} must be at most ${spec.max}.`;
      return null;
    case "enum":
      return typeof value === "string" && spec.values.includes(value) ? null : `${key} must be one of: ${spec.values.join(", ")}.`;
    case "stringArray":
      if (!Array.isArray(value) || value.length > spec.maxItems) return `${key} must be a list of at most ${spec.maxItems} items.`;
      return value.every((v) => typeof v === "string" && v.length <= spec.maxLength)
        ? null
        : `${key} items must be text of at most ${spec.maxLength} characters.`;
    case "object":
      if (!isPlainObject(value)) return `${key} must be an object.`;
      return JSON.stringify(value).length > spec.maxBytes ? `${key} is too large.` : null;
  }
}

/** Validates an already-parsed JSON value against the field specs. */
export function parseBodyValue<T extends Record<string, FieldSpec>>(raw: unknown, spec: T): ParsedBody<T> {
  if (!isPlainObject(raw)) return bad("Send a JSON object.");
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(spec)) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    const problem = checkField(key, value, spec[key]);
    if (problem) return bad(problem);
    out[key] = value;
  }
  return { ok: true, body: out as BodyOf<T> };
}

/**
 * Reads a JSON object body with every field typed `unknown`; anything that is
 * not a JSON object becomes `{}`, so handlers narrow each field themselves.
 */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const raw: unknown = await req.json().catch(() => null);
  return isPlainObject(raw) ? raw : {};
}

/**
 * Reads and validates a JSON object body. With `optional`, a missing or
 * unparseable body is treated as `{}` (for actions whose fields all default).
 */
export async function parseJsonBody<T extends Record<string, FieldSpec>>(
  req: Request,
  spec: T,
  opts: { optional?: boolean } = {}
): Promise<ParsedBody<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    if (opts.optional) return { ok: true, body: {} as BodyOf<T> };
    return bad("Invalid JSON body.");
  }
  if (opts.optional && (raw === null || raw === undefined)) return { ok: true, body: {} as BodyOf<T> };
  return parseBodyValue(raw, spec);
}
