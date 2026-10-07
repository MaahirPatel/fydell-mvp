/**
 * Provider config tests: env parsing, defaults, fail-closed behavior.
 * Run: npx tsx scripts/test-provider-config.ts
 */
import { getProviderConfig, describeProvider, buildChatBody } from "../src/lib/ai/provider";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok: ${name}`); }
  else { failed++; console.log(`  FAIL: ${name}`); }
}

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

console.log("no provider configured -> null (fail closed)");
withEnv({ MODEL_PROVIDER: undefined, OPENAI_API_KEY: undefined }, () => {
  check("returns null", getProviderConfig() === null);
  check("describe says none", describeProvider().startsWith("none"));
});

console.log("openai default with key");
withEnv({ MODEL_PROVIDER: undefined, OPENAI_API_KEY: "sk-test" }, () => {
  const c = getProviderConfig();
  check("provider is openai", c?.provider === "openai");
  check("baseUrl is api.openai.com", c?.baseUrl === "https://api.openai.com");
  check("key passed through", c?.apiKey === "sk-test");
  check("json schema supported", c?.supportsJsonSchema === true);
  check("model default gpt-4o-mini", c?.model === "gpt-4o-mini");
});

console.log("openai explicit with custom model");
withEnv({ MODEL_PROVIDER: "openai", OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o" }, () => {
  const c = getProviderConfig();
  check("custom model used", c?.model === "gpt-4o");
});

console.log("ollama defaults");
withEnv({ MODEL_PROVIDER: "ollama", OPENAI_API_KEY: undefined }, () => {
  const c = getProviderConfig();
  check("provider is ollama", c?.provider === "ollama");
  check("default baseUrl localhost:11434", c?.baseUrl === "http://localhost:11434");
  check("no api key", c?.apiKey === null);
  check("default model qwen2.5:7b", c?.model === "qwen2.5:7b");
  check("no json schema support", c?.supportsJsonSchema === false);
  check("longer timeout for local", (c?.timeoutMs ?? 0) >= 60_000);
});

console.log("ollama custom url/model");
withEnv({ MODEL_PROVIDER: "ollama", OLLAMA_BASE_URL: "http://192.168.1.10:11434/", OLLAMA_MODEL: "llama3.1:8b" }, () => {
  const c = getProviderConfig();
  check("trailing slash stripped", c?.baseUrl === "http://192.168.1.10:11434");
  check("custom model used", c?.model === "llama3.1:8b");
});

console.log("groq");
withEnv({ MODEL_PROVIDER: "groq", GROQ_API_KEY: undefined }, () => {
  check("groq without key -> null (fail closed)", getProviderConfig() === null);
});
withEnv({ MODEL_PROVIDER: "groq", GROQ_API_KEY: "gsk-test", GROQ_MODEL: undefined }, () => {
  const c = getProviderConfig();
  check("provider is groq", c?.provider === "groq");
  check("groq base url", c?.baseUrl === "https://api.groq.com/openai");
  check("groq key passed through", c?.apiKey === "gsk-test");
  check("groq default model", c?.model === "openai/gpt-oss-120b");
  check("groq uses json mode", c?.supportsJsonSchema === false);
  check("describe names groq without the key", describeProvider() === "groq (openai/gpt-oss-120b)");
});

console.log("unknown provider -> null (fail closed)");
withEnv({ MODEL_PROVIDER: "anthropic", OPENAI_API_KEY: "sk-test" }, () => {
  check("returns null", getProviderConfig() === null);
});

console.log("request body shape per provider");
withEnv({ MODEL_PROVIDER: undefined, OPENAI_API_KEY: "sk-test" }, () => {
  const c = getProviderConfig()!;
  const body = buildChatBody(c, [{ role: "user", content: "hi" }], { schema: { type: "object" }, schemaName: "r" });
  const rf = (body as any).response_format;
  check("openai uses json_schema strict", rf?.type === "json_schema" && rf.json_schema?.strict === true);
});
withEnv({ MODEL_PROVIDER: "ollama" }, () => {
  const c = getProviderConfig()!;
  const body = buildChatBody(c, [{ role: "user", content: "hi" }], { schema: { type: "object" } });
  check("ollama uses json_object", (body as any).response_format?.type === "json_object");
  check("no schema leaked into body for ollama", !("json_schema" in ((body as any).response_format ?? {})));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
