import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ArtifactKind =
  | "submission"
  | "receipt"
  | "report"
  | "profile_snapshot"
  | "portable_receipt"
  | "finding"
  | "handoff";

export type PermissionClass = "private" | "shared" | "portable";

export type ArtifactEnvelope = {
  id: string;
  kind: ArtifactKind;
  subject: string;
  organizationId: string | null;
  applicationRef: string | null;
  sourceTable: string;
  sourceId: string;
  sourceVersion: string | null;
  contentDigest: string | null;
  acquiredAt: string;
  permissionClass: PermissionClass;
  retentionState: string;
  supersededBy: string | null;
};

/**
 * Wrap an artifact in a §18 envelope. Idempotent per (source_table, source_id).
 */
export async function envelopeArtifact(input: {
  kind: ArtifactKind;
  subject: string;
  organizationId?: string | null;
  applicationRef?: string;
  sourceTable: string;
  sourceId: string;
  sourceVersion?: string;
  contentDigest?: string;
  permissionClass?: PermissionClass;
  createdBy?: string;
}): Promise<ArtifactEnvelope> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("artifact_envelopes")
    .upsert(
      {
        kind: input.kind,
        subject: input.subject.trim().slice(0, 200),
        organization_id: input.organizationId ?? null,
        application_ref: input.applicationRef ?? null,
        source_table: input.sourceTable,
        source_id: input.sourceId,
        source_version: input.sourceVersion ?? null,
        content_digest: input.contentDigest ?? null,
        permission_class: input.permissionClass ?? "private",
        created_by: input.createdBy ?? null,
      },
      { onConflict: "source_table,source_id" },
    )
    .select("*")
    .single();
  if (error || !data) throw new Error(`Could not envelope artifact: ${error?.message ?? "unknown"}`);
  const r = data as Record<string, string | null>;
  return {
    id: r.id as string,
    kind: r.kind as ArtifactKind,
    subject: r.subject as string,
    organizationId: r.organization_id,
    applicationRef: r.application_ref,
    sourceTable: r.source_table as string,
    sourceId: r.source_id as string,
    sourceVersion: r.source_version,
    contentDigest: r.content_digest,
    acquiredAt: r.acquired_at as string,
    permissionClass: r.permission_class as PermissionClass,
    retentionState: r.retention_state as string,
    supersededBy: r.superseded_by,
  };
}

/** Mark an envelope as superseded by a newer one. */
export async function supersedeEnvelope(envelopeId: string, supersededById: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from("artifact_envelopes").update({ superseded_by: supersededById }).eq("id", envelopeId);
}
