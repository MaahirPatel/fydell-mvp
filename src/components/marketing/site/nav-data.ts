export type NavItem = { label: string; href: string; description?: string };

/** The Product menu. Every entry has a page that shows the product and says how available it is. */
export const PRODUCT_ITEMS: readonly NavItem[] = [
  { label: "Builder Profiles", href: "/products/builder-profiles", description: "Present selected projects and what you contributed." },
  { label: "Engineering Passport", href: "/products/engineering-passport", description: "Share relevant work with the evidence behind it." },
  { label: "Builder Reports", href: "/products/builder-reports", description: "Inspect findings, their sources and their limits." },
  { label: "Hiring Workspace", href: "/products/hiring-workspace", description: "Review applicants and their evidence by requirement." },
  { label: "Simulations", href: "/products/simulations", description: "Focused technical work samples, with disclosed scope." },
  { label: "Desktop", href: "/products/desktop", description: "Work simulations in a local workspace on your computer." },
];

export const RESOURCE_ITEMS: readonly NavItem[] = [
 { label: "Changelog", href: "/changelog" },
  { label: "Trust and privacy", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

export const PRIMARY_LINKS: readonly NavItem[] = [
  { label: "For Engineers", href: "/developers" },
  { label: "For Employers", href: "/employers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Download", href: "/download" },
];
