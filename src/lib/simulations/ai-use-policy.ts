/**
 * AI-use policy (WORK-06, SCEN-07).
 *
 * What the product provides and permits, stated plainly:
 *  - Built-in: an in-product AI assistant scoped to the attempt's resources.
 *    Its prompts, responses, and insertions are recorded (observed).
 *  - External: permitted only when the invitation/template declares it.
 *    The candidate self-reports use at submission (external_ai_disclosed).
 *
 * The hard rule, enforced in code: unobserved external AI use can NEVER be
 * scored as directly observed behavior. AI-assisted artifacts are labeled by
 * provenance, and provenance gates what evidence they may support.
 */

export type AiProvenance =
  | "candidate_direct" // typed by the candidate, no AI involved
  | "assistant_observed" // in-product assistant; prompt+response recorded
  | "assistant_inserted" // assistant output inserted into notes/deliverable
  | "external_disclosed" // candidate self-reported external AI use
  | "external_unknown"; // external AI allowed but use not observed

export const AI_USE_POLICY_TEXT: string =
  "Built-in tools: this assessment includes an in-product AI assistant that can " +
  "see the same resources you can. Everything you ask it, everything it answers, and " +
  "anything you insert from it into your notes or deliverable is recorded as part of " +
  "your attempt. External assistance: unless your invitation says otherwise, you may " +
  "use external AI tools, but you must disclose it at submission. Disclosed or not, " +
  "work we did not observe cannot be scored as observed behavior: unobserved external " +
  "AI use is never treated as direct evidence of your skills.";

export interface AiEvidenceClassification {
  provenance: AiProvenance;
  /** May this artifact support "directly observed behavior" claims? */
  directlyObserved: boolean;
  /** Employer/report-safe label. */
  label: string;
}

/**
 * Classify an artifact's AI provenance. Only candidate_direct and
 * assistant_observed count as directly observed behavior; everything else is
 * labeled honestly and excluded from observed-behavior claims.
 */
export function classifyAiEvidence(args: {
  insertedFromAssistant?: boolean;
  assistantObserved?: boolean;
  externalDisclosed?: boolean;
  externalAllowed?: boolean;
}): AiEvidenceClassification {
  if (args.insertedFromAssistant) {
    return {
      provenance: "assistant_inserted",
      directlyObserved: false,
      label: "Drafted with the in-product AI assistant (recorded); not direct evidence of unaided work.",
    };
  }
  if (args.assistantObserved) {
    return {
      provenance: "assistant_observed",
      directlyObserved: true,
      label: "Produced with the in-product AI assistant; prompts and responses are on record.",
    };
  }
  if (args.externalDisclosed) {
    return {
      provenance: "external_disclosed",
      directlyObserved: false,
      label: "Candidate disclosed external AI assistance; not scored as directly observed behavior.",
    };
  }
  if (args.externalAllowed) {
    return {
      provenance: "external_unknown",
      directlyObserved: false,
      label: "External AI was permitted; use was not observed and is not scored as observed behavior.",
    };
  }
  return {
    provenance: "candidate_direct",
    directlyObserved: true,
    label: "Candidate's own work.",
  };
}

/**
 * SCEN-07: the invitation/template declares what is permitted. Unknown or
 * missing declarations default to the conservative interpretation.
 */
export interface AiPermissionDeclaration {
  builtInAssistant: boolean;
  externalAiAllowed: boolean;
  externalToolsNote?: string;
}

export function describeAiPermissions(decl: Partial<AiPermissionDeclaration>): string {
  const lines: string[] = [];
  lines.push(
    `In-product AI assistant: ${(decl.builtInAssistant ?? true) ? "available (all interactions recorded)" : "disabled for this assessment"}`
  );
  lines.push(
    `External AI tools: ${decl.externalAiAllowed ? "permitted — you must disclose use at submission" : "not permitted for this assessment"}`
  );
  if (decl.externalToolsNote) lines.push(decl.externalToolsNote);
  return lines.join("\n");
}
