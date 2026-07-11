/**
 * Generate a strong transitional ADMIN_PASSWORD and print setup instructions.
 * Does NOT write secrets to git. Optionally updates .env.local if --write is passed.
 *
 *   npx tsx scripts/set-admin-password.ts
 *   npx tsx scripts/set-admin-password.ts --write
 */
import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*+-";
  const bytes = randomBytes(24);
  let out = "";
  for (let i = 0; i < 24; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

const write = process.argv.includes("--write");
const email = process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@fydell.com";
const password = generatePassword();

console.log("\n=== Fydell admin portal credentials ===\n");
console.log(`URL:      https://www.fydell.com/admin`);
console.log(`Email:    ${email}`);
console.log(`Password: ${password}`);
console.log("\nThis password is for the transitional env gate (ADMIN_PASSWORD).");
console.log("It is NOT stored in the database and is NOT a Supabase Auth password.");
console.log("After login, platform_user_roles must include an active role for this email.\n");

if (write) {
  const envPath = join(process.cwd(), ".env.local");
  let contents = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = contents.split(/\r?\n/);
  const set = (key: string, value: string) => {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    const line = `${key}=${value}`;
    if (idx >= 0) lines[idx] = line;
    else lines.push(line);
  };
  set("ADMIN_EMAIL", email);
  set("ADMIN_PASSWORD", password);
  set("BOOTSTRAP_ADMIN_EMAIL", email);
  set("ADMIN_NOTIFICATION_EMAIL", email);
  writeFileSync(envPath, lines.filter((l, i, arr) => l !== "" || i < arr.length - 1).join("\n") + "\n", "utf8");
  console.log("Updated .env.local (gitignored). Also set the same values in Vercel.\n");
} else {
  console.log("Re-run with --write to save into .env.local, then copy to Vercel env vars.\n");
}
