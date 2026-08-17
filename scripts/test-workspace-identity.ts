/**
 * Identity resolution tests. The account area must show what the person
 * entered at signup, never an invented name or an unsafe image reference.
 * Run via `npm run test:unit`.
 */
import {
  avatarUrlFrom,
  displayNameFrom,
  initialsFrom,
  memberIdentity,
} from "../src/lib/workspace/identity";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}${
      ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`
    }`,
  );
}

console.log("\nprefers the name given at signup");
check(
  "full_name wins",
  displayNameFrom({ full_name: "Jane Doe", display_name: "jd" }, { full_name: "Other" }),
  "Jane Doe",
);
check(
  "display_name is used when full_name is absent",
  displayNameFrom({ display_name: "Jane D" }),
  "Jane D",
);
check(
  "auth metadata is used when the profile row is missing",
  displayNameFrom(null, { full_name: "Jane Doe" }),
  "Jane Doe",
);
check("blank names are not names", displayNameFrom({ full_name: "   " }), "");
check("no name on record returns empty", displayNameFrom(null, null), "");
check(
  "non-string metadata is ignored",
  displayNameFrom(null, { full_name: 42, name: { first: "Jane" } }),
  "",
);

console.log("\nonly accepts image references it can render safely");
check(
  "https avatar is kept",
  avatarUrlFrom({ avatar_url: "https://cdn.example.com/a.png" }),
  "https://cdn.example.com/a.png",
);
check(
  "provider picture is used as a fallback",
  avatarUrlFrom(null, { picture: "https://cdn.example.com/p.png" }),
  "https://cdn.example.com/p.png",
);
check("javascript urls are refused", avatarUrlFrom({ avatar_url: "javascript:alert(1)" }), null);
check(
  "data urls are refused",
  avatarUrlFrom({ avatar_url: "data:image/svg+xml,<svg onload=alert(1)>" }),
  null,
);
check("relative paths are refused", avatarUrlFrom({ avatar_url: "/uploads/a.png" }), null);
check("no avatar returns null", avatarUrlFrom(null, null), null);

console.log("\nfalls back to initials rather than inventing a name");
check("two words", initialsFrom("Jane Doe", "jane@example.com"), "JD");
check("three words uses first and last", initialsFrom("Ada B Lovelace", "a@b.com"), "AL");
check("one word", initialsFrom("Prince", "p@example.com"), "PR");
check("no name uses the email local part", initialsFrom("", "jane.doe@example.com"), "JD");
check("no name and no email", initialsFrom("", ""), "?");

console.log("\ncombines into what the account area renders");
const resolved = memberIdentity(
  "jane@example.com",
  { full_name: "Jane Doe", avatar_url: null },
  null,
);
check("name", resolved.name, "Jane Doe");
check("email", resolved.email, "jane@example.com");
check("avatar", resolved.avatarUrl, null);
check("initials", resolved.initials, "JD");

if (failures > 0) {
  console.error(`\n${failures} identity check(s) failed`);
  process.exit(1);
}
console.log("\nall identity checks passed");
