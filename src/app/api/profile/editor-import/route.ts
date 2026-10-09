import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { MAX_UPLOAD_BYTES, parseEditorUpload } from "@/lib/profile/editor-import/parse";
import { listEditorImports, saveEditorImport } from "@/lib/profile/store";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Editor-history import prototype.
 *
 * The engineer uploads a file from their own machine (VS Code
 * `state.vscdb` / `storage.json`, a Local History `entries.json`, or the
 * Cursor equivalents). We parse it, store ONLY the extracted summary, and
 * discard the raw file. Explicit consent is required on every upload, and
 * the result is always labeled provenance 'local-import' - self-supplied,
 * not independently observed.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ imports: await listEditorImports(user.id) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to import editor history." }, { status: 401 });
  const limited = limitByUser(user.id, ROUTE_LIMITS.importJob);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as multipart form data." }, { status: 400 });
  }

  const source = form.get("source");
  if (source !== "vscode" && source !== "cursor") {
    return NextResponse.json({ error: "Choose which editor this history comes from: vscode or cursor." }, { status: 400 });
  }
  if (form.get("consent") !== "yes") {
    return NextResponse.json(
      { error: "Confirm that you want to share this local history with Fydell before uploading." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a history file to import." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Files larger than 10 MB are not accepted." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseEditorUpload(file.name || "upload", buffer, source);
  // The raw upload is dropped here - only the extracted summary is stored.
  const saved = await saveEditorImport(user.id, source, parsed);
  return NextResponse.json({ import: saved, warnings: parsed.warnings });
}
