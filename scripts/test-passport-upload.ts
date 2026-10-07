/**
 * Uploaded-project import: archive safety, exclusions, stable identity,
 * redaction, and (with --live) the save path against the dev database.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-passport-upload.ts [--live]
 */
import { randomUUID } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import { analyzeUpload, uploadRepoId, uploadSlug, UPLOAD_NOTICE } from "@/lib/passport/upload";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

const FAKE_TOKEN = `ghp_${"a1B2".repeat(9)}`;
const PROJECT: Record<string, string> = {
  "requirements.txt": "fastapi==0.110\npydantic==2.6\n",
  "app/worker.py": [
    "def handle(event, store):",
    `    token = "${FAKE_TOKEN}"`,
    "    if store.already_processed(event.id):",
    "        return None",
    "    store.mark(event.id)",
    "    return event",
  ].join("\n"),
  "tests/test_worker.py": "def test_skips_duplicates():\n    assert True\n",
  ".env": "DATABASE_URL=postgres://user:secret@db/prod\n",
  "node_modules/left-pad/index.js": "module.exports = 1;\n",
  "assets/archive.zip": "not really a zip",
};

function zip(files: Record<string, string>, root = "my-project/"): Uint8Array {
  const tree: Zippable = {};
  for (const [path, text] of Object.entries(files)) tree[`${root}${path}`] = strToU8(text);
  return zipSync(tree);
}

const OWNER = "00000000-0000-4000-8000-000000000001";

function unitTests() {
  console.log("Archive and analysis");
  const a = analyzeUpload(zip(PROJECT), { ownerId: OWNER, name: "My Project" });
  check("a normal project archive is accepted", a.ok);
  if (!a.ok) return;
  const paths = a.preview.selectedFiles.map((f) => f.path);
  check("a shared top-level folder is removed from paths", paths.includes("app/worker.py"), paths.join(", "));
  check(".env is left out and never read", !paths.includes(".env") && a.preview.skipped.some((s) => s.path === ".env" && s.reason === "possible_secret"));
  check("dependency folders are left out", !paths.some((p) => p.startsWith("node_modules")));
  check("nested archives are left out", a.preview.skipped.some((s) => s.path === "assets/archive.zip"));
  check("the name becomes a slug", a.preview.name === "my-project");
  check("the revision is a 40-character content hash", /^[0-9a-f]{40}$/.test(a.result.commitSha ?? ""));
  check("the project id is negative so it can't collide with GitHub", (a.result.repository?.id ?? 0) < 0);
  check("the source URL is empty, never a fake GitHub link", a.result.findings.every((f) => f.sourceUrl === "") && a.result.repository?.htmlUrl === "");
  check("the upload notice is attached", a.result.notices.includes(UPLOAD_NOTICE));
  const detectors = a.result.findings.map((f) => f.detector);
  check("the idempotency guard is found", detectors.includes("idempotency_guard"), detectors.join(", "));
  check("the test suite is found", detectors.includes("test_suite"));
  const excerpts = a.result.findings.flatMap((f) => f.excerpt).join("\n");
  check("a token in a cited file is redacted", !excerpts.includes(FAKE_TOKEN));
  check("no .env content reaches the manifest as included", !a.result.manifest?.some((m) => m.path === ".env" && m.included));

  const reordered = Object.fromEntries(Object.entries(PROJECT).reverse());
  const b = analyzeUpload(zip(reordered, "renamed-folder/"), { ownerId: OWNER, name: "my-project" });
  check("same files in another order and folder give the same revision", b.ok && b.result.commitSha === a.result.commitSha);
  const changed = analyzeUpload(zip({ ...PROJECT, "app/new.py": "x = 1\n" }), { ownerId: OWNER, name: "my-project" });
  check("changed files give a new revision under the same project id", changed.ok && changed.result.commitSha !== a.result.commitSha && changed.result.repository?.id === a.result.repository?.id);
  check("the same name for another engineer is a different project id", uploadRepoId(OWNER, "my-project") !== uploadRepoId(randomUUID(), "my-project"));

  console.log("Rejections");
  const slip = analyzeUpload(zipSync({ "../evil.py": strToU8("x = 1") }), { ownerId: OWNER, name: "evil" });
  check("a path escaping the folder is rejected", !slip.ok && slip.error.code === "unsafe_path");
  const link = analyzeUpload(zipSync({ "proj/link": [strToU8("/etc/passwd"), { os: 3, attrs: (0o120777 << 16) >>> 0 }] }), { ownerId: OWNER, name: "link" });
  check("a symbolic link is rejected", !link.ok && link.error.code === "symlink");
  const notZip = analyzeUpload(strToU8("plain text, not an archive"), { ownerId: OWNER, name: "text" });
  check("a non-ZIP file is rejected", !notZip.ok && notZip.error.code === "not_a_zip");
  const onlySecrets = analyzeUpload(zipSync({ ".env": strToU8("A=1") }), { ownerId: OWNER, name: "secrets" });
  check("an archive of only credentials is rejected as empty", !onlySecrets.ok && onlySecrets.error.code === "missing_source");
  const big = analyzeUpload(new Uint8Array(6 * 1024 * 1024), { ownerId: OWNER, name: "big" });
  check("an archive over 5 MB is rejected", !big.ok && big.error.code === "too_large");
  const bomb = analyzeUpload(zipSync({ "p/a.py": new Uint8Array(900 * 1024) }, { level: 9 }), { ownerId: OWNER, name: "bomb" });
  check("an entry with an extreme compression ratio is rejected", !bomb.ok && bomb.error.code === "compression_ratio");
  check("a name without letters is rejected", uploadSlug("--") === null && !analyzeUpload(zip(PROJECT), { ownerId: OWNER, name: "!" }).ok);
}

async function liveTest() {
  console.log("Live save (dev database)");
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { saveProjectVersion, getOwnerPassport } = await import("@/lib/passport/store");
  const admin = createAdminSupabaseClient();
  const tag = randomUUID().slice(0, 8);
  const { data, error } = await admin.auth.admin.createUser({ email: `upload+${tag}@example.com`, password: `T-${randomUUID()}`, email_confirm: true });
  if (error || !data.user) throw new Error("Could not create a test user.");
  const userId = data.user.id;
  try {
    const a = analyzeUpload(zip(PROJECT), { ownerId: userId, name: "my-project" });
    if (!a.ok) throw new Error("analysis failed");
    const first = await saveProjectVersion({ id: userId, displayName: "upload-test" }, null, a.result, "I wrote the worker.");
    check("the upload saves as a project", !first.reusedExistingVersion);
    const again = await saveProjectVersion({ id: userId, displayName: "upload-test" }, null, a.result, "");
    check("saving the same content again reuses the version", again.reusedExistingVersion && again.projectId === first.projectId);
    const passport = await getOwnerPassport(userId);
    const project = passport?.projects.find((p) => p.id === first.projectId);
    check("it reads back as an uploaded project", project?.sourceKind === "upload", project?.sourceKind);
    check("its findings have no external link", !!project && project.evidence.length > 0 && project.evidence.every((e) => e.sourceUrl === ""));
    check("the contribution statement is kept", project?.contributionStatement === "I wrote the worker.");
    const { data: row } = await admin.from("passport_projects").select("importer_version,source_kind").eq("id", first.projectId).single();
    check("the importer version records the upload path", (row as { importer_version: string } | null)?.importer_version === "local-upload-v1");
  } finally {
    const { data: pp } = await admin.from("passports").select("id").eq("owner_id", userId).maybeSingle();
    if (pp) await admin.from("passports").delete().eq("id", (pp as { id: string }).id);
    await admin.from("engineer_profiles").delete().eq("owner_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  unitTests();
  if (process.argv.includes("--live")) await liveTest();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
