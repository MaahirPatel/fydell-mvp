/**
 * Feature flags used by the active auth and routing paths.
 */

/** Marketplace-style post-login routing (profiles.account_type based). */
export function marketplaceRoutingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FDE_MARKETPLACE === "1";
}

/**
 * Explicit pilot/demo mode. Enables a labeled pilot workspace fallback when
 * auth secrets are missing. Never silently bypasses production authentication.
 */
export function pilotModeEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_PILOT_MODE === "true" ||
    process.env.NEXT_PUBLIC_PILOT_MODE === "1"
  );
}

/** Partner signup path. Off by default. The approval flow is still a stub. */
export function partnerSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PARTNER_SIGNUP === "1";
}
