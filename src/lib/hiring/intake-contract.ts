/**
 * Engineering role intake: the fields an employer fills in to describe one
 * real engineering role. Pure validation shared by the API and tests; storage
 * lives in roles.ts. Taxonomy values come from src/lib/eng/taxonomy.ts.
 */
import {
  EVIDENCE_KINDS,
  FAMILY_LABEL,
  FAMILY_SPECIALIZATIONS,
  isLevel,
  isRoleFamily,
  isSpecialization,
  SPECIALIZATION_LABEL,
  WORK_SAMPLE_POLICY_LABEL,
  type EvidenceKind,
  type Level,
  type RoleFamily,
  type Specialization,
  type WorkSamplePolicy,
} from "@/lib/eng/taxonomy";
import type { RemotePolicy } from "./role-contract";
import { parseRequirements, savableRequirementsProblem, type RoleRequirement } from "./requirements";
import { JD_MAX_LENGTH } from "./jd-extract";

export type Visibility = "private" | "link" | "public";

export const VISIBILITY_LABEL: Record<Visibility, { label: string; help: string }> = {
  private: { label: "Private", help: "Only your workspace sees the role. Publishing still creates a page, but you share it with no one." },
  link: { label: "Anyone with the link", help: "Applicants reach the role page through a link you send." },
  public: { label: "Public", help: "The role page may be listed where engineers look for roles." },
};

export const DEFAULT_ACCEPTED_EVIDENCE: EvidenceKind[] = ["public_repository", "uploaded_project", "described_project", "written_answer"];
export const DEFAULT_WORK_SAMPLE_POLICY: WorkSamplePolicy = "when_evidence_gap";

export type RoleIntakeInput = {
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
  remotePolicy: RemotePolicy | null;
  employmentType: string;
  compensation: string;
  hiringOwner: string | null;
  reviewerIds: string[];
  hiringSteps: string[];
  acceptedEvidence: EvidenceKind[];
  workSamplePolicy: WorkSamplePolicy;
  expectedEffort: string;
  visibility: Visibility;
  applicationDeadline: string | null;
  contactEmail: string;
  sourceDescription: string | null;
  changeReason: string;
};

/** A note when a specialization isn't typical for the family. Any combination is still allowed. */
export function specializationNote(family: RoleFamily, specialization: Specialization): string | null {
  if (FAMILY_SPECIALIZATIONS[family].includes(specialization)) return null;
  return `${SPECIALIZATION_LABEL[specialization]} is not a typical specialization for ${FAMILY_LABEL[family]}. That's fine if it describes the role; it is kept as chosen.`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fail = { ok: false; error: string };

function text(raw: unknown, max: number): string | null {
  const v = typeof raw === "string" ? raw.trim() : raw === undefined || raw === null ? "" : null;
  if (v === null) return null;
  return v.length > max ? null : v;
}

function list(raw: unknown, maxItems: number, maxLen: number): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const items = raw.filter((i): i is string => typeof i === "string").map((i) => i.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (items.length > maxItems || items.some((i) => i.length > maxLen)) return null;
  return [...new Set(items)];
}

function isWorkSamplePolicy(v: unknown): v is WorkSamplePolicy {
  return typeof v === "string" && v in WORK_SAMPLE_POLICY_LABEL;
}

function isVisibility(v: unknown): v is Visibility {
  return v === "private" || v === "link" || v === "public";
}

export function parseRoleIntake(raw: unknown): { ok: true; value: RoleIntakeInput } | Fail {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, error: "Send the role fields." };
  const b = raw as Record<string, unknown>;

  const title = text(b.title, 120);
  if (!title || title.length < 2) return { ok: false, error: "Give the role a title between 2 and 120 characters." };
  const description = text(b.description, 4000);
  if (description === null) return { ok: false, error: "Keep the description of the work under 4,000 characters." };
  if (!isRoleFamily(b.family)) return { ok: false, error: "Choose a role family." };
  if (!isSpecialization(b.specialization)) return { ok: false, error: "Choose a specialization, or General." };
  if (!isLevel(b.level)) return { ok: false, error: "Choose a level." };
  const ownership = text(b.ownership, 1000);
  if (ownership === null) return { ok: false, error: "Keep expected ownership under 1,000 characters." };
  const responsibilities = list(b.responsibilities, 15, 300);
  if (!responsibilities) return { ok: false, error: "List up to 15 responsibilities, each under 300 characters." };

  const reqs = parseRequirements(b.requirements);
  if (reqs.ok === false) return { ok: false, error: reqs.error };
  const pending = savableRequirementsProblem(reqs.value);
  if (pending) return { ok: false, error: pending };

  const languages = list(b.languages, 20, 40);
  if (!languages) return { ok: false, error: "List up to 20 languages and technologies, each under 40 characters." };
  const teamContext = text(b.teamContext, 2000);
  if (teamContext === null) return { ok: false, error: "Keep team and product context under 2,000 characters." };
  const location = text(b.location, 120);
  const employmentType = text(b.employmentType, 60);
  const compensation = text(b.compensation, 200);
  const expectedEffort = text(b.expectedEffort, 200);
  if (location === null || employmentType === null || compensation === null || expectedEffort === null) {
    return { ok: false, error: "One of the short fields is too long. Location, type, compensation and effort are limited to a line each." };
  }
  const remotePolicy = b.remotePolicy === "onsite" || b.remotePolicy === "hybrid" || b.remotePolicy === "remote" ? b.remotePolicy : null;

  const hiringOwner = typeof b.hiringOwner === "string" && b.hiringOwner ? b.hiringOwner : null;
  if (hiringOwner && !UUID.test(hiringOwner)) return { ok: false, error: "Choose the hiring owner from your workspace members." };
  const reviewerIds = list(b.reviewerIds, 20, 36);
  if (!reviewerIds || reviewerIds.some((id) => !UUID.test(id))) return { ok: false, error: "Choose up to 20 reviewers from your workspace members." };

  const hiringSteps = list(b.hiringSteps, 8, 160);
  if (!hiringSteps) return { ok: false, error: "List up to 8 hiring steps, each under 160 characters." };
  const evidenceRaw = Array.isArray(b.acceptedEvidence) ? b.acceptedEvidence : [];
  const acceptedEvidence = [...new Set(evidenceRaw.filter((e): e is EvidenceKind => typeof e === "string" && (EVIDENCE_KINDS as readonly string[]).includes(e)))];
  if (acceptedEvidence.length === 0) return { ok: false, error: "Choose at least one kind of evidence you accept." };
  const workSamplePolicy = b.workSamplePolicy === undefined ? DEFAULT_WORK_SAMPLE_POLICY : b.workSamplePolicy;
  if (!isWorkSamplePolicy(workSamplePolicy)) return { ok: false, error: "Choose when a work sample is used." };
  const visibility = b.visibility === undefined ? "private" : b.visibility;
  if (!isVisibility(visibility)) return { ok: false, error: "Choose who can see the role page." };

  const deadlineRaw = typeof b.applicationDeadline === "string" ? b.applicationDeadline.trim() : "";
  if (deadlineRaw && !DATE.test(deadlineRaw)) return { ok: false, error: "Use a date for the deadline, or leave it empty." };
  const contactEmail = text(b.contactEmail, 254);
  if (contactEmail === null || (contactEmail && !EMAIL.test(contactEmail))) {
    return { ok: false, error: "Enter a contact email applicants can write to, or leave it empty." };
  }
  const source = text(b.sourceDescription, JD_MAX_LENGTH);
  if (source === null) return { ok: false, error: "The pasted job description is too long. Keep it under 20,000 characters." };
  const changeReason = text(b.changeReason, 500);
  if (changeReason === null) return { ok: false, error: "Keep the reason for the change under 500 characters." };

  return {
    ok: true,
    value: {
      title,
      description,
      family: b.family,
      specialization: b.specialization,
      level: b.level,
      ownership,
      responsibilities,
      requirements: reqs.value,
      languages,
      teamContext,
      location,
      remotePolicy,
      employmentType,
      compensation,
      hiringOwner,
      reviewerIds,
      hiringSteps,
      acceptedEvidence,
      workSamplePolicy,
      expectedEffort,
      visibility,
      applicationDeadline: deadlineRaw || null,
      contactEmail: contactEmail.toLowerCase(),
      sourceDescription: source || null,
      changeReason,
    },
  };
}
