import "server-only";
import { randomUUID, createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { enqueueEmail } from "@/lib/ops/email-outbox";
import { adminNotificationEmail, hashIp, writeAudit } from "@/lib/ops/platform-roles";
import { appUrl } from "@/lib/app-url";

export type PublicPilotInput = {
  name: string;
  email: string;
  company: string;
  role: string;
  candidates?: string;
  note?: string;
  source?: string;
  sourceUrl?: string;
  referrerUrl?: string;
  userAgent?: string;
  ip?: string | null;
};

export type PublicPilotResult = {
  publicReference: string;
  createdAt: string;
  workEmail: string;
  duplicate?: boolean;
};

type LocalRow = {
  id: string;
  public_reference: string;
  name: string;
  email: string;
  company: string;
  role_title: string;
  candidate_volume: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "pilot-requests-ops.json");

function parseCandidateCount(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.replace(/,/g, "").match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return n;
}

function nextLocalReference(rows: LocalRow[]): string {
  const year = new Date().getUTCFullYear();
  const seq = rows.length + 1;
  return `FYD-${year}-${String(seq).padStart(6, "0")}`;
}

function readLocal(): LocalRow[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as LocalRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: LocalRow[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2), "utf8");
}

async function queuePilotEmails(row: {
  id: string;
  public_reference: string;
  full_name: string;
  work_email: string;
  company_name: string;
  role_being_hired: string;
}) {
  const siteUrl = appUrl();
  const payload = {
    fullName: row.full_name,
    workEmail: row.work_email,
    companyName: row.company_name,
    roleBeingHired: row.role_being_hired,
    publicReference: row.public_reference,
    siteUrl,
    adminUrl: `${siteUrl}/admin/pilot-requests/${row.id}`,
  };

  await enqueueEmail({
    eventType: "pilot_request_acknowledgment",
    templateKey: "pilot_request_received",
    recipientEmail: row.work_email,
    recipientName: row.full_name,
    payload,
    relatedEntityType: "pilot_request",
    relatedEntityId: row.id,
    idempotencyKey: `pilot-request-confirmation:${row.id}`,
    priority: 10,
  });

  await enqueueEmail({
    eventType: "admin_new_pilot_request",
    templateKey: "admin_new_pilot_request",
    recipientEmail: adminNotificationEmail(),
    recipientName: "Fydell Admin",
    payload,
    relatedEntityType: "pilot_request",
    relatedEntityId: row.id,
    idempotencyKey: `admin-new-pilot-request:${row.id}`,
    priority: 5,
  });
}

/**
 * Durable public pilot submission.
 * Success only after a durable row exists (Supabase preferred).
 */
export async function createPublicPilotRequest(
  input: PublicPilotInput
): Promise<PublicPilotResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const company = input.company.trim();
  const role = input.role.trim();
  const candidates = input.candidates?.trim() || null;
  const note = input.note?.trim() || null;
  const ipHash = hashIp(input.ip);

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();

    // Deduplicate same email+company within 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("pilot_requests")
      .select("id, public_reference, created_at, work_email, full_name, company_name, role_being_hired")
      .eq("work_email", email)
      .ilike("company_name", company)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.public_reference) {
      await admin.from("pilot_request_events").insert({
        pilot_request_id: existing.id,
        event_type: "duplicate_submission",
        description: "Duplicate public submission within 24 hours",
        metadata: { note, role, candidates },
      });
      return {
        publicReference: existing.public_reference,
        createdAt: existing.created_at,
        workEmail: existing.work_email || email,
        duplicate: true,
      };
    }

    const insertRow = {
      name,
      email,
      company,
      role_title: role,
      candidate_volume: candidates,
      note,
      source: input.source || "request-pilot",
      status: "new",
      full_name: name,
      work_email: email,
      company_name: company,
      role_being_hired: role,
      number_of_candidates: parseCandidateCount(candidates || undefined),
      message: note,
      source_url: input.sourceUrl || null,
      referrer_url: input.referrerUrl || null,
      user_agent: input.userAgent || null,
      ip_hash: ipHash,
      landing_page: input.sourceUrl || null,
      priority: "normal",
      acknowledgment_email_status: "pending",
      admin_notification_status: "pending",
    };

    const { data, error } = await admin
      .from("pilot_requests")
      .insert(insertRow)
      .select(
        "id, public_reference, created_at, work_email, full_name, company_name, role_being_hired"
      )
      .single();

    if (error || !data?.public_reference) {
      throw new Error(error?.message || "Could not store pilot request");
    }

    await admin.from("pilot_request_events").insert({
      pilot_request_id: data.id,
      event_type: "request_created",
      new_status: "new",
      description: "Public pilot request stored",
    });

    await writeAudit({
      actorEmail: email,
      action: "pilot_request_created",
      entityType: "pilot_request",
      entityId: data.id,
      after: {
        public_reference: data.public_reference,
        company: company,
        role,
      },
      ipHash,
      userAgent: input.userAgent || null,
    });

    try {
      await queuePilotEmails({
        id: data.id,
        public_reference: data.public_reference,
        full_name: data.full_name || name,
        work_email: data.work_email || email,
        company_name: data.company_name || company,
        role_being_hired: data.role_being_hired || role,
      });
      await admin
        .from("pilot_requests")
        .update({
          acknowledgment_email_status: "queued",
          admin_notification_status: "queued",
        })
        .eq("id", data.id);
      await admin.from("pilot_request_events").insert([
        {
          pilot_request_id: data.id,
          event_type: "acknowledgment_queued",
          description: "Prospect confirmation email queued",
        },
        {
          pilot_request_id: data.id,
          event_type: "admin_notification_queued",
          description: "Admin notification email queued",
        },
      ]);
    } catch {
      // Request remains durable even if email queueing fails.
      await admin.from("pilot_request_events").insert({
        pilot_request_id: data.id,
        event_type: "email_queue_failed",
        description: "Request stored; email queueing failed and can be retried",
      });
    }

    return {
      publicReference: data.public_reference,
      createdAt: data.created_at,
      workEmail: data.work_email || email,
    };
  }

  // Local durable fallback for development without Supabase service role.
  // Production must use Supabase — this path is intentionally restricted.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error(
      "Pilot request storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const rows = readLocal();
  const recent = rows.find(
    (r) =>
      r.email === email &&
      r.company.toLowerCase() === company.toLowerCase() &&
      Date.now() - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000
  );
  if (recent) {
    return {
      publicReference: recent.public_reference,
      createdAt: recent.created_at,
      workEmail: recent.email,
      duplicate: true,
    };
  }

  const row: LocalRow = {
    id: randomUUID(),
    public_reference: nextLocalReference(rows),
    name,
    email,
    company,
    role_title: role,
    candidate_volume: candidates,
    note,
    status: "new",
    created_at: new Date().toISOString(),
  };
  rows.unshift(row);
  writeLocal(rows);
  return {
    publicReference: row.public_reference,
    createdAt: row.created_at,
    workEmail: email,
  };
}

export async function listPilotRequests(limit = 100) {
  if (!isSupabaseConfigured()) {
    return readLocal().slice(0, limit).map((r) => ({
      id: r.id,
      public_reference: r.public_reference,
      full_name: r.name,
      work_email: r.email,
      company_name: r.company,
      role_being_hired: r.role_title,
      status: r.status,
      priority: "normal",
      acknowledgment_email_status: "pending",
      admin_notification_status: "pending",
      created_at: r.created_at,
      number_of_candidates: null as number | null,
      assigned_admin_id: null as string | null,
    }));
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("pilot_requests")
    .select(
      "id, public_reference, full_name, work_email, company_name, role_being_hired, status, priority, acknowledgment_email_status, admin_notification_status, created_at, number_of_candidates, assigned_admin_id, candidate_volume, message"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getPilotRequest(id: string) {
  if (!isSupabaseConfigured()) {
    const row = readLocal().find((r) => r.id === id);
    return row || null;
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("pilot_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePilotRequestStatus(input: {
  id: string;
  status: string;
  actorEmail: string;
  note?: string;
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is required");
  const admin = getSupabaseAdmin();
  const current = await getPilotRequest(input.id);
  if (!current) throw new Error("Request not found");

  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === "contacted") patch.first_contacted_at = new Date().toISOString();
  if (input.status === "qualified") patch.qualified_at = new Date().toISOString();
  if (input.status === "approved") patch.approved_at = new Date().toISOString();
  if (input.status === "rejected") patch.rejected_at = new Date().toISOString();

  const { error } = await admin.from("pilot_requests").update(patch).eq("id", input.id);
  if (error) throw error;

  await admin.from("pilot_request_events").insert({
    pilot_request_id: input.id,
    event_type: "status_changed",
    old_status: current.status,
    new_status: input.status,
    description: input.note || `Status changed to ${input.status}`,
  });

  await writeAudit({
    actorEmail: input.actorEmail,
    action: "pilot_request_status_changed",
    entityType: "pilot_request",
    entityId: input.id,
    before: { status: current.status },
    after: { status: input.status },
  });
}

// Keep legacy helper shape for older imports
export async function savePilotRequest(input: {
  name: string;
  email: string;
  company: string;
  role: string;
  candidates?: string;
  note?: string;
  source?: string;
}) {
  const result = await createPublicPilotRequest(input);
  return {
    id: createHash("sha256").update(result.publicReference).digest("hex").slice(0, 32),
    created_at: result.createdAt,
    public_reference: result.publicReference,
  };
}
