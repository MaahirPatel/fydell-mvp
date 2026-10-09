import { demoScenarioOrThrow } from "@/lib/employer-demo/fixtures";
import { badRequest, demoRoute } from "@/lib/employer-demo/route";
import { addDemoMessage } from "@/lib/employer-demo/store";
import { parseMessageInput } from "@/lib/employer-demo/validate";

export const runtime = "nodejs";

/** Adds a follow-up question to a demo applicant's thread. The send is simulated: no email, no notification. */
export async function POST(req: Request) {
  return demoRoute(req, async (userId, body) => {
    const parsed = parseMessageInput(body, demoScenarioOrThrow());
    if ("error" in parsed) badRequest(parsed.error);
    const message = await addDemoMessage(userId, parsed.value);
    return { message, emailed: false };
  });
}
