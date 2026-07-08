import { notFound } from "next/navigation";
import Simulation from "@/components/candidate/Simulation";

// Dev-only preview of the candidate workstation with no database needed.
// Add ?demo=1 for accelerated timing (25 min compressed to ~50s) to test the
// timed updates; default is calm real-time so the work phase is easy to view.
export const dynamic = "force-dynamic";

export default async function SimulationPreviewPage({
  searchParams
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { demo } = await searchParams;

  return (
    <Simulation
      token="preview"
      candidateName="Candidate A"
      employerName="Your workspace"
      role="Financial Analyst"
      demo={demo === "1"}
    />
  );
}
