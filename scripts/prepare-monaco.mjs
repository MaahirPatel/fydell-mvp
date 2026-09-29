import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/monaco/', root), { recursive: true });
await cp(fileURLToPath(new URL('node_modules/monaco-editor/min/vs/', root)), fileURLToPath(new URL('public/monaco/vs/', root)), { recursive: true });
console.log('Monaco assets prepared for same-origin loading.');
