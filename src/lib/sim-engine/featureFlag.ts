/**
 * Feature flag for the new simulation engine lab surfaces.
 * Does not affect production /sim routes unless self-serve opt-in is also set.
 */
export function isSimEngineEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.SIM_ENGINE_ENABLED === "0") {
    return false;
  }
  // Default ON for lab routes in development; production still requires explicit opt-in via env or lab path.
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return process.env.SIM_ENGINE_ENABLED === "1";
  }
  return true;
}

/**
 * Opt-in to route mapped self-serve starts (`/simulations/start/[slug]`) to the
 * lab engine instead of creating a production WorkbenchRunner session.
 *
 * Requires SIM_ENGINE_ENABLED (lab) AND SIM_ENGINE_SELF_SERVE=1.
 * Default off everywhere, including development, so WorkbenchRunner remains
 * the default self-serve path until explicitly enabled.
 */
export function isSimEngineSelfServeOptIn(): boolean {
  return (
    isSimEngineEnabled() &&
    typeof process !== "undefined" &&
    process.env.SIM_ENGINE_SELF_SERVE === "1"
  );
}
