/**
 * Wave 1 role contract.
 *
 * Only Data Analyst is in the working loop. The other two names may appear
 * as coming-soon copy. They must not be published as fake catalogs.
 */

export const WAVE1_WORKING_ROLE = "data_analyst" as const;

export const WAVE1_EVALUATION_SLUG = "ops-yield-investigation" as const;

/**
 * The retired desktop-app version of the webhook incident. Employers invite to
 * the same incident through Assessments, which runs in the browser and the
 * candidate's own editor, so it is not invitable from this catalog.
 */
export const DESKTOP_ENGINEERING_SLUG = "webhook-retry-incident" as const;

/** Published templates an employer may invite candidates to. */
export const EMPLOYER_INVITABLE_SLUGS: readonly string[] = [WAVE1_EVALUATION_SLUG];

export const WAVE1_COMING_SOON_ROLES = [
  "solutions_engineer",
  "sales_engineer",
] as const;

export const WAVE1_ROLE_LABELS = {
  data_analyst: "Data Analyst",
  solutions_engineer: "Solutions Engineer",
  sales_engineer: "Sales Engineer",
} as const;
