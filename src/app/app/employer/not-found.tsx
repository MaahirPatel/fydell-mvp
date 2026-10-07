import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Missing records and records outside the member's permissions land here
 * alike, so the copy does not reveal whether something exists.
 */
export default function EmployerNotFound() {
  return (
    <div className="mx-auto max-w-[62ch] py-10">
      <h1 className="text-app-page font-medium text-[var(--text-primary)]">Not available in this workspace</h1>
      <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
        This role, candidate or report does not exist here, or your workspace role does not include access to it. If someone sent you
        this link, check you are in the right workspace, or ask an owner or admin to change your role.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ButtonLink href="/app/employer/engineering" variant="primary">
          Engineering tasks
        </ButtonLink>
        <Link
          href="/app/employer"
          className="rounded-[6px] text-app-body text-[var(--text-secondary)] underline-offset-2 transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)] hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
