/**
 * The installed app's project folder packager must produce exactly what the
 * server accepts: the starter project, edited, with caches, virtual
 * environments, credentials and nested archives left out.
 *
 * Run: npx tsx scripts/test-project-folder.ts
 */
import { strToU8 } from "fflate";
import { packageProjectFolder, FolderError, type ProjectDirectory } from "../src/components/eng/projectFolder";
import { inspectArchive } from "../src/lib/eng/zip";
import { STARTER_FILES } from "../src/lib/eng/scenarios/backend-webhook-retry/starter.generated";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed += 1;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

type Tree = { [name: string]: Tree | Uint8Array };

function dir(name: string, tree: Tree): ProjectDirectory {
  const handle: ProjectDirectory = {
    kind: "directory",
    name,
    async getDirectoryHandle(child) {
      const node = tree[child];
      if (!node || node instanceof Uint8Array) throw new Error("NotFoundError");
      return dir(child, node);
    },
    async getFileHandle(child) {
      const node = tree[child];
      if (!(node instanceof Uint8Array)) throw new Error("NotFoundError");
      return {
        kind: "file",
        name: child,
        getFile: async () => new File([new Uint8Array(node)], child),
        createWritable: async () => {
          throw new Error("read only in this test");
        },
      };
    },
    async *values() {
      for (const [child, node] of Object.entries(tree)) {
        if (node instanceof Uint8Array) yield await handle.getFileHandle(child);
        else yield dir(child, node);
      }
    },
  };
  return handle;
}

function starterTree(): Tree {
  const root: Tree = {};
  for (const [path, body] of Object.entries(STARTER_FILES)) {
    const parts = path.split("/");
    let node = root;
    for (const p of parts.slice(0, -1)) node = (node[p] ??= {}) as Tree;
    node[parts[parts.length - 1]] = strToU8(body);
  }
  return root;
}

async function main() {
  console.log("project folder packaging");

  const tree = starterTree();
  const webhooks = tree.webhooks as Tree;
  webhooks["dispatcher.py"] = strToU8(`${STARTER_FILES["webhooks/dispatcher.py"]}\n# candidate change\n`);
  tree[".venv"] = { lib: { "site.py": strToU8("x = 1\n") } };
  tree["__pycache__"] = { "a.cpython-312.pyc": new Uint8Array([1, 2, 3]) };
  tree[".git"] = { HEAD: strToU8("ref: refs/heads/main\n") };
  tree[".env"] = strToU8("SECRET=do-not-send\n");
  tree["notes.zip"] = new Uint8Array([80, 75, 3, 4]);
  tree["NOTES.md"] = strToU8("Assumption: retries cap at five.\n");

  const pkg = await packageProjectFolder(dir("harbor-webhooks", tree), "harbor-webhooks");
  const paths = pkg.included.map((f) => f.path);
  check("includes the edited source file", paths.includes("webhooks/dispatcher.py"));
  check("includes a new file the candidate added", paths.includes("NOTES.md"));
  check("leaves out the virtual environment", !paths.some((p) => p.startsWith(".venv/")) && pkg.excluded.some((e) => e.path === ".venv/" && e.reason === "ignored_folder"));
  check("leaves out caches and .git", !paths.some((p) => p.startsWith("__pycache__/") || p.startsWith(".git/")));
  check("leaves out the credentials file", !paths.includes(".env") && pkg.excluded.some((e) => e.path === ".env" && e.reason === "possible_secret"));
  check("leaves out nested archives", !paths.includes("notes.zip") && pkg.excluded.some((e) => e.path === "notes.zip" && e.reason === "nested_archive"));
  check("names the archive after the project", pkg.file.name === "harbor-webhooks.zip");

  const verdict = inspectArchive(new Uint8Array(await pkg.file.arrayBuffer()), "backend-webhook-retry");
  check("the server's upload check accepts the package", verdict.ok, verdict.ok ? "" : verdict.message);
  if (verdict.ok) {
    const sent = new TextDecoder().decode(verdict.contents.get("webhooks/dispatcher.py"));
    check("the server reads the candidate's edit", sent.includes("# candidate change"));
    check("the server sees no secrets", !verdict.contents.has(".env"));
  }

  const big: Tree = { ...starterTree(), "data.bin": new Uint8Array(1024 * 1024 + 1) };
  const tooBig = await packageProjectFolder(dir("harbor-webhooks", big), "harbor-webhooks").then(
    () => null,
    (err: unknown) => err
  );
  check("refuses a file over 1 MB with a plain message", tooBig instanceof FolderError && tooBig.message.includes("data.bin"));

  const empty = await packageProjectFolder(dir("empty", { ".git": { HEAD: strToU8("x") } }), "harbor-webhooks").then(
    () => null,
    (err: unknown) => err
  );
  check("refuses a folder with nothing to submit", empty instanceof FolderError);

  if (failed > 0) {
    console.log(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nproject folder packaging passed");
}

void main();
