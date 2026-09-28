/**
 * Loads an engineering scenario's trusted evaluation material from disk:
 * `.fydell/evaluation.json`, the pinned provided test files, and the hidden
 * tests. Everything here is server-side only. The candidate package builder
 * (scenario-package.ts) never reads these paths.
 */

import "server-only";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { scenariosRoot } from "@/lib/simulations/scenario-package";
import { unsafeSnapshotPathReason } from "@/lib/simulations/submission-files";
import type { EvaluationDescriptor, TrustedMaterial } from "./types";

const cache = new Map<string, TrustedMaterial>();

function assertInside(dir: string, rel: string): string {
  const reason = unsafeSnapshotPathReason(rel);
  if (reason) throw new Error(`Unsafe path in evaluation descriptor: ${rel} (${reason})`);
  const abs = resolve(dir, rel);
  if (!abs.startsWith(dir + sep)) throw new Error(`Path escapes the scenario directory: ${rel}`);
  return abs;
}

export function validateDescriptor(d: EvaluationDescriptor, scenarioId: string): string[] {
  const errors: string[] = [];
  if (d.scenarioId !== scenarioId) errors.push(`scenarioId mismatch: ${d.scenarioId}`);
  if (!d.scenarioVersion) errors.push("missing scenarioVersion");
  if (!d.suiteVersion) errors.push("missing suiteVersion");
  if (!d.runtime || !(d.runtime.timeoutSeconds > 0) || !(d.runtime.maxOutputBytes > 0)) errors.push("invalid runtime");
  if (!Array.isArray(d.editablePrefixes) || d.editablePrefixes.length === 0) errors.push("missing editablePrefixes");
  if (!Array.isArray(d.trustedFiles) || d.trustedFiles.length === 0) errors.push("missing trustedFiles");
  if (!d.hidden?.sourceDir || !d.hidden?.mountDir) errors.push("missing hidden directories");
  if (!d.canary || !d.canary.startsWith(`${d.hidden?.mountDir}/`)) errors.push("canary must live in the hidden mount");
  if (!Array.isArray(d.groups) || d.groups.length === 0) errors.push("missing groups");
  for (const g of d.groups ?? []) {
    if (!g.id || !g.label || !Array.isArray(g.tests) || g.tests.length === 0) errors.push(`invalid group ${g.id}`);
    if (g.dimension !== "correctness" && g.dimension !== "response_to_requirements") {
      errors.push(`group ${g.id} has unknown dimension ${g.dimension}`);
    }
  }
  return errors;
}

export function hasEngineeringEvaluation(scenarioId: string, baseDir: string = process.cwd()): boolean {
  return existsSync(join(scenariosRoot(baseDir), scenarioId, ".fydell", "evaluation.json"));
}

export function loadTrustedMaterial(scenarioId: string, baseDir: string = process.cwd()): TrustedMaterial {
  const key = `${baseDir}::${scenarioId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (!/^[a-z0-9-]+$/.test(scenarioId)) throw new Error(`Invalid scenario id: ${scenarioId}`);
  const dir = join(scenariosRoot(baseDir), scenarioId);
  const descriptor = JSON.parse(
    readFileSync(join(dir, ".fydell", "evaluation.json"), "utf8")
  ) as EvaluationDescriptor;
  const errors = validateDescriptor(descriptor, scenarioId);
  if (errors.length) throw new Error(`Invalid evaluation descriptor for ${scenarioId}: ${errors.join("; ")}`);

  const scenario = JSON.parse(readFileSync(join(dir, ".fydell", "scenario.json"), "utf8")) as { version: string };
  if (scenario.version !== descriptor.scenarioVersion) {
    throw new Error(`Evaluation descriptor ${descriptor.scenarioVersion} does not match scenario ${scenario.version}`);
  }

  const trusted: Record<string, string> = {};
  for (const rel of descriptor.trustedFiles) trusted[rel] = readFileSync(assertInside(dir, rel), "utf8");

  const hidden: Record<string, string> = {};
  const hiddenDir = assertInside(dir, descriptor.hidden.sourceDir);
  const mount = descriptor.hidden.mountDir.replace(/\/$/, "");
  for (const name of readdirSync(hiddenDir).sort()) {
    if (!name.endsWith(".py")) continue;
    hidden[`${mount}/${name}`] = readFileSync(join(hiddenDir, name), "utf8");
  }
  if (!Object.keys(hidden).some((p) => descriptor.canary.startsWith(`${p}::`))) {
    throw new Error(`Canary ${descriptor.canary} is not among the hidden tests`);
  }

  const material: TrustedMaterial = { descriptor, trusted, hidden };
  cache.set(key, material);
  return material;
}
