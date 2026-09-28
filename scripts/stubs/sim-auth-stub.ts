/**
 * Test stub for @/lib/simulations/auth.
 * requireUser() returns the user set on globalThis.__SIM_TEST_USER__,
 * defaulting to the candidate. Set it to null to simulate signed-out.
 */
export async function requireUser(): Promise<{ id: string; email: string } | null> {
  const u = (globalThis as unknown as { __SIM_TEST_USER__?: { id: string; email: string } | null | undefined }).__SIM_TEST_USER__;
  if (u === undefined) return { id: "cand-1", email: "candidate@test.local" };
  return u;
}
