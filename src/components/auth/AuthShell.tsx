import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

/**
 * One calm frame for every authentication screen.
 *
 * Single column, form-dominant, no split-screen marketing bullets and no
 * decorative wash. The composition is the same on login, signup, password
 * reset and workspace creation so the flow never feels like three products.
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
    <div className="flex min-h-[100dvh] flex-col bg-[var(--surface-canvas)]">
      <header className="flex h-16 shrink-0 items-center px-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="Fydell home"
        >
          <FydellMark width={24} />
          <span className="text-[17px] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)]">
            fydell
          </span>
        </Link>
      </header>

      <main
        id="main"
        className="flex flex-1 items-start justify-center px-6 pb-20 pt-8 sm:pt-14"
      >
        <div
          className={
            width === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[400px]"
          }
        >
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.032em] text-[var(--text-primary)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2.5 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-7 border-t border-[var(--border-subtle)] pt-5 text-[13.5px] text-[var(--text-secondary)]">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
