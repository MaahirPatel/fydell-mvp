/**
 * Wave 1 role contract.
 *
 * Only Data Analyst is in the working loop. The other two names may appear
 * as coming-soon copy. They must not be published as fake catalogs.
 */

export const WAVE1_WORKING_ROLE = "data_analyst" as const;

export const WAVE1_EVALUATION_SLUG = "ops-yield-investigation" as const;

export const WAVE1_COMING_SOON_ROLES = [
  "solutions_engineer",
  "sales_engineer",
] as const;

export const WAVE1_ROLE_LABELS = {
  data_analyst: "Data Analyst",
  solutions_engineer: "Solutions Engineer",
  sales_engineer: "Sales Engineer",
} as const;
