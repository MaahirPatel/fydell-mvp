import type { EvidenceMapping, ReviewQuestion } from "@/lib/employer/review";
import type { ApplicationInvitation, WorkSampleOption } from "@/lib/hiring/work-samples";
import type { RequirementKind } from "@/lib/hiring/requirements";
import type { ApplicationQuestion } from "@/lib/profile-evidence/applications";

export type ReviewRequirement = {
  id: string;
  text: string;
  kind: RequirementKind;
  /** Position in the role's stored required criteria; review mappings are keyed by it. Null for preferred. */
  mappingIndex: number | null;
};

export type EvidenceItem = {
  id: string;
  projectId: string;
  repo: string;
  finding: string;
  path: string;
  startLine: number;
  endLine: number;
  sourceUrl: string;
  excerpt: string[];
  limitations: string[];
};

export type ReviewData = {
  roleId: string;
  roleTitle: string;
  workSamplePolicy: "not_needed" | "when_evidence_gap" | "required";
  application: { id: string; name: string; status: "submitted" | "withdrawn"; note: string; links: string[] };
  share: { shareId: string } | null;
  requirements: ReviewRequirement[];
  evidence: EvidenceItem[];
  mappings: EvidenceMapping[];
  /** Questions asked from an earlier Passport review of this share, before they moved onto the application. */
  questions: ReviewQuestion[];
  applicationQuestions: ApplicationQuestion[];
  invitations: ApplicationInvitation[];
  workSamples: WorkSampleOption[];
  canAsk: boolean;
  canInvite: boolean;
};
