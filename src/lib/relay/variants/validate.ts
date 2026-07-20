/**
 * Bounded, deterministic validation for a materialized Northbeam Relay variant.
 * Never runs candidate code — static checks only.
 */
import type { FileMap } from "@/lib/relay/execution-provider";
import scenarioManifest from "../../../../scenarios/project-relay/.fydell/scenario.json";

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const REQUIRED_FILES: string[] = (scenarioManifest as { files: string[] }).files;

const DEFECT_MARKER_RE = /INTENTIONAL_DEFECT/;

const EMAIL_LOOKING_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

const REQUIRED_DATA = [
  "data/shipments.csv",
  "data/carriers.csv",
  "data/delays_manual_tracking.csv",
] as const;

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

  if (!("tests/test_reconcile.py" in files)) {
    errors.push("tests/test_reconcile.py is missing — reconcile tests are required.");
  }

  for (const dataFile of REQUIRED_DATA) {
    if (!(dataFile in files) || !files[dataFile].trim()) {
      errors.push(`Missing required data file: ${dataFile}`);
    } else {
      const lines = files[dataFile].split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 3) {
        warnings.push(`${dataFile} looks thin (${lines.length} non-empty lines).`);
      }
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
