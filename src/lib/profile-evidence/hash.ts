import { createHash } from "node:crypto";
import { canonicalJson, type EvidenceVersionContent } from "./contract";

export function contentHash(content: EvidenceVersionContent): string {
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}
