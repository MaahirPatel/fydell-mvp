import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SANDBOX_COOKIE = "fydell_sandbox_cap";
const MAX_AGE = 60 * 60 * 24;

function secret(): Uint8Array {
  const value = process.env.FYDELL_SANDBOX_SIGNING_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("Missing FYDELL_SANDBOX_SIGNING_SECRET or NEXTAUTH_SECRET");
  return new TextEncoder().encode(value);
}

export function hashCapabilitySecret(secretValue: string): string {
  return createHash("sha256").update(secretValue).digest("hex");
}

export function createCapabilitySecret(): { secret: string; hash: string } {
  const value = randomBytes(32).toString("hex");
  return { secret: value, hash: hashCapabilitySecret(value) };
}

export async function signCapabilityCookie(runId: string, capabilitySecret: string): Promise<string> {
  return new SignJWT({ runId, cap: capabilitySecret })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function readCapability(): Promise<{ runId: string; secret: string } | null> {
  const store = await cookies();
  const token = store.get(SANDBOX_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const runId = typeof payload.runId === "string" ? payload.runId : null;
    const cap = typeof payload.cap === "string" ? payload.cap : null;
    if (!runId || !cap) return null;
    return { runId, secret: cap };
  } catch {
    return null;
  }
}

export async function writeCapabilityCookie(runId: string, capabilitySecret: string): Promise<void> {
  const token = await signCapabilityCookie(runId, capabilitySecret);
  const store = await cookies();
  store.set(SANDBOX_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearCapabilityCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SANDBOX_COOKIE);
}

export function hashIp(ip: string): string {
  const salt = process.env.FYDELL_SANDBOX_IP_SALT || process.env.NEXTAUTH_SECRET || "sandbox-ip";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
