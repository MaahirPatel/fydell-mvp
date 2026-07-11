import "server-only";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type PilotRequestInput = {
  name: string;
  email: string;
  company: string;
  role: string;
  candidates?: string;
  note?: string;
  source?: string;
};

export type PilotRequestRecord = {
  id: string;
  created_at: string;
};

type LocalPilotRow = {
  id: string;
  name: string;
  email: string;
  company: string;
  role_title: string;
  candidate_volume: string | null;
  note: string | null;
  source: string;
  status: string;
  created_at: string;
};

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "pilot-requests.json");

function readLocal(): LocalPilotRow[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as LocalPilotRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: LocalPilotRow[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

/**
 * Persist a pilot lead. Prefer Supabase (service role, RLS-locked table).
 * Fall back to a server-only local file when Supabase is not configured —
 * never exposed via a public GET API.
 */
export async function savePilotRequest(
  input: PilotRequestInput
): Promise<PilotRequestRecord> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("pilot_requests")
      .insert({
        name: input.name,
        email: input.email,
        company: input.company,
        role_title: input.role,
        candidate_volume: input.candidates || null,
        note: input.note || null,
        source: input.source || "request-pilot",
        status: "new",
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(
        error.message.includes("pilot_requests") || error.code === "42P01"
          ? "Pilot request storage is not ready. Apply migration 003_pilot_requests.sql in Supabase."
          : error.message
      );
    }

    return { id: data.id as string, created_at: data.created_at as string };
  }

  const row: LocalPilotRow = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    company: input.company,
    role_title: input.role,
    candidate_volume: input.candidates || null,
    note: input.note || null,
    source: input.source || "request-pilot",
    status: "new",
    created_at: new Date().toISOString(),
  };
  const rows = readLocal();
  rows.unshift(row);
  writeLocal(rows);
  return { id: row.id, created_at: row.created_at };
}
