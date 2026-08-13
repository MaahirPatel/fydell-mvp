import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Emitted by `npm run build:sim` / `build:sim:node`. Bundled output, not source.
      "sim-engine.js",
      "sim-engine.cjs",
      // Vendored agent skills. Third-party files we do not author or ship.
      ".cursor/**",
      ".agents/**",
      ".codex/**",
    ],
  },
  {
    // Node tooling that predates ESM here and is executed directly by node,
    // not bundled. `require` is the correct call in these files.
    files: ["**/*.cjs", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
