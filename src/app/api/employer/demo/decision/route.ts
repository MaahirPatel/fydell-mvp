import { badRequest, demoRoute } from "@/lib/employer-demo/route";
import { recordDemoDecision } from "@/lib/employer-demo/store";
import { parseDecisionInput } from "@/lib/employer-demo/validate";

export const runtime = "nodejs";

/** Records a sandbox decision in the caller's demo workspace. Nobody is notified. */
export async function POST(req: Request) {
  return demoRoute(req, async (userId, body) => {
    const parsed = parseDecisionInput(body);
    if ("error" in parsed) badRequest(parsed.error);
    const decision = await recordDemoDecision(userId, parsed.value);
    return { decision, notified: false };
  });
}
