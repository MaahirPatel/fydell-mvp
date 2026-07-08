import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Signed HTTP-only cookie sessions (admin + employer) using jose / NEXTAUTH_SECRET
// ---------------------------------------------------------------------------

const ADMIN_COOKIE = "fydell_admin";
const EMPLOYER_COOKIE = "fydell_employer";
const COMPANY_COOKIE = "fydell_company";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Missing NEXTAUTH_SECRET. Set it in .env.local.");
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

interface AdminAccount {
  email: string;
  password: string;
}

function adminAccounts(): AdminAccount[] {
  const accounts: AdminAccount[] = [];
  // Primary account
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    accounts.push({
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      password: process.env.ADMIN_PASSWORD
    });
  }
  // Additional accounts via ADMIN_ACCOUNTS=email:pass,email:pass
  for (const pair of (process.env.ADMIN_ACCOUNTS ?? "").split(",")) {
    const [email, password] = pair.split(":");
    if (email && password) {
      const e = email.trim().toLowerCase();
      if (!accounts.some((a) => a.email === e)) {
        accounts.push({ email: e, password: password.trim() });
      }
    }
  }
  return accounts;
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  return adminAccounts().some((a) => a.email === e && a.password === password);
}

export async function createAdminSession(email: string): Promise<void> {
  const token = await sign({ role: "admin", email: email.toLowerCase() });
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts);
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = await verify<{ role: string; email: string }>(token);
  if (!payload || payload.role !== "admin") return null;
  return { email: payload.email };
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

// ---------------------------------------------------------------------------
// Employer
// ---------------------------------------------------------------------------

export async function createEmployerSession(
  employerId: string,
  token: string
): Promise<void> {
  const jwt = await sign({ role: "employer", employerId, token });
  (await cookies()).set(EMPLOYER_COOKIE, jwt, cookieOpts);
}

export async function getEmployerSession(): Promise<{
  employerId: string;
  token: string;
} | null> {
  const value = (await cookies()).get(EMPLOYER_COOKIE)?.value;
  const payload = await verify<{
    role: string;
    employerId: string;
    token: string;
  }>(value);
  if (!payload || payload.role !== "employer") return null;
  return { employerId: payload.employerId, token: payload.token };
}

// ---------------------------------------------------------------------------
// Company platform users
// ---------------------------------------------------------------------------

export async function createCompanySession(userId: string, email: string): Promise<void> {
  const token = await sign({ role: "company", userId, email });
  (await cookies()).set(COMPANY_COOKIE, token, cookieOpts);
}

export async function getCompanySession(): Promise<{ userId: string; email: string } | null> {
  const value = (await cookies()).get(COMPANY_COOKIE)?.value;
  const payload = await verify<{ role: string; userId: string; email: string }>(value);
  if (!payload || payload.role !== "company") return null;
  return { userId: payload.userId, email: payload.email };
}

export async function clearCompanySession(): Promise<void> {
  (await cookies()).delete(COMPANY_COOKIE);
}
