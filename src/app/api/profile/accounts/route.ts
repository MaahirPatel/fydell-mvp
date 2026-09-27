import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { connectAccount, disconnectAccount, listAccounts } from "@/lib/profile/store";
import type { ConnectedAccountProvider } from "@/lib/profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Connected-account registry.
 *
 * NOTE: GitHub OAuth is a follow-up. Today "connect GitHub" means: the
 * engineer runs the existing paste-flow extraction (profile page reuses the
 * passport builder), and on success the client registers the account here
 * with meta { login, repos }. Re-sync re-runs extraction for the stored repos.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ accounts: await listAccounts(user.id) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    provider?: unknown;
    label?: unknown;
    meta?: unknown;
  } | null;
  const provider = body?.provider as ConnectedAccountProvider | undefined;
  if (provider !== "github" && provider !== "vscode" && provider !== "cursor") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }
  if (typeof body?.label !== "string" || !body.label.trim()) {
    return NextResponse.json({ error: "A label is required (e.g. your GitHub username)." }, { status: 400 });
  }
  const meta =
    body?.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : {};
  try {
    const account = await connectAccount(user.id, provider, body.label, meta);
    return NextResponse.json({ account });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not connect the account." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") as ConnectedAccountProvider | null;
  const label = url.searchParams.get("label") ?? undefined;
  if (provider !== "github" && provider !== "vscode" && provider !== "cursor") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }
  const removed = await disconnectAccount(user.id, provider, label);
  return NextResponse.json({ removed });
}
