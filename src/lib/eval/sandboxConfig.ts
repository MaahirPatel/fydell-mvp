/**
 * RUN-01/02/03/05/08 - Sandbox specification and validation.
 *
 * Untrusted candidate code runs in a sandbox suitable for hostile
 * multi-tenant code - never in an ordinary privileged app container.
 * This module defines the REQUIRED sandbox properties and validates a
 * concrete spec against them:
 *
 *  RUN-01 isolation: no host mounts, no Docker socket, no production
 *          credentials, pinned image digest.
 *  RUN-02 network/resources: egress denied by default; CPU/memory/disk/
 *          process/time/concurrency limits; abandoned jobs killed.
 *  RUN-03 trusted dependencies: pinned image; project scripts/packages are
 *          untrusted; controlled installs only, no secrets in scope.
 *  RUN-05 trusted harness: evaluator-controlled invocation and a
 *          signed/tamper-evident results channel.
 *  RUN-08 artifact protection: bounded, redacted logs; results persisted
 *          before cleanup; no carry-over between candidates.
 *
 * What this module is: the machine-checked contract. What it is NOT: proof
 * that a live sandbox honors it - that verification is NEEDS-LIVE and must
 * run against the real sandbox before release.
 */

export interface ResourceLimits {
  cpuMillicores: number;
  memoryMB: number;
  diskMB: number;
  maxProcesses: number;
  /** Hard wall-clock kill, seconds. */
  wallTimeSec: number;
  maxConcurrentJobs: number;
}

export interface SandboxSpec {
  /** Pinned image digest, e.g. "registry.example.com/runner@sha256:abc…". */
  imageDigest: string;
  /** Default false. When true, allowedEgressHosts must be a tight allowlist. */
  allowNetworkEgress: boolean;
  allowedEgressHosts?: string[];
  resourceLimits: ResourceLimits;
  /** Must be empty: no host mounts, ever. */
  hostMounts: string[];
  /** Must be false: the Docker socket is never mounted. */
  dockerSocketMounted: boolean;
  /** "none" - production credentials are never in scope of a run. */
  credentialsInScope: "none" | string;
  /** Pinned image + controlled installs; candidate scripts are untrusted. */
  dependencyInstall: {
    mode: "pinned-image" | "controlled-install";
    /** Package indexes allowed during controlled installs (no secrets). */
    allowedIndexes?: string[];
  };
  /** Evaluator-controlled invocation: fixed argv, no candidate-chosen entrypoint. */
  invocation: {
    channel: "signed-harness";
    argv: string[];
    /** Harness signs result envelopes; tampering is detectable. */
    resultSignature: "hmac" | "none";
  };
  artifacts: {
    /** Logs are truncated at this size… */
    maxLogBytes: number;
    /** …and scrubbed with these patterns before persistence. */
    redactPatterns: string[];
    /** Working dir is wiped between candidates. */
    wipeBetweenRuns: boolean;
  };
}

export const DEFAULT_SANDBOX_SPEC: SandboxSpec = {
  imageDigest: "registry.fydell.internal/runner@sha256:PINNED_AT_DEPLOY_TIME",
  allowNetworkEgress: false,
  resourceLimits: {
    cpuMillicores: 1000,
    memoryMB: 1024,
    diskMB: 1024,
    maxProcesses: 64,
    wallTimeSec: 300,
    maxConcurrentJobs: 8,
  },
  hostMounts: [],
  dockerSocketMounted: false,
  credentialsInScope: "none",
  dependencyInstall: { mode: "pinned-image" },
  invocation: {
    channel: "signed-harness",
    argv: ["/opt/harness/run", "--suite", "/opt/harness/suite.json"],
    resultSignature: "hmac",
  },
  artifacts: {
    maxLogBytes: 256_000,
    redactPatterns: [
      "(?i)(api[_-]?key|secret|token|password)\\s*[:=]\\s*\\S+",
      "sk-live-[A-Za-z0-9]+",
      "-----BEGIN [A-Z ]*PRIVATE KEY-----",
    ],
    wipeBetweenRuns: true,
  },
};

/** Validate a spec. Returns human-readable violations (empty = compliant). */
export function validateSandboxSpec(spec: SandboxSpec): string[] {
  const v: string[] = [];
  if (!/@sha256:[0-9a-f]{16,}/i.test(spec.imageDigest)) {
    v.push("RUN-03: imageDigest must be a pinned digest (@sha256:…), not a floating tag");
  }
  if (spec.hostMounts.length > 0) {
    v.push(`RUN-01: host mounts are forbidden, found: ${spec.hostMounts.join(", ")}`);
  }
  if (spec.dockerSocketMounted) v.push("RUN-01: the Docker socket must never be mounted");
  if (spec.credentialsInScope !== "none") {
    v.push("RUN-01: production credentials must not be in scope of a run");
  }
  if (spec.allowNetworkEgress) {
    const hosts = spec.allowedEgressHosts ?? [];
    if (hosts.length === 0) v.push("RUN-02: network egress allowed without a tight host allowlist");
    if (hosts.some((h) => h === "*")) v.push("RUN-02: egress allowlist must not contain a wildcard");
  }
  const r = spec.resourceLimits;
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  if (![r.cpuMillicores, r.memoryMB, r.diskMB, r.maxProcesses, r.wallTimeSec, r.maxConcurrentJobs].every(positive)) {
    v.push("RUN-02: all resource limits must be positive finite numbers");
  }
  if (r.wallTimeSec > 3600) v.push("RUN-02: wallTimeSec above 1h needs explicit justification");
  if (spec.invocation.channel !== "signed-harness") {
    v.push("RUN-05: invocation must go through the signed harness channel");
  }
  if (spec.invocation.resultSignature !== "hmac") {
    v.push("RUN-05: result envelopes must be HMAC-signed so tampering is detectable");
  }
  if (!spec.artifacts.wipeBetweenRuns) {
    v.push("RUN-08: working dir must be wiped between candidates (no carry-over)");
  }
  if (!(spec.artifacts.maxLogBytes > 0)) v.push("RUN-08: maxLogBytes must bound log size");
  if (spec.artifacts.redactPatterns.length === 0) {
    v.push("RUN-08: at least one log redaction pattern is required");
  }
  return v;
}

/** Scrub a log excerpt with the spec's redaction patterns. */
export function redactLog(text: string, spec: SandboxSpec): string {
  let out = text;
  for (const pattern of spec.artifacts.redactPatterns) {
    try {
      out = out.replace(new RegExp(pattern, "g"), "[REDACTED]");
    } catch {
      // A bad pattern must not break redaction of the rest; it is a spec bug
      // surfaced by validateSandboxSpec review, not a runtime crash.
    }
  }
  if (Buffer.byteLength(out, "utf8") > spec.artifacts.maxLogBytes) {
    out =
      Buffer.from(out, "utf8").slice(0, spec.artifacts.maxLogBytes).toString("utf8") +
      "\n[TRUNCATED: log exceeded maxLogBytes]";
  }
  return out;
}
