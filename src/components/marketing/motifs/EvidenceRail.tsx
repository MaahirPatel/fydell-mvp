import type { ReactNode } from "react";

/** 2–3px accent rail connecting a claim to supporting evidence. */
export function EvidenceRail({
  children,
  className = "",
  active = true,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "relative pl-3",
        active
          ? "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:bg-[var(--fydell-evidence)]"
          : "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:bg-white/15",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
