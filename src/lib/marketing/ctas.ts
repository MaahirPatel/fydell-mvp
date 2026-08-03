/** Canonical public conversion paths. Keep CTAs consistent across marketing. */
export const CREATE_SIMULATION_HREF =
  "/signup?next=/app/employer/simulations/new";

export const TRY_CANDIDATE_HREF = "/simulations";

/** Real contact / sales conversation path (existing pilot request form). */
export const CONTACT_SALES_HREF = "/request-pilot";

/** Safe post-auth destinations accepted from ?next= on signup/login. */
export function isSafeAppNext(next: string | null): next is string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  return (
    next.startsWith("/app/employer") ||
    next.startsWith("/app/simulations") ||
    next.startsWith("/invite/") ||
    next.startsWith("/sim/") ||
    next.startsWith("/simulations") ||
    next.startsWith("/s/")
  );
}
