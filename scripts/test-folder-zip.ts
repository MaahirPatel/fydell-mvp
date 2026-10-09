import { unzipSync } from "fflate";
import { zipFolder } from "../src/lib/passport/folder-zip";
import { analyzeUpload } from "../src/lib/passport/upload";

let failures = 0;
function ok(name: string, pass: boolean) {
  console.log(`${pass ? "  ok  " : "  FAIL"} ${name}`);
  if (!pass) failures++;
}

function picked(path: string, body = "x", size?: number): File {
  const file = new File([size ? new Uint8Array(size) : body], path.split("/").pop() ?? path);
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

async function main() {
  const result = await zipFolder([
    picked("my-app/src/index.ts", "export const a = 1;"),
    picked("my-app/README.md", "# my app"),
    picked("my-app/node_modules/react/index.js"),
    picked("my-app/.git/config"),
    picked("my-app/.env", "SECRET=1"),
    picked("my-app/.env.local", "SECRET=1"),
    picked("my-app/keys/server.pem"),
    picked("my-app/logo.png"),
    picked("my-app/big.json", "", 2 * 1024 * 1024),
    picked("my-app/.next/build.js"),
  ]);
  ok("folder packs", result.ok);
  if (result.ok) {
    const names = Object.keys(unzipSync(new Uint8Array(await result.file.arrayBuffer()))).sort();
    ok("only source files are packed, with the top folder stripped", JSON.stringify(names) === JSON.stringify(["README.md", "src/index.ts"]));
    ok("name comes from the folder", result.name === "my-app" && result.file.name === "my-app.zip");
    ok("dependency and build folders counted", result.skipped.dependency_or_build === 3);
    ok("secrets counted", result.skipped.possible_secret === 3);
    ok("binary or large counted", result.skipped.not_source === 2);
  }
  const empty = await zipFolder([picked("x/node_modules/a.js"), picked("x/.env")]);
  ok("a folder with nothing readable is refused", empty.ok === false);

  const many = Array.from({ length: 400 }, (_, i) => picked(`big/src/module${i}.ts`, `export const v${i} = ${i};`));
  const large = await zipFolder([picked("big/package.json", '{"name":"big"}'), picked("big/tests/app.test.ts", "test('x',()=>{})"), ...many]);
  ok("a large project packs the 300 files that will be read", large.ok && large.included === 300 && large.skipped.over_limit === 102);
  if (large.ok) {
    const names = Object.keys(unzipSync(new Uint8Array(await large.file.arrayBuffer())));
    ok("manifest and tests are kept ahead of the cap", names.includes("package.json") && names.includes("tests/app.test.ts"));
    const analysis = analyzeUpload(new Uint8Array(await large.file.arrayBuffer()), { ownerId: "00000000-0000-0000-0000-000000000001", name: "big" });
    ok("the server accepts the packed folder and reads every packed file", analysis.ok && analysis.result.coverage.analyzedFiles === 300);
  }
  if (failures > 0) process.exit(1);
}

void main();
