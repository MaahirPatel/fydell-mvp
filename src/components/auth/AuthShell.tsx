import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";
import { ProductSpotlight } from "@/components/fydell/ProductSpotlight";
import { DesktopStage } from "@/components/fydell/ProductDesktop";

/**
 * One calm frame for every authentication screen.
 *
 * Screens that create something (signup, login) pass an `aside` scene showing
 * what the company is about to get. Screens that only recover access (password
 * reset, link expired) stay single-column, because a product pitch beside a
 * reset form is noise.
 *
 * The form keeps its 400px measure in both cases. The empty half is filled by
 * a real product scene, vertically centered, so the page does not read as a
 * form floating in unused black.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  width = "narrow",
  aside,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
  aside?: React.ReactNode;
}) {
  const column = (
    <div
      className={
        width === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[400px]"
      }
    >
      <h1 className="auth-display">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-[42ch] text-[15px] font-[430] leading-[1.6] tracking-[-0.006em] text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}

      <div className="mt-8">{children}</div>

      {footer ? (
        <div className="mt-8 border-t border-[var(--border-subtle)] pt-5 text-[13.5px] text-[var(--text-secondary)]">
          {footer}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[var(--surface-canvas)]">
      <div className="auth-canvas" aria-hidden />

      <header className="relative z-10 flex h-[68px] shrink-0 items-center px-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="Fydell home"
        >
          <FydellMark width={22} />
          <span className="text-[16px] font-medium leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            fydell
          </span>
        </Link>
      </header>

      {aside ? (
        <main
          id="main"
          className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 items-center px-6 py-10 sm:px-10 lg:py-14"
        >
          <div className="grid w-full items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex justify-center lg:col-span-5 lg:block">
              {column}
            </div>
            <div className="min-w-0 lg:col-span-7">
              <ProductSpotlight>
                <DesktopStage>{aside}</DesktopStage>
              </ProductSpotlight>
            </div>
          </div>
        </main>
      ) : (
        <main
          id="main"
          className="relative z-10 flex flex-1 items-center justify-center px-6 py-12"
        >
          {column}
        </main>
      )}
    </div>
  );
}
