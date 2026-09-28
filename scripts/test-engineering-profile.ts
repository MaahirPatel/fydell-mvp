/**
 * Engineering Profile hub tests: evidence aggregation, provenance labeling,
 * and the local editor-history importer prototype.
 *
 * Pure in-process tests: no Supabase, no network, no database. The SQLite
 * parse path is exercised for real — the test builds an actual state.vscdb
 * file with node:sqlite and runs it through the importer. DB-backed store
 * functions (src/lib/profile/store.ts) and the upload API route are not
 * executed here (no Postgres in this environment); the migration
 * 029_engineering_profiles.sql is reviewed but not applied.
 *
 * Run via `npm run test:profile`
 * (tsx --conditions react-server).
 */
import { writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { aggregateTimeline, publicTimelineItem } from "../src/lib/profile/aggregate";
import {
  PROVENANCE_LABELS,
  isProvenance,
  type TimelineItem,
} from "../src/lib/profile/types";
import {
  detectUploadKind,
  languageFromPath,
  parseEditorUpload,
  parseJsonHistory,
} from "../src/lib/profile/editor-import/parse";

let count = 0;
let failures = 0;
function check(label: string, cond: boolean, detail = ""): void {
  count++;
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function item(partial: Partial<TimelineItem> & { id: string }): TimelineItem {
  return {
    kind: "simulation",
    title: "t",
    detail: "d",
    occurredAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    provenance: "observed-simulation",
    url: null,
    meta: {},
    ...partial,
  };
}

// --- aggregateTimeline -------------------------------------------------------

const items = [
  item({ id: "old", occurredAt: "2026-01-01T00:00:00Z" }),
  item({ id: "new", occurredAt: "2026-03-01T00:00:00Z" }),
  item({ id: "mid", occurredAt: "2026-02-01T00:00:00Z" }),
];
const ordered = aggregateTimeline(items);
check("timeline sorts newest first", ordered.map((i) => i.id).join(",") === "new,mid,old");
check("timeline does not mutate input", items[0].id === "old");

const tieA = item({ id: "a", kind: "github-project", occurredAt: "2026-02-01T00:00:00Z" });
const tieB = item({ id: "b", kind: "editor-import", occurredAt: "2026-02-01T00:00:00Z" });
const tie1 = aggregateTimeline([tieB, tieA]).map((i) => i.id).join(",");
const tie2 = aggregateTimeline([tieA, tieB]).map((i) => i.id).join(",");
check("timeline tiebreak is deterministic", tie1 === tie2 && tie1.length === 3);

const prov = item({ id: "p", provenance: "local-import" });
check("timeline preserves provenance", aggregateTimeline([prov])[0].provenance === "local-import");
check("timeline empty input", aggregateTimeline([]).length === 0);

// --- publicTimelineItem ------------------------------------------------------

const editorItem = item({
  id: "ed",
  kind: "editor-import",
  provenance: "local-import",
  meta: { filesTouched: [{ path: "/secret/proj/x.ts" }], languages: ["TypeScript"], sessionCount: 3 },
});
const pub = publicTimelineItem(editorItem);
check(
  "public view strips file paths from editor imports",
  !("filesTouched" in pub.meta) && (pub.meta.languages as string[]).join() === "TypeScript",
);
const simItem = item({ id: "s", kind: "simulation", meta: { submissionId: "x" } });
check("public view leaves simulation items untouched", publicTimelineItem(simItem).meta.submissionId === "x");

// --- provenance vocabulary ---------------------------------------------------

for (const p of ["observed-simulation", "repository-observation", "local-import"] as const) {
  check(`provenance label exists: ${p}`, typeof PROVENANCE_LABELS[p].short === "string" && PROVENANCE_LABELS[p].short.length > 0);
  check(`isProvenance accepts ${p}`, isProvenance(p));
}
check("isProvenance rejects unknown", !isProvenance("verified-blockchain"));
check("local-import detail says not independently observed", /not independently observed/i.test(PROVENANCE_LABELS["local-import"].detail));

// --- detectUploadKind --------------------------------------------------------

const sqliteMagic = Buffer.concat([Buffer.from("SQLite format 3\0", "binary"), Buffer.alloc(100)]);
check("detect: sqlite magic", detectUploadKind("state.vscdb", sqliteMagic) === "sqlite");
check("detect: .json extension", detectUploadKind("storage.json", Buffer.from("{}")) === "json");
check("detect: json content sniff", detectUploadKind("data", Buffer.from('  { "a": 1 }')) === "json");
check("detect: non-sqlite .vscdb is unknown", detectUploadKind("state.vscdb", Buffer.from("not sqlite")) === "unknown");
check("detect: random binary is unknown", detectUploadKind("blob.bin", Buffer.from([0x89, 0x50, 0x4e, 0x47])) === "unknown");

// --- parseJsonHistory: VS Code storage.json -----------------------------------

const storageJson = JSON.stringify({
  "history.recentlyOpenedPathsList": [
    { fileUri: "file:///home/ada/fydell/src/index.ts" },
    { folderUri: "file:///home/ada/fydell" },
    { fileUri: "vscode-remote://ssh/home/ada/remote.py" },
  ],
});
const storage = parseJsonHistory(storageJson, "vscode");
check("storage.json: extracts file paths", storage.filesTouched.some((f) => f.path === "/home/ada/fydell/src/index.ts"));
check("storage.json: extracts folder paths", storage.filesTouched.some((f) => f.path === "/home/ada/fydell"));
check("storage.json: skips non-file schemes", !storage.filesTouched.some((f) => f.path.includes("remote.py")));
check("storage.json: infers languages", storage.languages.includes("TypeScript"));
check("storage.json: parseMethod names the recognized key", /history\.recentlyOpenedPathsList/.test(storage.parseMethod));
check("storage.json: provenance is local-import", storage.provenance === "local-import");

// --- parseJsonHistory: Local History entries.json ------------------------------

const day1 = Date.parse("2026-09-20T10:00:00Z");
const day2 = Date.parse("2026-09-22T15:00:00Z");
const entriesJson = JSON.stringify({
  version: 1,
  resource: "file:///home/ada/fydell/src/app.py",
  entries: [{ id: "a", timestamp: day1 }, { id: "b", timestamp: day2 }, { id: "c", timestamp: "not-a-time" }],
});
const entries = parseJsonHistory(entriesJson, "vscode");
const appPy = entries.filesTouched.find((f) => f.path === "/home/ada/fydell/src/app.py");
check("entries.json: counts edits", appPy?.edits === 2);
check("entries.json: last touch", appPy?.lastTouchedAt === new Date(day2).toISOString());
check("entries.json: time range", entries.timeRangeStart === new Date(day1).toISOString() && entries.timeRangeEnd === new Date(day2).toISOString());
check("entries.json: session count is distinct days", entries.sessionCount === 2);
check("entries.json: language Python", entries.languages.includes("Python"));
check("entries.json: parseMethod mentions Local History", /Local History/.test(entries.parseMethod));

// --- parseJsonHistory: bad input ------------------------------------------------

const bad = parseJsonHistory("{nope", "cursor");
check("invalid json: no files", bad.filesTouched.length === 0);
check("invalid json: warns", bad.warnings.length > 0);
check("invalid json: parseMethod says rejected", /not valid JSON/i.test(bad.parseMethod));
check("invalid json: keeps source", bad.source === "cursor");

const empty = parseJsonHistory("{}", "vscode");
check("empty json: warns nothing recognized", empty.warnings.some((w) => /no file references/i.test(w)));

const heuristicOnly = parseJsonHistory(JSON.stringify({ someKey: [{ uri: "file:///tmp/notes.md" }] }), "vscode");
check("heuristic scan finds file URIs in unknown shapes", heuristicOnly.filesTouched.some((f) => f.path === "/tmp/notes.md"));
check("heuristic scan is labeled heuristic", /heuristic/i.test(heuristicOnly.parseMethod));

// --- parseEditorUpload: real SQLite state.vscdb ----------------------------------
async function main(): Promise<void> {
const dir = join(tmpdir(), `fydell-profile-test-${Date.now()}`);
mkdirSync(dir, { recursive: true });
const vscdbPath = join(dir, "state.vscdb");
{
  const db = new DatabaseSync(vscdbPath);
  db.exec("CREATE TABLE ItemTable(key TEXT PRIMARY KEY, value BLOB)");
  const ins = db.prepare("INSERT INTO ItemTable VALUES (?, ?)");
  ins.run(
    "history.recentlyOpenedPathsList",
    JSON.stringify([{ fileUri: "file:///home/ada/proj/main.go" }, { fileUri: "file:///home/ada/proj/go.mod" }]),
  );
  ins.run("composer.chatSessions", JSON.stringify([{ files: ["file:///home/ada/proj/main.go"] }]));
  ins.run("workbench.colorTheme", JSON.stringify("Default Dark+"));
  db.close();
}
const vscdbBuf = readFileSync(vscdbPath);
const vscdbParsed = await parseEditorUpload("state.vscdb", vscdbBuf, "vscode");
check("vscdb: opens real sqlite", vscdbParsed.filesTouched.some((f) => f.path === "/home/ada/proj/main.go"));
check("vscdb: heuristic composer key scanned", /composer\.chatSessions/.test(vscdbParsed.parseMethod));
check("vscdb: ignored keys reported", /workbench\.colorTheme/.test(vscdbParsed.parseMethod));
check("vscdb: language Go inferred", vscdbParsed.languages.includes("Go"));
check("vscdb: provenance local-import", vscdbParsed.provenance === "local-import");
rmSync(dir, { recursive: true, force: true });

// Non-ItemTable sqlite is honestly rejected.
const dir2 = join(tmpdir(), `fydell-profile-test2-${Date.now()}`);
mkdirSync(dir2, { recursive: true });
{
  const db = new DatabaseSync(join(dir2, "other.db"));
  db.exec("CREATE TABLE SomethingElse(x TEXT)");
  db.close();
}
const otherBuf = readFileSync(join(dir2, "other.db"));
const otherParsed = await parseEditorUpload("other.db", otherBuf, "cursor");
check("non-state sqlite: no files extracted", otherParsed.filesTouched.length === 0);
check("non-state sqlite: warned", otherParsed.warnings.some((w) => /no ItemTable/i.test(w)));
rmSync(dir2, { recursive: true, force: true });

// Empty and unrecognized uploads.
const emptyParsed = await parseEditorUpload("x.json", Buffer.alloc(0), "vscode");
check("empty upload: rejected with warning", emptyParsed.filesTouched.length === 0 && /empty/i.test(emptyParsed.parseMethod));
const unknownParsed = await parseEditorUpload("notes.txt", Buffer.from("hello"), "vscode");
check("unknown upload: rejected", unknownParsed.filesTouched.length === 0 && /unrecognized/i.test(unknownParsed.parseMethod));

// --- languageFromPath ------------------------------------------------------------

check("language: ts", languageFromPath("/a/b/c.ts") === "TypeScript");
check("language: Dockerfile", languageFromPath("/a/Dockerfile") === "Docker");
check("language: unknown ext", languageFromPath("/a/b.xyz") === null);
check("language: no ext", languageFromPath("/a/Makefile") === null);
}

main().then(() => {
  console.log(`\n${count - failures}/${count} checks passed`);
  if (failures > 0) process.exit(1);
});
