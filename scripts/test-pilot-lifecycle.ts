import { createHash, randomBytes } from "crypto";
import assert from "node:assert/strict";
import {
  isReservedOrganizationName,
  slugifyOrganization,
  domainsMismatch,
} from "../src/lib/org/reserved";

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function mintInviteToken() {
  return randomBytes(24).toString("base64url");
}

assert.equal(isReservedOrganizationName("Fydell"), true);
assert.equal(isReservedOrganizationName("My Finance Co"), false);
assert.ok(slugifyOrganization("Growth & Partners").length > 0);
assert.equal(domainsMismatch("ceo@acme.com", "https://other.com"), true);
const t = mintInviteToken();
assert.equal(hashInviteToken(t), createHash("sha256").update(t).digest("hex"));
console.log("pilot unit checks passed");
