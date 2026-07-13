import "server-only";
import { createHash, randomBytes } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type {
  CompanyRole,
  CompanyUser,
  GeneratedSimulation,
  OnboardingAnswers
} from "./platform-types";
import {
  dbCompleteOnboarding,
  dbCreateUser,
  dbGetSimulation,
  dbGetUserByEmail,
  dbGetUserById,
  dbListSimulations,
  dbSaveSimulation,
  supabaseReady
} from "./platform-db";
import {
  getSupabaseAuthClient,
  isSupabaseAuthConfigured
} from "./supabase";
import { isMvpRpcConfigured } from "./mvp/rpc";
import * as rpc from "./mvp/rpc";
import { appUrl } from "./app-url";

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "platform.json");

interface Store {
  users: CompanyUser[];
  simulations: GeneratedSimulation[];
  roles: CompanyRole[];
}

function useAuthBackend(): boolean {
  return isSupabaseAuthConfigured() && isMvpRpcConfigured();
}

function assertNotReadonlyFileStore() {
  if (process.env.VERCEL) {
    throw new Error(
      "Account storage requires Supabase on production. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and FYDELL_MVP_DB_SECRET."
    );
  }
}

function ensureStore(): Store {
  assertNotReadonlyFileStore();
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(STORE_PATH)) {
    const empty: Store = { users: [], simulations: [], roles: [] };
    writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
  const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
  if (!parsed.roles) parsed.roles = [];
  return parsed;
}

function saveStore(store: Store) {
  assertNotReadonlyFileStore();
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function profileToUser(row: Record<string, unknown>): CompanyUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: "",
    passwordSalt: "",
    companyName: String(row.company_name || "Your workspace"),
    createdAt: String(row.created_at || new Date().toISOString()),
    onboardingComplete: Boolean(row.onboarding_complete),
    onboarding: (row.onboarding as OnboardingAnswers) || undefined
  };
}

export async function createUser(
  email: string,
  password: string,
  companyName: string
): Promise<CompanyUser> {
  const normalized = email.trim().toLowerCase();
  const company = companyName.trim() || "Your workspace";

  if (useAuthBackend()) {
    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.signUp({
      email: normalized,
      password,
      options: {
        data: {
          company_name: company,
          role: "company",
          username: company
        }
      }
    });

    if (error) {
      const msg = error.message || "Could not create account.";
      // #region agent log
      fetch('http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc0a6c'},body:JSON.stringify({sessionId:'dc0a6c',runId:'auth-pre',hypothesisId:'A',location:'platform-store.ts:createUser:signUp-error',message:'supabase signUp error',data:{msg:String(msg).slice(0,200)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (/already|registered|exists/i.test(msg)) {
        throw new Error("An account with this email already exists.");
      }
      throw new Error(msg);
    }

    const userId = data.user?.id;
    // #region agent log
    fetch('http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc0a6c'},body:JSON.stringify({sessionId:'dc0a6c',runId:'auth-pre',hypothesisId:'A',location:'platform-store.ts:createUser:after-signUp',message:'supabase signUp returned',data:{hasUserId:Boolean(userId),hasSession:Boolean(data.session),identities:Array.isArray(data.user?.identities)?data.user!.identities.length:null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!userId) {
      throw new Error("Could not create account. Try signing in or use a different email.");
    }

    // Profile is created so the account is durable even if session setup is deferred.
    const row = await rpc.rpcUpsertCompanyProfile({
      userId,
      email: normalized,
      companyName: company
    });
    await rpc.rpcEnsureWorkspace(userId, company);
    return profileToUser(row);
  }

  if (supabaseReady()) {
    const existing = await dbGetUserByEmail(normalized);
    if (existing) throw new Error("An account with this email already exists.");
    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    return dbCreateUser(normalized, passwordHash, salt, company);
  }

  const store = ensureStore();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists.");
  }
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const user: CompanyUser = {
    id: randomBytes(12).toString("hex"),
    email: normalized,
    passwordHash,
    passwordSalt: salt,
    companyName: company,
    createdAt: new Date().toISOString(),
    onboardingComplete: false
  };
  store.users.push(user);
  saveStore(store);
  return user;
}

export async function verifyUser(
  email: string,
  password: string
): Promise<CompanyUser | null> {
  const normalized = email.trim().toLowerCase();

  if (useAuthBackend()) {
    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.signInWithPassword({
      email: normalized,
      password
    });
    if (error || !data.user) {
      // #region agent log
      fetch('http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc0a6c'},body:JSON.stringify({sessionId:'dc0a6c',runId:'auth-pre',hypothesisId:'A',location:'platform-store.ts:verifyUser:signIn-error',message:'supabase signIn failed',data:{hasError:Boolean(error),msg:String(error?.message||'').slice(0,200)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return null;
    }

    let row = await rpc.rpcGetCompanyProfile(data.user.id);
    if (!row) {
      const meta = data.user.user_metadata || {};
      const company =
        String(meta.company_name || meta.workspace || meta.username || "Your workspace");
      row = await rpc.rpcUpsertCompanyProfile({
        userId: data.user.id,
        email: normalized,
        companyName: company
      });
      await rpc.rpcEnsureWorkspace(data.user.id, company);
    }
    return profileToUser(row);
  }

  const user = supabaseReady()
    ? await dbGetUserByEmail(normalized)
    : ensureStore().users.find((u) => u.email === normalized) ?? null;
  if (!user) return null;
  const hash = hashPassword(password, user.passwordSalt);
  return hash === user.passwordHash ? user : null;
}

export async function getUserById(id: string): Promise<CompanyUser | null> {
  if (useAuthBackend()) {
    const row = await rpc.rpcGetCompanyProfile(id);
    return row ? profileToUser(row) : null;
  }
  if (supabaseReady()) return dbGetUserById(id);
  return ensureStore().users.find((u) => u.id === id) ?? null;
}

export async function completeOnboarding(
  userId: string,
  answers: OnboardingAnswers
): Promise<CompanyUser> {
  if (useAuthBackend()) {
    const row = await rpc.rpcCompleteCompanyOnboarding(
      userId,
      answers as unknown as Record<string, unknown>
    );
    return profileToUser(row);
  }
  if (supabaseReady()) return dbCompleteOnboarding(userId, answers);

  const store = ensureStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  user.onboarding = answers;
  user.onboardingComplete = true;
  saveStore(store);
  return user;
}

export async function saveSimulation(
  sim: GeneratedSimulation
): Promise<GeneratedSimulation> {
  if (supabaseReady()) return dbSaveSimulation(sim);

  const store = ensureStore();
  store.simulations.push(sim);
  saveStore(store);
  return sim;
}

export async function listSimulationsForUser(
  userId: string
): Promise<GeneratedSimulation[]> {
  if (supabaseReady()) return dbListSimulations(userId);

  if (process.env.VERCEL) return [];
  const store = ensureStore();
  return store.simulations
    .filter((s) => s.companyUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSimulation(id: string): Promise<GeneratedSimulation | null> {
  if (supabaseReady()) return dbGetSimulation(id);
  if (process.env.VERCEL) return null;
  const store = ensureStore();
  return store.simulations.find((s) => s.id === id) ?? null;
}

export async function listRolesForUser(userId: string): Promise<CompanyRole[]> {
  if (process.env.VERCEL) return [];
  const store = ensureStore();
  if (!store.roles) store.roles = [];
  return store.roles
    .filter((r) => r.companyUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRole(
  userId: string,
  input: { title: string; department?: string; level?: string; skills?: string[] }
): Promise<CompanyRole> {
  if (process.env.VERCEL) {
    throw new Error("Role storage is not available yet on production. Use the Meridian dashboard invites for now.");
  }
  const store = ensureStore();
  if (!store.roles) store.roles = [];
  const role: CompanyRole = {
    id: randomBytes(10).toString("hex"),
    companyUserId: userId,
    title: input.title.trim(),
    department: input.department?.trim() || undefined,
    level: input.level?.trim() || undefined,
    skills: (input.skills || []).filter(Boolean).slice(0, 8),
    createdAt: new Date().toISOString()
  };
  store.roles.push(role);
  saveStore(store);
  return role;
}

export async function deleteRole(userId: string, roleId: string): Promise<boolean> {
  if (process.env.VERCEL) return false;
  const store = ensureStore();
  if (!store.roles) return false;
  const idx = store.roles.findIndex((r) => r.id === roleId && r.companyUserId === userId);
  if (idx < 0) return false;
  store.roles.splice(idx, 1);
  saveStore(store);
  return true;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isSupabaseAuthConfigured()) {
    throw new Error("Password reset requires Supabase Auth to be configured.");
  }
  const auth = getSupabaseAuthClient();
  const redirectTo = `${appUrl()}/auth/update-password`;
  const { error } = await auth.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo
  });
  if (error) throw new Error(error.message);
}
