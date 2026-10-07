/** JSON request from a hiring form. Never throws; network failures come back as an error message. */
export async function send<T extends object>(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string; data: Partial<T> & { existingId?: string } }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; existingId?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong. Nothing was saved; try again.", data };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Couldn't reach Fydell. Check your connection; nothing was saved.", data: {} };
  }
}
