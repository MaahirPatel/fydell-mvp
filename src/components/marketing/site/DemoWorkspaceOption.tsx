import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";

export const DEMO_WORKSPACE_HREF = "/demo";

/**
 * The public way into the employer sandbox, offered beside account creation.
 * It goes through sign-in or sign-up and lands in the demo workspace.
 * `prominent` is for visitors who came asking for the demo.
 */
export default function DemoWorkspaceOption({ prominent = false }: { prominent?: boolean }) {
  return (
    <Link
      href={DEMO_WORKSPACE_HREF}
      className={`group flex items-start gap-3.5 rounded-[12px] border px-4 py-3.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mk-indigo)] ${
        prominent
          ? "border-[var(--mk-indigo-line)] bg-[var(--mk-indigo-tint)] hover:border-[var(--mk-indigo)]"
          : "border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel)]"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
        <FlaskConical aria-hidden className="h-4 w-4 text-[var(--mk-indigo)]" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-[var(--text-primary)]">Explore employer sandbox</span>
        <span className="mt-0.5 block text-[13px] leading-[1.55] text-[var(--text-secondary)]">
          A demo workspace with a fictional role and applicants, inside an employer account. Nothing you do there is sent to anyone.
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="mt-2 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform duration-150 group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </Link>
  );
}
