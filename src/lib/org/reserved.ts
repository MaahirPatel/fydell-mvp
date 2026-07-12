/** Reserved org names / domains — cannot be claimed by self-signup. */
const RESERVED_NAMES = new Set([
  "fydell",
  "admin",
  "administrator",
  "support",
  "security",
  "system",
  "fydell.com",
  "www.fydell.com",
]);

export function normalizeOrgName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isReservedOrganizationName(name: string): boolean {
  const n = normalizeOrgName(name);
  if (RESERVED_NAMES.has(n)) return true;
  if (n.includes("fydell")) return true;
  return false;
}

export function slugifyOrganization(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "workspace";
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

export function websiteDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const u = new URL(website.startsWith("http") ? website : `https://${website}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function domainsMismatch(
  workEmail: string,
  website: string | null | undefined
): boolean {
  const ed = emailDomain(workEmail);
  const wd = websiteDomain(website);
  if (!ed || !wd) return false;
  if (ed.endsWith("gmail.com") || ed.endsWith("outlook.com") || ed.endsWith("yahoo.com")) {
    return true;
  }
  return ed !== wd && !ed.endsWith(`.${wd}`) && !wd.endsWith(`.${ed}`);
}

export type EmployerSelfSignupMode = "disabled" | "approval_required" | "open";

export function employerSelfSignupMode(): EmployerSelfSignupMode {
  const raw = (process.env.EMPLOYER_SELF_SIGNUP_MODE || "approval_required").toLowerCase();
  if (raw === "disabled" || raw === "open" || raw === "approval_required") return raw;
  return "approval_required";
}

export function allowDemoData(): boolean {
  return process.env.ALLOW_DEMO_DATA === "true";
}

export function assertDemoDataAllowed() {
  if (process.env.VERCEL_ENV === "production" && allowDemoData()) {
    throw new Error("ALLOW_DEMO_DATA=true is forbidden in production.");
  }
}
