/**
 * Employer chunk — EMP-01: create a useful role.
 *
 * A role captures exactly what the checklist asks for — role family, stack,
 * responsibilities, and job-relevant evaluation criteria — and nothing more.
 * Field limits keep this a focused definition, not a giant configuration
 * form. This lib is pure; the API route persists to the database.
 */

export interface RoleDefinitionInput {
  title: string;
  family: string; // e.g. "Data & Analytics", free text from a short list
  stack: string[]; // tools/tech the person will actually use
  responsibilities: string[]; // what the person will do day to day
  evaluationCriteria: string[]; // job-relevant criteria the assessment evidences
}

export interface EmployerRole extends RoleDefinitionInput {
  id: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const LIMITS = {
  title: 80,
  family: 60,
  stackItems: 12,
  stackItemLen: 40,
  responsibilities: 8,
  responsibilityLen: 280,
  criteria: 10,
  criterionLen: 200,
} as const;

export type RoleError = "invalid_input";

export type RoleResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: RoleError; message: string };

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function checkList(
  items: unknown,
  maxItems: number,
  maxLen: number,
  label: string
): { items: string[] } | { error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: `${label} needs at least one entry` };
  }
  if (items.length > maxItems) {
    return { error: `${label} is limited to ${maxItems} entries (got ${items.length})` };
  }
  const cleaned = items.map((i) => String(i).trim()).filter(nonEmpty);
  if (cleaned.length === 0) return { error: `${label} needs at least one entry` };
  const tooLong = cleaned.find((i) => i.length > maxLen);
  if (tooLong) return { error: `${label} entries are limited to ${maxLen} characters` };
  return { items: cleaned };
}

/**
 * Validate a role definition. Returns the normalized role (with generated
 * id) or the first validation failure — no partial giant forms.
 */
export function defineRole(
  orgId: string,
  createdBy: string,
  input: RoleDefinitionInput
): RoleResult<EmployerRole> {
  const title = input.title.trim();
  if (!nonEmpty(title)) return { ok: false, code: "invalid_input", message: "role title is required" };
  if (title.length > LIMITS.title) {
    return { ok: false, code: "invalid_input", message: `role title is limited to ${LIMITS.title} characters` };
  }
  const family = input.family.trim();
  if (!nonEmpty(family)) return { ok: false, code: "invalid_input", message: "role family is required" };
  if (family.length > LIMITS.family) {
    return { ok: false, code: "invalid_input", message: `role family is limited to ${LIMITS.family} characters` };
  }

  const stack = checkList(input.stack, LIMITS.stackItems, LIMITS.stackItemLen, "stack");
  if ("error" in stack) return { ok: false, code: "invalid_input", message: stack.error };
  const responsibilities = checkList(
    input.responsibilities,
    LIMITS.responsibilities,
    LIMITS.responsibilityLen,
    "responsibilities"
  );
  if ("error" in responsibilities)
    return { ok: false, code: "invalid_input", message: responsibilities.error };
  const criteria = checkList(
    input.evaluationCriteria,
    LIMITS.criteria,
    LIMITS.criterionLen,
    "evaluation criteria"
  );
  if ("error" in criteria)
    return { ok: false, code: "invalid_input", message: criteria.error };

  const now = new Date().toISOString();
  return {
    ok: true,
    value: {
      id: `role-${Math.random().toString(36).slice(2, 10)}`,
      orgId,
      createdBy,
      title,
      family,
      stack: stack.items,
      responsibilities: responsibilities.items,
      evaluationCriteria: criteria.items,
      createdAt: now,
      updatedAt: now,
    },
  };
}
