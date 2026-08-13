import { CONTACT_EMAIL, CONTACT_MAILTO, SECURITY_EMAIL, SECURITY_MAILTO } from "@/lib/contact";

/**
 * Renders a contact address and its mailto together, so the visible text and
 * the link target cannot disagree. Six pages previously hardcoded both halves
 * separately.
 */
export function ContactLink({
  kind = "general",
  className,
}: {
  kind?: "general" | "security";
  className?: string;
}) {
  const security = kind === "security";
  return (
    <a
      href={security ? SECURITY_MAILTO : CONTACT_MAILTO}
      className={
        className ??
        "text-[var(--text-primary)] underline underline-offset-2 hover:no-underline"
      }
    >
      {security ? SECURITY_EMAIL : CONTACT_EMAIL}
    </a>
  );
}
