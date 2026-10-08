/** JSON request from an evidence form. Never throws; failures come back as a message. */
export async function request<T extends object>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Something went wrong. Nothing was saved; try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Couldn't reach Fydell. Check your connection; nothing was saved." };
  }
}
