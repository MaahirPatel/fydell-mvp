// CJS preload: stub "server-only" (which throws on import outside Next.js)
// so pure sim libs can be exercised by tsx tests. No production code path
// uses this file.
const Module = require("node:module");
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return origLoad.call(this, request, parent, isMain);
};
