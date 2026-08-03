import { NextResponse } from "next/server";
import { getPublishedTemplates } from "@/lib/simulations/db";
import { toCatalogCard } from "@/lib/simulations/candidate-view";
import type { SimulationContent } from "@/lib/simulations/types";

export const runtime = "nodejs";
export const revalidate = 300;

/** GET: public catalog of published simulations (candidate-safe fields only). */
export async function GET() {
  try {
    const published = await getPublishedTemplates();
    return NextResponse.json({
      simulations: published.map(({ template, version }) => ({
        templateId: template.id,
        ...toCatalogCard(version.content as SimulationContent),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Catalog unavailable" },
      { status: 500 }
    );
  }
}
