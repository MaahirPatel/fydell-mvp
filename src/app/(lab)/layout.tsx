import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";

/**
 * Authorization boundary for the engine lab.
 *
 * These routes list every scenario and will run any of them on demand, which
 * means they expose the material an evaluation depends on staying unseen:
 * stakeholder disclosure facts, the changed-information event, and the strong
 * and weak fixtures. Reachable without a session, that is a practice run for
 * anyone who finds the URL.
 *
 * Outside production the lab is left open, because that is the environment it
 * exists for. In production it is restricted to members of an employer
 * workspace: a candidate holds an account but no membership, so the surface
 * stays closed to the people being evaluated. Anonymous visitors get the same
 * answer as a route that does not exist, rather than confirmation that it does.
 *
 * The candidate-facing simulation is unaffected. It is reached through an
 * invitation, and the employer-facing equivalent lives at
 * `/app/employer/workbench`, which carries its own membership check.
 */
/**
 * The check has to run per request. Prerendered at build time it would decide
 * once, with no session to inspect, and stop being a check at all.
 */
export const dynamic = "force-dynamic";

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "production") return <>{children}</>;

  const user = await requireUser();
  if (!user) redirect("/login?next=%2Flab%2Fsim");

  const org = await requireOrgMember(user.id);
  if (!org) notFound();

  return <>{children}</>;
}
