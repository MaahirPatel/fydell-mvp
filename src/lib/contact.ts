/**
 * Fydell contact addresses.
 *
 * These were repeated as string literals across eight components, which is how
 * the general address drifted. Import from here instead of writing a mailto by
 * hand so a future change is one edit.
 *
 * The general and security addresses are deliberately separate. Security
 * reports must keep reaching the security mailbox, so CONTACT_EMAIL must never
 * be substituted for SECURITY_EMAIL.
 */

/** General enquiries, support, data requests, and legal questions. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@fydell.com";

/** Vulnerability reports and security questions only. */
export const SECURITY_EMAIL =
  process.env.NEXT_PUBLIC_SECURITY_EMAIL || "security@fydell.com";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
export const SECURITY_MAILTO = `mailto:${SECURITY_EMAIL}`;
