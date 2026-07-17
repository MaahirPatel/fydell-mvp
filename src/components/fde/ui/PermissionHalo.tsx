import type { ReactNode } from "react";
import { relayColors } from "@/lib/fde/ui/tokens";

/**
 * Soft glow ring communicating "access is currently live" vs revoked/inactive.
 * Purely visual — never the source of truth for whether access is granted.
 */
export default function PermissionHalo({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className="relative inline-flex items-center rounded-full"
      style={
        active
          ? {
              boxShadow: `0 0 0 1px ${relayColors.successBorder}, 0 0 14px 1px rgba(103,217,160,0.18)`,
            }
          : undefined
      }
    >
      {!active && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 1px ${relayColors.borderSubtle}` }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
