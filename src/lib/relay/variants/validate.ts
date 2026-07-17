/**
 * Bounded, deterministic validation for a materialized Relay variant
 * FileMap. Never runs candidate/generated code — pure static checks so this
 * can run cheaply in the ops UI, in tests, and before `resolveScenarioForSession`
 * ever serves a variant to a real session.
 */
import type { FileMap } from "@/lib/relay/execution-provider";
import scenarioManifest from "../../../../scenarios/project-relay/.fydell/scenario.json";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const REQUIRED_FILES: string[] = (scenarioManifest as { files: string[] }).files;
const MIN_GOLDEN_SET_CASES = 5;

const DEFECT_MARKER_RE = /INTENTIONAL_DEFECT/;

// Deliberately simple/conservative — anything shaped like an email address
// is treated as possible PII and rejected. False positives (e.g. an actual
// example.com address) are acceptable; a false negative is not.
const EMAIL_LOOKING_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

export function validateVariant(files: FileMap): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const required of REQUIRED_FILES) {
    if (!(required in files) || !files[required].trim()) {
      errors.push(`Missing required file: ${required}`);
    }
  }

  if (!("evals/run_evals.py" in files)) {
    errors.push("evals/run_evals.py is missing — evals script is required.");
  }

  const goldenSet = files["data/golden_set.jsonl"];
  if (!goldenSet || !goldenSet.trim()) {
    errors.push("data/golden_set.jsonl is missing or empty.");
  } else {
    const cases = goldenSet.split("\n").filter((line) => line.trim().length > 0);
    if (cases.length === 0) {
      errors.push("data/golden_set.jsonl has no cases.");
    } else if (cases.length < MIN_GOLDEN_SET_CASES) {
      warnings.push(
        `data/golden_set.jsonl only has ${cases.length} case(s); ${MIN_GOLDEN_SET_CASES}+ recommended.`
      );
    }
  }

  const hasDefectMarker = Object.values(files).some((content) => DEFECT_MARKER_RE.test(content));
  if (!hasDefectMarker) {
    errors.push(
      "No intentional defect marker comment found (expected an `INTENTIONAL_DEFECT` comment in at least one file)."
    );
  }

  for (const [path, content] of Object.entries(files)) {
    const match = content.match(EMAIL_LOOKING_RE);
    if (match) {
      errors.push(`Possible PII (email-looking string "${match[0]}") found in ${path}.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
