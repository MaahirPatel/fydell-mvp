import { ok } from "@/lib/eng/http";
import { authoringGate } from "@/lib/eng/authoring/http";
import { registryPayload } from "@/lib/eng/authoring/registry";
import { selectRunner } from "@/lib/eng/authoring/runner";
import { authoringProvider } from "@/lib/eng/authoring/generate";

export async function GET() {
  const gate = await authoringGate("view_roles");
  if (gate.ok === false) return gate.response;
  const runner = selectRunner();
  return ok({
    registry: registryPayload(),
    execution: runner.runner
      ? { available: true, label: runner.runner.info.label, isolated: runner.runner.info.isolated }
      : { available: false, label: runner.detail ?? "Execution unavailable.", isolated: false },
    generation: { available: authoringProvider() !== null },
  });
}
