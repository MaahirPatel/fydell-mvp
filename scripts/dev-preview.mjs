/**
 * Starts the dev server with the synthetic employer fixtures enabled, so the
 * signed-in application can be designed and audited without a database.
 *
 *   npm run dev:preview              populated workspace
 *   npm run dev:preview -- --empty   brand-new workspace
 *   npm run dev:preview -- --port 3200
 *
 * The fixtures refuse to load when NODE_ENV is production, so this cannot leak
 * into a deployed build. See src/lib/dev/preview.ts.
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const empty = args.includes("--empty");
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? args[portIndex + 1] : "3000";

const child = spawn("npx", ["next", "dev", "--port", port], {
  stdio: "inherit",
  // Required on Windows, where npx resolves to a .cmd shim that Node refuses
  // to spawn directly.
  shell: true,
  env: {
    ...process.env,
    FYDELL_UI_PREVIEW: "1",
    FYDELL_UI_PREVIEW_STATE: empty ? "empty" : "active",
  },
});

console.log(
  `\n  Fydell UI preview: ${empty ? "empty" : "populated"} workspace on port ${port}.` +
    `\n  All employer data is synthetic. Do not use for anything but design and QA.\n`
);

child.on("exit", (code) => process.exit(code ?? 0));
