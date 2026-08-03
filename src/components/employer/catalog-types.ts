/**
 * Shared, client-safe shapes for the employer simulation catalog.
 * Built server-side (see src/app/app/employer/_lib/catalog.ts) and passed
 * to client components. Contains no answer keys or scoring internals.
 */
export interface CatalogSimPreview {
  brief: string;
  companyName: string;
  stakeholder: { name: string; role: string };
  resources: { title: string; kind: string }[];
  questions: { prompt: string; kind: string; points: number }[];
}

export interface CatalogSim {
  slug: string;
  title: string;
  tagline: string;
  durationMinutes: number;
  competencies: string[];
  /** Database template id, needed to send invitations. Null if not published. */
  templateId: string | null;
  preview: CatalogSimPreview;
}

export interface CatalogRole {
  key: string;
  title: string;
  sims: CatalogSim[];
}
