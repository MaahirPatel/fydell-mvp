import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  getSupabaseAdmin,
  getSupabaseAuthClient,
  isSupabaseAuthConfigured,
  isSupabaseConfigured
} from "../supabase";
import type { Profile, Workspace } from "./types";

// ---------------------------------------------------------------------------
// MVP employer auth.
//
// Signup/login is backed by Supabase Auth (auth.users), with a 1:1 public
// `profiles` row, a default workspace, and an `owner` workspace membership.
// The session itself is a signed, httpOnly JWT cookie (jose) so the rest of
// the app can read it cheaply without a Supabase round-trip on every request.
//
// All writes use the service-role admin client (server-only). The anon client
// is used solely to verify a password during login (signInWithPassword).
// ---------------------------------------------------------------------------

const MVP_COOKIE = "fydell_mvp";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): Uint8Array {
  const s = process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error(
      "Missing session secret. Set NEXTAUTH_SECRET in .env.local for signed sessions."
    );
  }
  return new TextEncoder().encode(s);
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE
};

export interface MvpSession {
  userId: string;
  email: string;
}

export async function createMvpSession(userId: string, email: string): Promise<void> {
  const token = await new SignJWT({ role: "mvp_employer", userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(sessionSecret());
  (await cookies()).set(MVP_COOKIE, token, cookieOpts);
}

export async function getMvpSession(): Promise<MvpSession | null> {
  const value = (await cookies()).get(MVP_COOKIE)?.value;
  if (!value) return null;
  try {
    const { payload } = await jwtVerify(value, sessionSecret());
    if (payload.role !== "mvp_employer") return null;
    return { userId: String(payload.userId), email: String(payload.email) };
  } catch {
    return null;
  }
}

export async function clearMvpSession(): Promise<void> {
  (await cookies()).delete(MVP_COOKIE);
}

export interface SignupInput {
  email: string;
  password: string;
  fullName?: string;
  companyName?: string;
}

export interface AuthedProfile {
  profile: Profile;
  workspace: Workspace;
}

/**
 * Employer signup: creates the auth user, the profile, a default workspace and
 * an `owner` membership. Idempotent-ish: if the auth user already exists we
 * surface a friendly error instead of throwing a raw Supabase error.
 */
export async function mvpSignup(input: SignupInput): Promise<AuthedProfile> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured in this environment. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  const email = input.email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName ?? null }
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Could not create account.";
    if (/already.*registered|exists/i.test(msg)) {
      throw new Error("An account with this email already exists.");
    }
    throw new Error(msg);
  }

  const userId = created.user.id;
  const companyName = input.companyName?.trim() || "Your workspace";

  // profile (1:1 with auth.users)
  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: input.fullName ?? null,
        role: "employer",
        company_name: input.companyName?.trim() || null
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();
  if (profErr) throw new Error(profErr.message);

  // default workspace + owner membership
  const { data: workspace, error: wsErr } = await admin
    .from("workspaces")
    .insert({ name: companyName, created_by: userId })
    .select("*")
    .single();
  if (wsErr) throw new Error(wsErr.message);

  const { error: memErr } = await admin.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner"
  });
  if (memErr) throw new Error(memErr.message);

  await createMvpSession(userId, email);
  return { profile: profile as Profile, workspace: workspace as Workspace };
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Verify a password via the anon client, then load the profile. */
export async function mvpLogin(input: LoginInput): Promise<Profile> {
  if (!isSupabaseAuthConfigured()) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  const email = input.email.trim().toLowerCase();
  const auth = getSupabaseAuthClient();
  const { data, error } = await auth.auth.signInWithPassword({
    email,
    password: input.password
  });
  if (error || !data.user) {
    throw new Error("Invalid email or password.");
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  // Self-heal: if an auth user exists without a profile, create a minimal one.
  if (!profile) {
    const { data: healed } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, role: "employer" }, { onConflict: "id" })
      .select("*")
      .single();
    await createMvpSession(data.user.id, email);
    return healed as Profile;
  }

  await createMvpSession(data.user.id, email);
  return profile as Profile;
}
