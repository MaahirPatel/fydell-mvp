import { createHash } from "node:crypto";
import { canonicalJson } from "@/lib/profile-evidence/contract";

/** SHA-256 of canonical JSON: equal content always hashes equally, regardless of key order. */
export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
