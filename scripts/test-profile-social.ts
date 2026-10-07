import assert from "node:assert/strict";
import { normalizeSocial, socialDisplay } from "../src/lib/profile/social";

let passed = 0;
function ok(kind: "linkedin" | "x" | "instagram", input: string, url: string) {
  const r = normalizeSocial(kind, input);
  assert.ok(r.ok, `${kind} "${input}" should be accepted`);
  assert.equal("url" in r ? r.url : "", url, `${kind} "${input}"`);
  passed++;
}
function bad(kind: "linkedin" | "x" | "instagram", input: string) {
  const r = normalizeSocial(kind, input);
  assert.ok(!r.ok, `${kind} "${input}" should be rejected`);
  passed++;
}

ok("linkedin", "", "");
ok("linkedin", "linkedin.com/in/maya-okafor", "https://www.linkedin.com/in/maya-okafor");
ok("linkedin", "https://www.linkedin.com/in/maya-okafor/?trk=abc", "https://www.linkedin.com/in/maya-okafor");
ok("linkedin", "http://ca.linkedin.com/in/maya-okafor", "https://www.linkedin.com/in/maya-okafor");
ok("linkedin", "linkedin.com/company/fydell", "https://www.linkedin.com/company/fydell");
bad("linkedin", "maya-okafor");
bad("linkedin", "linkedin.com/feed");
bad("linkedin", "evil.com/in/maya");
bad("linkedin", "linkedin.com.evil.com/in/maya");
bad("linkedin", "javascript:alert(1)");

ok("x", "@maya_ok", "https://x.com/maya_ok");
ok("x", "maya_ok", "https://x.com/maya_ok");
ok("x", "https://twitter.com/maya_ok", "https://x.com/maya_ok");
ok("x", "x.com/maya_ok/status/123", "https://x.com/maya_ok");
bad("x", "a-very-long-handle-that-is-too-long");
bad("x", "x.com/home");
bad("x", "facebook.com/maya");
bad("x", "javascript:alert(1)");

ok("instagram", "@maahir_patel21", "https://www.instagram.com/maahir_patel21");
ok("instagram", "maya.okafor", "https://www.instagram.com/maya.okafor");
ok("instagram", "instagram.com/maya.okafor/", "https://www.instagram.com/maya.okafor");
bad("instagram", "instagram.com/p/Cxyz");
bad("instagram", "maya okafor");

assert.equal(socialDisplay("linkedin", "https://www.linkedin.com/in/maya-okafor"), "in/maya-okafor");
assert.equal(socialDisplay("x", "https://x.com/maya_ok"), "@maya_ok");
passed += 2;

console.log(`profile social: ${passed} passed`);
