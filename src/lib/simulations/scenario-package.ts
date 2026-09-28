import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";

/**
 * Scenario file package (W3) — the versioned, candidate-safe file set a
 * desktop session materializes from.
 *
 * Built from the on-disk scenario package (`scenarios/<id>/.fydell/scenario.json`).
 * Exclusion is by construction: ONLY paths listed in the scenario's `files`
 * allowlist are ever read. `canonical.json`, hidden eval material, secrets,
 * and anything else in the scenario directory can never enter the package,
 * because the builder never looks at them.
 *
 * Mapping rule (documented, not magic): template slug == scenario directory
 * name == scenario id. `scenarioIdForTemplateSlug` returns null when no
 * on-disk package exists, in which case the session serves no filePackage
 * and the desktop falls back to `state.workspace.files`.
 *
 * Deployment note: the builder reads from `<repo>/scenarios` via
 * `process.cwd()`. Serverless deployments must bundle the scenarios directory
 * (e.g. `outputFileTracingIncludes`) or filePackage will be null.
 */

export interface ScenarioPackage {
  scenarioId: string;
  scenarioVersion: string;
  label: string;
  builtAt: string;
  /** Canonical argv for the local test runner, e.g. ["pytest", "tests/test_reconcile.py"]. */
  testCommand: string[];
  /** Candidate-safe file contents, keyed by repo-relative path. */
  files: Record<string, string>;
  /** SHA-256 hex of each file's UTF-8 bytes, keyed by path. */
  manifest: Record<string, string>;
}

interface ScenarioJson {
  id: string;
  version: string;
  label?: string;
  files: string[];
  testCommand?: string[];
}

export function scenariosRoot(baseDir: string = process.cwd()): string {
  return join(baseDir, "scenarios");
}

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Convention: template slug == scenario directory name. Null when absent or unsafe. */
export function scenarioIdForTemplateSlug(
  slug: string | null | undefined,
  baseDir: string = process.cwd()
): string | null {
  if (!slug || typeof slug !== "string") return null;
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..")) return null;
  const marker = join(scenariosRoot(baseDir), slug, ".fydell", "scenario.json");
  return existsSync(marker) ? slug : null;
}

function assertSafeRelativePath(rel: string): void {
  if (
    typeof rel !== "string" ||
    rel.length === 0 ||
    rel.startsWith("/") ||
    rel.includes("\\") ||
    rel.split("/").includes("..")
  ) {
    throw new Error(`Unsafe path in scenario allowlist: ${JSON.stringify(rel)}`);
  }
}

export function buildScenarioPackage(
  scenarioId: string,
  baseDir: string = process.cwd()
): ScenarioPackage {
  if (
    !scenarioId ||
    typeof scenarioId !== "string" ||
    scenarioId.includes("/") ||
    scenarioId.includes("\\") ||
    scenarioId.includes("..")
  ) {
    throw new Error(`Invalid scenario id: ${JSON.stringify(scenarioId)}`);
  }
  const dir = join(scenariosRoot(baseDir), scenarioId);
  const markerPath = join(dir, ".fydell", "scenario.json");

  let raw: string;
  try {
    raw = readFileSync(markerPath, "utf8");
  } catch {
    throw new Error(`Scenario package not found: ${scenarioId}`);
  }
  let meta: ScenarioJson;
  try {
    meta = JSON.parse(raw) as ScenarioJson;
  } catch {
    throw new Error(`Scenario descriptor is not valid JSON: ${markerPath}`);
  }
  if (meta.id !== scenarioId) {
    throw new Error(`Scenario id mismatch in ${markerPath}: ${JSON.stringify(meta.id)}`);
  }
  if (!meta.version || typeof meta.version !== "string") {
    throw new Error(`Scenario ${scenarioId} has no pinned version`);
  }
  if (!Array.isArray(meta.files) || meta.files.length === 0) {
    throw new Error(`Scenario ${scenarioId} has an empty file allowlist`);
  }

  const files: Record<string, string> = {};
  const manifest: Record<string, string> = {};
  for (const rel of meta.files) {
    assertSafeRelativePath(rel);
    const abs = resolve(dir, rel);
    // Belt-and-braces: the resolved path must stay inside the scenario dir.
    if (abs !== join(dir, rel) || !abs.startsWith(dir + sep)) {
      throw new Error(`Allowlisted path escapes the scenario directory: ${rel}`);
    }
    let content: string;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      throw new Error(`Allowlisted file missing on disk: ${rel}`);
    }
    files[rel] = content;
    manifest[rel] = sha256Hex(content);
  }

  let testCommand: string[] = [];
  if (meta.testCommand !== undefined) {
    if (
      !Array.isArray(meta.testCommand) ||
      meta.testCommand.length === 0 ||
      !meta.testCommand.every((t) => typeof t === "string" && t.length > 0)
    ) {
      throw new Error(`Scenario ${scenarioId} has an invalid testCommand`);
    }
    testCommand = [...meta.testCommand];
  }

  return {
    scenarioId,
    scenarioVersion: meta.version,
    label: meta.label || scenarioId,
    builtAt: new Date().toISOString(),
    testCommand,
    files,
    manifest,
  };
}
