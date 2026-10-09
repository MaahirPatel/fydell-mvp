import { demoScenarioOrThrow } from "@/lib/employer-demo/fixtures";
import { badRequest, demoRoute } from "@/lib/employer-demo/route";
import { saveDemoSample } from "@/lib/employer-demo/store";
import { parseSampleInput } from "@/lib/employer-demo/validate";

export const runtime = "nodejs";

/**
 * Saves the employer's own run of the sample task to their demo workspace.
 * The tests ran in their browser; no evaluation job, runner or charge is used.
 */
export async function POST(req: Request) {
  return demoRoute(req, async (userId, body) => {
    const parsed = parseSampleInput(body, demoScenarioOrThrow());
    if ("error" in parsed) badRequest(parsed.error);
    const applicantKey = await saveDemoSample(userId, parsed.value);
    return { applicantKey };
  });
}
