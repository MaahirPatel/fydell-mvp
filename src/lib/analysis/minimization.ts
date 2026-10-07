/**
 * AI-13 - Confidential-input minimization.
 *
 * Principle: the model receives the smallest authorized input that still
 * supports the review. This module is the allowlist: exactly these fields may
 * leave our infrastructure for model review, each with its justification.
 * Everything else - full repository, credentials, unrelated files, candidate
 * PII beyond their handle - is excluded by construction.
 *
 * Provider posture (documented, not assumed): no standing claim is made here
 * about any provider's training/retention behavior. The deployment checklist
 * must verify the provider's data-retention and training settings against the
 * privacy promise before model review is enabled. Until verified, model
 * review stays disabled and reports are deterministic-only.
 */

import type { InputBundle, InputRole } from "./inputBundle";

/** Roles that may be sent for model review, with justification. */
const ALLOWED_ROLES: { role: InputRole; justification: string }[] = [
  { role: "submission", justification: "the artifact under review" },
  { role: "starter", justification: "baseline needed to compute what the candidate changed" },
  {
    role: "surrounding",
    justification: "only files the submission directly imports/calls, bounded by the bundle cap",
  },
  { role: "test", justification: "authoritative test sources the review must not contradict" },
  { role: "event", justification: "scenario events the candidate reacted to" },
  { role: "transcript", justification: "messages needed for the narrow communication assessment" },
];

/** Never sent, whatever the role claims to be. */
const NEVER_SEND_RE = /(credential|secret|token|private[_-]?key|passwd|\.pem$|\.key$)/i;

export interface MinimizedInput {
  path: string;
  role: InputRole;
  sha256: string;
  content: string;
  truncated: boolean;
  justification: string;
}

export interface MinimizationResult {
  included: MinimizedInput[];
  excluded: { path: string; reason: string }[];
  policyDoc: string;
}

/**
 * Select the authorized subset of a bundle for model review.
 * Returns the included files plus an explicit exclusion list.
 */
export function selectAuthorizedContent(bundle: InputBundle): MinimizationResult {
  const allowed = new Map<InputRole, string>(ALLOWED_ROLES.map((a) => [a.role, a.justification]));
  const included: MinimizedInput[] = [];
  const excluded: { path: string; reason: string }[] = [];

  for (const f of bundle.files) {
    if (NEVER_SEND_RE.test(f.path)) {
      excluded.push({ path: f.path, reason: "never-send pattern (credential/secret/token/key)" });
      continue;
    }
    const justification = allowed.get(f.role);
    if (!justification) {
      excluded.push({ path: f.path, reason: `role "${f.role}" is not in the model-review allowlist` });
      continue;
    }
    included.push({
      path: f.path,
      role: f.role,
      sha256: f.sha256,
      content: f.content,
      truncated: f.truncated,
      justification,
    });
  }
  for (const o of bundle.omitted) {
    excluded.push({ path: o.path, reason: `omitted at bundle build: ${o.reason}` });
  }

  return { included, excluded, policyDoc: getMinimizationPolicyDoc() };
}

export function getMinimizationPolicyDoc(): string {
  const lines = [
    "# Model-review input minimization policy (AI-13)",
    "",
    "The model receives ONLY:",
    ...ALLOWED_ROLES.map((a) => `- \`${a.role}\`: ${a.justification}.`),
    "",
    "NEVER sent, regardless of role:",
    "- Credentials, secrets, tokens, private keys (path allowlist `NEVER_SEND_RE`).",
    "- Files outside the submission's dependency closure (full repo is never sent).",
    "- Candidate PII beyond their candidate handle (no email, no real name in prompts).",
    "- Raw unredacted logs (harness redacts before the review step; see eval/sandboxConfig).",
    "",
    "Provider posture: no claim is made here about any provider's retention or",
    "training behavior. Before model review is enabled in deployment, verify the",
    "provider's data-retention and no-training settings against the privacy promise",
    "and record the verification (settings screenshot + date) in the release record.",
    "Until verified, reports are deterministic-only.",
  ];
  return lines.join("\n");
}
