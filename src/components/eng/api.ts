export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; problems: string[]; body: Record<string, unknown> | null };

/**
 * JSON request to an engineering route. Network failures are reported as a
 * status of 0 so callers can tell "offline" apart from a refused request.
 */
export async function engFetch<T>(url: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: init?.signal,
    });
  } catch {
    return { ok: false, status: 0, error: "You appear to be offline. Nothing was lost; try again when the connection is back.", problems: [], body: null };
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error = typeof body?.error === "string" ? body.error : `The request failed (${res.status}).`;
    const problems = Array.isArray(body?.problems) ? body.problems.filter((p): p is string => typeof p === "string") : [];
    return { ok: false, status: res.status, error, problems, body };
  }
  return { ok: true, data: body as T };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
