export type ApiResult<T> = { ok: true; status: number; data: T; error?: undefined } | { ok: false; status: number; error: string; data?: undefined };

/** JSON fetch for the authoring API. Never throws; network failures come back as an error result. */
export async function api<T>(url: string, init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; signal?: AbortSignal }): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init?.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, status: 0, error: "aborted" };
    return { ok: false, status: 0, error: "Could not reach the server. Check your connection and try again." };
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `The request failed (${res.status}).`;
    return { ok: false, status: res.status, error: message };
  }
  return { ok: true, status: res.status, data: payload as T };
}
