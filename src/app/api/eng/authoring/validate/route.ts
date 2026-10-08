import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { checkInput } from "@/lib/eng/authoring/drafts";
import { authoringGate } from "@/lib/eng/authoring/http";

/** Server-side validation of the creator form: errors, conflicts, clarifications, assumptions and summary. */
export async function POST(req: Request) {
  const gate = await authoringGate("author_work_samples");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Send the form as JSON.");
  const { validation } = checkInput(body.input);
  const { resolved: _resolved, ...rest } = validation;
  void _resolved;
  return ok({ validation: rest });
}
