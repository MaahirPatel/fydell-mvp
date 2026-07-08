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

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "platform.json");

interface Store {
  users: CompanyUser[];
  simulations: GeneratedSimulation[];
  roles: CompanyRole[];
}

function ensureStore(): Store {
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
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export async function createUser(
  email: string,
  password: string,
  companyName: string
): Promise<CompanyUser> {
  const normalized = email.trim().toLowerCase();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  if (supabaseReady()) {
    const existing = await dbGetUserByEmail(normalized);
    if (existing) throw new Error("An account with this email already exists.");
    return dbCreateUser(normalized, passwordHash, salt, companyName);
  }

  const store = ensureStore();
  if (store.users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists.");
  }
  const user: CompanyUser = {
    id: randomBytes(12).toString("hex"),
    email: normalized,
    passwordHash,
    passwordSalt: salt,
    companyName: companyName.trim(),
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
  const user = supabaseReady()
    ? await dbGetUserByEmail(normalized)
    : ensureStore().users.find((u) => u.email === normalized) ?? null;
  if (!user) return null;
  const hash = hashPassword(password, user.passwordSalt);
  return hash === user.passwordHash ? user : null;
}

export async function getUserById(id: string): Promise<CompanyUser | null> {
  if (supabaseReady()) return dbGetUserById(id);
  return ensureStore().users.find((u) => u.id === id) ?? null;
}

export async function completeOnboarding(
  userId: string,
  answers: OnboardingAnswers
): Promise<CompanyUser> {
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

  const store = ensureStore();
  return store.simulations
    .filter((s) => s.companyUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSimulation(id: string): Promise<GeneratedSimulation | null> {
  if (supabaseReady()) return dbGetSimulation(id);
  const store = ensureStore();
  return store.simulations.find((s) => s.id === id) ?? null;
}

export async function listRolesForUser(userId: string): Promise<CompanyRole[]> {
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
  const store = ensureStore();
  if (!store.roles) return false;
  const idx = store.roles.findIndex((r) => r.id === roleId && r.companyUserId === userId);
  if (idx < 0) return false;
  store.roles.splice(idx, 1);
  saveStore(store);
  return true;
}
