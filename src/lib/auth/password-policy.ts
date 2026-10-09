export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 256;

const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword",
  "12345678", "123456789", "1234567890", "11111111", "00000000", "87654321", "12341234",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "asdfasdf", "zxcvbnm1", "1q2w3e4r",
  "iloveyou", "letmein1", "welcome1", "welcome123", "admin123", "abc12345", "abcd1234",
  "sunshine", "football", "baseball", "superman", "trustno1", "changeme", "monkey123",
  "fydell123", "fydellpassword",
]);

/** Returns why a new password is not acceptable, or null when it is. */
export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "That password is too easy to guess. Choose a less common one.";
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  if (local.length >= 4 && lower.includes(local)) return "Do not use your email address in your password.";
  return null;
}
