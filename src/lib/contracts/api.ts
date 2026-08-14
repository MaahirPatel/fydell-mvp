/**
 * Shared success/error envelope. Frontend never branches on raw provider text.
 */

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "not_configured"
  | "provider_failed"
  | "analysis_failed"
  | "cross_tenant"
  | "internal";

export interface ApiErrorBody {
  ok: false;
  code: ApiErrorCode;
  message: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export interface ApiOkBody<T> {
  ok: true;
  data: T;
}

export type ApiEnvelope<T> = ApiOkBody<T> | ApiErrorBody;
