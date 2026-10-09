import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireUser } from "@/lib/simulations/auth";
import { ZIP_LIMITS } from "@/lib/eng/zip";
import { analyzeUpload } from "@/lib/passport/upload";
import { saveProjectVersion } from "@/lib/passport/store";
import { accountDisplayName } from "@/lib/auth/account-name";
import { issueSnapshotReceipt } from "@/lib/receipts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/passport/uploads - multipart form: file (.zip), name, intent,
 * contentHash?
 *
 * intent=preview analyzes in memory and returns what would be read and what
 * is left out, storing nothing. intent=save repeats the analysis and saves
 * it only if the content hash matches the preview the engineer confirmed.
 */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to add projects to your Passport.", code: "unauthorized" }, { status: 401 });
  if (!rateLimit(`passport-upload:${user.id}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many uploads in the last hour. Try again later.", code: "rate_limited" }, { status: 429 });
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > ZIP_LIMITS.maxArchiveBytes + 64 * 1024) {
    return NextResponse.json({ error: "The archive is larger than 5 MB. Leave out dependency folders, build output and data files.", code: "too_large" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "The upload could not be read. Choose the file again.", code: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v.trim() : "";
  };
  const intent = text("intent") === "save" ? "save" : "preview";
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a .zip file of the project.", code: "missing_file" }, { status: 400 });
  }
  if (file.size > ZIP_LIMITS.maxArchiveBytes) {
    return NextResponse.json({ error: "The archive is larger than 5 MB. Leave out dependency folders, build output and data files.", code: "too_large" }, { status: 413 });
  }

  const analysis = analyzeUpload(new Uint8Array(await file.arrayBuffer()), { ownerId: user.id, name: text("name") });
  if (analysis.ok === false) {
    return NextResponse.json({ error: analysis.error.message, code: analysis.error.code, path: "path" in analysis.error ? analysis.error.path : undefined }, { status: 422 });
  }
  const { preview, result } = analysis;

  if (intent === "preview") {
    const skipReasons: Record<string, number> = {};
    for (const s of preview.skipped) skipReasons[s.reason] = (skipReasons[s.reason] ?? 0) + 1;
    return NextResponse.json({
      preview: {
        name: preview.name,
        contentHash: preview.contentHash,
        totalFiles: preview.totalFiles,
        selectedFiles: preview.selectedFiles.slice(0, 200),
        selectedCount: preview.selectedFiles.length,
        skipReasons,
        skippedSample: preview.skipped.slice(0, 50),
      },
    });
  }

  if (text("contentHash") !== preview.contentHash) {
    return NextResponse.json(
      { error: "The file changed since you reviewed it. Review the new contents before saving.", code: "preview_mismatch" },
      { status: 409 },
    );
  }
  try {
    const saved = await saveProjectVersion(
      { id: user.id, displayName: await accountDisplayName(user.id, user.email) },
      null,
      result,
      "",
    );
    const receipt = await issueSnapshotReceipt(user.id, saved.projectId, null);
    return NextResponse.json(
      { projectId: saved.projectId, reusedExistingVersion: saved.reusedExistingVersion, receiptId: receipt.id },
      { status: saved.reusedExistingVersion ? 200 : 201 },
    );
  } catch {
    return NextResponse.json({ error: "The project could not be saved or its receipt recorded. Saving again is safe and will not duplicate it.", code: "save_failed" }, { status: 500 });
  }
}
