import Link from "next/link";
import { Lockup } from "@/components/site/Mark";

/**
 * The single frame for every authentication screen.
 *
 * One centered column on a quiet canvas: wordmark, heading, form, footer.
 * Signup and login are trust surfaces: a product scene beside credential
 * fields reads as a pitch, not reassurance, so the shell takes no aside.
 * Screens that need more room (role select, onboarding) use the wide
 * measure; the composition stays the same.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  width = "narrow",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--surface-canvas)]">
      {/* Ambient ring-palette wash along the top edge, fading into the
          canvas. Present, not noticeable. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(30%_36%_at_14%_10%,rgba(45,212,191,0.12),transparent_70%),radial-gradient(36%_40%_at_44%_0%,rgba(91,108,255,0.13),transparent_72%),radial-gradient(30%_36%_at_76%_8%,rgba(168,85,247,0.09),transparent_72%),radial-gradient(28%_32%_at_96%_28%,rgba(255,90,110,0.08),transparent_72%)]" />
      </div>

      <header className="relative z-10 flex h-16 shrink-0 items-center px-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-[6px]"
          aria-label="fydell home"
        >
          <Lockup size={19} />
        </Link>
      </header>

      <main
        id="main"
        className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 items-center justify-center px-6 py-12 sm:py-16"
      >
        <div
          className={
            width === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[400px]"
          }
        >
          <h1 className="auth-display text-center">{title}</h1>
          {description ? (
            <p className="mt-3 text-balance text-center text-app-body leading-[1.6] tracking-[-0.006em] text-[var(--text-body)]">
              {description}
            </p>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-8 border-t border-[var(--border-subtle)] pt-6 text-center text-app-body text-[var(--text-secondary)]">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
