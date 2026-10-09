import { access, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/monaco/', root), { recursive: true });
await cp(fileURLToPath(new URL('node_modules/monaco-editor/min/vs/', root)), fileURLToPath(new URL('public/monaco/vs/', root)), { recursive: true });
// The editor boots from these two files. A build without them deploys an editor that can never load.
for (const file of ['public/monaco/vs/loader.js', 'public/monaco/vs/editor/editor.main.js']) {
  try {
    await access(new URL(file, root));
  } catch {
    console.error(`Monaco asset missing after copy: ${file}`);
    process.exit(1);
  }
}
console.log('Monaco assets prepared for same-origin loading.');
