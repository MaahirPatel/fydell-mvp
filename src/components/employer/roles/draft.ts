import type { EvidenceKind, Level, RoleFamily, Specialization, WorkSamplePolicy } from "@/lib/eng/taxonomy";
import type { RemotePolicy } from "@/lib/hiring/role-contract";
import type { RoleRequirement } from "@/lib/hiring/requirements";
import { DEFAULT_ACCEPTED_EVIDENCE, DEFAULT_WORK_SAMPLE_POLICY, type Visibility } from "@/lib/hiring/intake-contract";
import type { RoleRecord } from "@/lib/hiring/roles";

/** What the intake form edits. Empty strings stand for "not stated". */
export type IntakeDraft = {
  title: string;
  description: string;
  family: RoleFamily;
  specialization: Specialization;
  level: Level;
  ownership: string;
  responsibilities: string[];
  requirements: RoleRequirement[];
  languages: string[];
  teamContext: string;
  location: string;
  remotePolicy: RemotePolicy | "";
  employmentType: string;
  compensation: string;
  hiringOwner: string;
  reviewerIds: string[];
  hiringSteps: string[];
  acceptedEvidence: EvidenceKind[];
  workSamplePolicy: WorkSamplePolicy;
  expectedEffort: string;
  visibility: Visibility;
  applicationDeadline: string;
  contactEmail: string;
  sourceDescription: string;
};

export function emptyIntakeDraft(hiringOwner: string): IntakeDraft {
  return {
    title: "",
    description: "",
    family: "software_engineer",
    specialization: "general",
    level: "mid",
    ownership: "",
    responsibilities: [],
    requirements: [],
    languages: [],
    teamContext: "",
    location: "",
    remotePolicy: "",
    employmentType: "Full-time",
    compensation: "",
    hiringOwner,
    reviewerIds: [],
    hiringSteps: [],
    acceptedEvidence: [...DEFAULT_ACCEPTED_EVIDENCE],
    workSamplePolicy: DEFAULT_WORK_SAMPLE_POLICY,
    expectedEffort: "",
    visibility: "link",
    applicationDeadline: "",
    contactEmail: "",
    sourceDescription: "",
  };
}

export function draftFromRole(role: RoleRecord): IntakeDraft {
  const i = role.intake;
  return {
    title: role.title,
    description: role.description,
    family: i.family ?? "software_engineer",
    specialization: i.specialization ?? "general",
    level: i.level ?? "mid",
    ownership: i.ownership,
    responsibilities: i.responsibilities,
    requirements: i.requirements,
    languages: i.languages,
    teamContext: i.teamContext,
    location: role.location,
    remotePolicy: role.remotePolicy ?? "",
    employmentType: role.employmentType,
    compensation: role.compensation,
    hiringOwner: i.hiringOwner ?? "",
    reviewerIds: i.reviewerIds,
    hiringSteps: role.hiringSteps,
    acceptedEvidence: i.acceptedEvidence,
    workSamplePolicy: i.workSamplePolicy,
    expectedEffort: role.expectedEffort,
    visibility: i.visibility,
    applicationDeadline: role.applicationDeadline ?? "",
    contactEmail: role.contactEmail,
    sourceDescription: i.sourceDescription,
  };
}
