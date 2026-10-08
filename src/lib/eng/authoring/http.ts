import "server-only";
import { after, type NextResponse } from "next/server";
import { engAdmin, jsonError, requireEngAction, type Admin, type EngMember, type Gate } from "../context";
import { errorResponse, isUuid } from "../http";
import type { EngAction } from "../permissions";
import { AuthoringError, processJob } from "./jobs";

export function authoringError(err: unknown, scope: string): NextResponse {
  if (err instanceof AuthoringError) return jsonError(err.status, err.message);
  return errorResponse(err, `authoring:${scope}`);
}

export async function authoringGate(action: EngAction): Promise<Gate<{ db: Admin; member: EngMember }>> {
  const gate = await requireEngAction(action);
  if (gate.ok === false) return gate;
  return { ok: true, value: { db: engAdmin(), member: gate.value } };
}

export function validId(id: string): NextResponse | null {
  return isUuid(id) ? null : jsonError(404, "Not found.");
}

/** Continues a job after the response is sent. Idempotent: the lease decides who makes progress. */
export function kickJob(db: Admin, jobId: string): void {
  after(async () => {
    try {
      await processJob(db, jobId);
    } catch (error) {
      console.error(`[authoring-job] kick ${jobId}`, error);
    }
  });
}
