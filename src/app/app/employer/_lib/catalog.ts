import "server-only";
/**
 * Builds the employer-facing simulation catalog: six roles, five simulations
 * each, from the code registry, joined with database template ids by slug
 * (invitations need the database id). Preview data is candidate-safe.
 */
import { ROLES } from "@/lib/simulations/roles";
import { SIMULATION_BY_SLUG } from "@/lib/simulations/content";
import { toMicroCandidateView } from "@/lib/simulations/candidate-view";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { CatalogRole, CatalogSim } from "@/components/employer/catalog-types";

export async function getEmployerCatalog(): Promise<CatalogRole[]> {
  const idBySlug = new Map<string, string>();
  if (isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("sim_templates")
      .select("id, slug")
      .eq("status", "published");
    for (const t of data || []) idBySlug.set(t.slug, t.id);
  }

  const roles = ROLES.map((role) => ({
    key: role.key,
    title: role.title,
    sims: role.simulationSlugs
      .map((slug): CatalogSim | null => {
        const sim = SIMULATION_BY_SLUG[slug];
        if (!sim) return null;
        const view = toMicroCandidateView(sim);
        return {
          slug,
          title: sim.title,
          tagline: sim.tagline,
          durationMinutes: sim.durationMinutes,
          competencies: sim.competencies.slice(0, 3).map((c) => c.label),
          templateId: idBySlug.get(slug) || null,
          preview: {
            brief: view.mission,
            companyName: view.companyName,
            stakeholder: { name: view.stakeholder.name, role: view.stakeholder.role },
            resources: view.resources.map((r) => ({ title: r.title, kind: r.kind })),
            questions: view.questions.map((q) => ({
              prompt: q.prompt,
              kind: q.kind,
              points: q.points,
            })),
          },
        };
      })
      .filter((s): s is CatalogSim => s !== null),
  }));

  // Only evaluations that exist as published templates are workspace inventory.
  // The code registry also holds unpublished drafts, and listing those turned
  // the Evaluations screen into a catalogue of short tests a company cannot
  // invite anyone to, which is the opposite of what the product sells.
  return roles
    .map((role) => ({ ...role, sims: role.sims.filter((s) => s.templateId) }))
    .filter((role) => role.sims.length > 0);
}
