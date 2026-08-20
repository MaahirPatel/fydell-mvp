import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import FydellMark from "@/components/brand/FydellMark";

/**
 * Positioning context for a product scene.
 *
 * It used to be a bordered graphite tray with brand-tinted gradients and a
 * grain overlay. A window that already has a frame does not need a second one
 * around it, and the tray cost the scene the width that made it readable, so
 * the product now sits directly on the page.
 */
export function DesktopStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("desktop-stage", className)}>{children}</div>;
}

type SessionTone = "evidence" | "verified" | "changed" | "good";

const SESSION_COLOR: Record<SessionTone, string> = {
  evidence: "var(--fydell-evidence)",
  verified: "var(--fydell-verified)",
  changed: "var(--fydell-changed)",
  good: "var(--fydell-good)",
};

/**
 * A Fydell application window. Title bar, session state, product surface.
 * Not macOS chrome, not a screenshot frame, the same header language the
 * live console already uses.
 */
export function AppWindow({
  title,
  meta,
  session,
  children,
  className,
  compact = false,
}: {
  title: string;
  meta?: string;
  session?: { label: string; tone: SessionTone };
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "app-window overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-[var(--border-subtle)]",
          compact ? "px-3 py-2" : "px-3.5 py-2.5",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FydellMark width={compact ? 14 : 16} />
          <span className="truncate text-[12.5px] font-medium tracking-[-0.018em] text-[var(--text-primary)]">
            {title}
          </span>
          {meta ? (
            <span className="hidden truncate text-[12px] text-[var(--text-tertiary)] sm:inline">
              {meta}
            </span>
          ) : null}
        </div>
        {session ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: SESSION_COLOR[session.tone] }}
            />
            {session.label}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
