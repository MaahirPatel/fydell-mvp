/**
 * Trusted distribution manifest (DESK-03).
 *
 * Release artifacts must be signed as appropriate for each shipped OS;
 * signatures and required platform distribution steps are verified, and
 * users are NEVER told to disable OS protections. Additional OS support
 * waits for its own tested distribution path.
 *
 * Per DESK-01 only Linux distribution is claimed (.deb / .rpm / .AppImage).
 * This module validates the release manifest: every shipped artifact needs
 * a version, publisher identity, download source and a signature. Real
 * signing and platform-PKI verification happen in release infra
 * (NEEDS-LIVE); the manifest contract here is pure and unit-tested.
 */

export type ShippedOS = "linux";
export type LinuxFormat = ".deb" | ".rpm" | ".AppImage";

export interface ArtifactSignature {
  kind: "gpg";
  /** Fingerprint of the signing key, for independent verification. */
  fingerprint: string;
}

export interface ReleaseArtifact {
  os: ShippedOS;
  format: LinuxFormat;
  version: string;
  /** Publisher identity shown to the user. */
  publisher: string;
  /** Where the artifact was downloaded from. */
  downloadSource: string;
  /** Null = unsigned, which fails verification for a shipped OS. */
  signature: ArtifactSignature | null;
}

/**
 * Verify a release manifest. Returns human-readable errors; empty means
 * every shipped artifact is signed and identified. macOS/Windows artifacts
 * are rejected outright: they have no tested distribution path.
 */
export function verifyDistributionManifest(artifacts: readonly ReleaseArtifact[]): string[] {
  const errors: string[] = [];
  if (artifacts.length === 0) errors.push("Release manifest is empty");
  const seen = new Set<string>();
  for (const a of artifacts) {
    if ((a.os as string) !== "linux") {
      errors.push(`Unsupported OS in manifest: ${a.os} — no tested distribution path`);
      continue;
    }
    const key = `${a.os}:${a.format}`;
    if (seen.has(key)) errors.push(`Duplicate artifact in manifest: ${key}`);
    seen.add(key);
    if (!a.version) errors.push(`${key}: missing version`);
    if (!a.publisher) errors.push(`${key}: missing publisher identity`);
    if (!a.downloadSource) errors.push(`${key}: missing download source`);
    if (!a.signature) {
      errors.push(`${key}: missing signature — shipped artifacts must be signed`);
    } else if (!a.signature.fingerprint) {
      errors.push(`${key}: signature missing key fingerprint`);
    }
  }
  return errors;
}

/**
 * Content guard: install/upgrade guidance must never tell ordinary users
 * to disable OS protections (secure boot, gatekeeper-style checks,
 * signature enforcement, sandboxing).
 */
const UNSAFE_ADVICE_PATTERNS: readonly RegExp[] = [
  /disable\s+(secure\s*boot|sip|gatekeeper)/i,
  /turn\s+off\s+(gatekeeper|windows\s+defender\s+smartscreen)/i,
  /--no-sandbox/i,
  /bypass\s+(signature|notarization)\s+(check|verification)/i,
  /allow\s+apps\s+from\s+anywhere/i,
  /disable\s+signature\s+(enforcement|verification)/i,
];

/** True when the text advises weakening OS protections. */
export function containsUnsafeAdvice(text: string): boolean {
  return UNSAFE_ADVICE_PATTERNS.some((p) => p.test(text));
}
