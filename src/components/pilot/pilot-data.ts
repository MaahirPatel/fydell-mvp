import type { RoleKey } from "@/lib/simulations/types";

/**
 * Constants for the guided pilot tester path (/pilot). Kept inside
 * src/components/pilot so the pilot flow does not touch shared files.
 */

export interface PilotSim {
  slug: string;
  title: string;
}

/** Recommended pilot simulation per role. */
export const PILOT_SIMS: Record<RoleKey, PilotSim> = {
  data_analyst: { slug: "missing-delays", title: "The Missing Delays" },
  bi_analyst: { slug: "one-renewal-rate", title: "One Renewal Rate" },
  solutions_engineer: { slug: "promise-or-product-fit", title: "Promise or Product Fit" },
  implementation_consultant: { slug: "launch-day-import", title: "Launch Mapping" },
  technical_support_engineer: { slug: "green-status-page", title: "Priority One" },
  business_systems_analyst: { slug: "executive-queue", title: "Approval Breakpoint" },
};

/** Card order on /pilot/roles. Data, BI and Solutions Engineering first. */
export const PILOT_ROLE_ORDER: RoleKey[] = [
  "data_analyst",
  "bi_analyst",
  "solutions_engineer",
  "implementation_consultant",
  "technical_support_engineer",
  "business_systems_analyst",
];

export const PERSPECTIVE_OPTIONS = [
  "Hiring manager",
  "Recruiter",
  "Practitioner in this role",
  "Candidate",
  "HR or talent leader",
  "Product reviewer",
  "Other",
] as const;

export const FAMILIARITY_OPTIONS = [
  "I currently perform or manage this role",
  "I have hired this role",
  "I understand the role generally",
  "I am unfamiliar with the role",
] as const;

export const HELP_OPTIONS = ["Yes", "Mostly", "No"] as const;

export const DURATION_OPTIONS = ["Too short", "Appropriate", "Too long"] as const;

export const EVIDENCE_CHOICES = [
  "Objective correctness",
  "Evidence selected",
  "Reasoning",
  "Stakeholder question",
  "Written explanation",
  "Revision behavior",
  "Other",
] as const;

export const TRUST_OPTIONS = ["Yes", "Partially", "No"] as const;

export const SCORE_PREFERENCE_OPTIONS = [
  "Evidence bands only",
  "Numeric score and evidence bands",
  "Evidence without an overall score",
] as const;

export const INTERVIEW_VALUE_OPTIONS = [
  "Definitely",
  "Probably",
  "Unsure",
  "Probably not",
  "Definitely not",
] as const;

export const HIRING_STEP_OPTIONS = [
  "Resume screening",
  "Recruiter phone screen",
  "Take-home assignment",
  "First technical interview",
  "Final interview",
  "Reference checks",
  "None of these",
] as const;

export const PILOT_INTEREST_OPTIONS = ["Yes", "Maybe", "No"] as const;

export const YES_NO_OPTIONS = ["Yes", "No"] as const;

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
