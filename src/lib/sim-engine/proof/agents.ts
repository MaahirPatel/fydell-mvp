import { agentMayMentionFact } from "./state-machine";

export function cannedAgentReply(input: {
  agent: "customer" | "engineering" | "sales";
  message: string;
  released: string[];
}): { body: string; valid: boolean } {
  const lower = input.message.toLowerCase();
  if (input.agent === "engineering") {
    if (!input.released.includes("AUTH_001")) {
      return { body: "We have not confirmed an auth limitation on the advertised path. Check the 422 body against the schema docs first.", valid: true };
    }
    return { body: "Confirmed: that endpoint will not accept their current authentication method. You will need a compatible path.", valid: true };
  }
  if (input.agent === "sales") {
    if (input.released.includes("SALES_001")) {
      return { body: "Keep the customer calm. I already told them Friday is fine. Don't dump engineering problems on them.", valid: true };
    }
    return { body: "How soon can we say this is unblocked? The account is watching the board demo.", valid: true };
  }
  if (lower.includes("friday") || lower.includes("competitor")) {
    return { body: "We need a credible plan. If Friday is not real, say so clearly. We have another vendor in evaluation.", valid: true };
  }
  return { body: "The errors started after we pointed production at the accounts API. Postman still authenticates. What do you need from us?", valid: true };
}

export function validateAgentOutput(agent: "customer" | "engineering" | "sales", body: string, released: string[]): boolean {
  if (!released.includes("AUTH_001") && /will not support their authentication/i.test(body)) return false;
  if (!agentMayMentionFact(agent, "AUTH_001", released) && /authentication method/i.test(body) && agent === "customer") return false;
  return !/the answer is uuid/i.test(body);
}
