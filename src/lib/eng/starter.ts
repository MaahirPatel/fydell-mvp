import { strToU8, zipSync } from "fflate";
import { createHash } from "crypto";
import { STARTER_FILES, STARTER_SHA256 } from "./scenarios/backend-webhook-retry/starter.generated";
import { CURRENT_SCENARIO } from "./scenarios";

// fflate encodes DOS timestamps from local-time getters, so the date is built
// from local fields to keep the archive bytes identical in every timezone.
const ZIP_MTIME = new Date(2026, 8, 27, 0, 0, 0);

/** Byte-identical to scripts/eng-scenario-lib.mjs so the recorded hash can be re-verified. */
export function buildStarterArchive(): { bytes: Uint8Array; sha256: string; fileName: string } {
  const entries: Record<string, [Uint8Array, { mtime: Date }]> = {};
  for (const name of Object.keys(STARTER_FILES).sort()) {
    entries[`${CURRENT_SCENARIO.starterRoot}/${name}`] = [strToU8(STARTER_FILES[name]), { mtime: ZIP_MTIME }];
  }
  const bytes = zipSync(entries, { level: 9, mtime: ZIP_MTIME });
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== STARTER_SHA256) {
    throw new Error("Starter archive does not match its reviewed hash. Rebuild the scenario bundle.");
  }
  return { bytes, sha256, fileName: `${CURRENT_SCENARIO.starterRoot}-v${CURRENT_SCENARIO.version}.zip` };
}

export function starterFileList(): string[] {
  return Object.keys(STARTER_FILES).sort();
}
