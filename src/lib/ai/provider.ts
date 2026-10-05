/**
 * Model provider configuration.
 *
 * The application supports two generation providers:
 * - "openai": hosted OpenAI API (production default; requires OPENAI_API_KEY)
 * - "ollama": local Ollama server (development; requires Ollama running locally)
 *
 * There is deliberately NO mock provider here. Mock responses exist only in
 * test scripts under scripts/test-*.ts and are never a runtime fallback.
 * When no provider is configured, generation returns an honest "unavailable"
 * state rather than a fake dynamic response.
 *
 * IMPORTANT — where Ollama runs:
 * Generation executes inside Next.js API routes. In production those run on
 * Vercel (serverless), which cannot reach a model on anyone's personal
 * computer. The Ollama option only works when the Next.js server itself runs
 * locally (`npm run dev`), so that `localhost` means the same machine as the
 * Ollama server. Do not set MODEL_PROVIDER=ollama on a deployed environment.
 */
export type ModelProvider = "openai" | "ollama";

export interface ProviderConfig {
  provider: ModelProvider;
  /** Base URL for the OpenAI-compatible chat completions API (no trailing path). */
  baseUrl: string;
  /** Null for providers that need no key (local Ollama). */
  apiKey: string | null;
  model: string;
  /** Whether the provider supports OpenAI-style json_schema response_format. */
  supportsJsonSchema: boolean;
  /** Request timeout in milliseconds. Local models are slower than hosted. */
  timeoutMs: number;
}

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/**
 * Resolve the active provider from the environment.
 * Returns null when no usable provider is configured (caller must surface
 * an honest "unavailable" state, never a mock).
 */
export function getProviderConfig(): ProviderConfig | null {
  const provider = (process.env.MODEL_PROVIDER ?? "openai").trim().toLowerCase();

  if (provider === "ollama") {
    return {
      provider: "ollama",
      baseUrl: (process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, ""),
      apiKey: null,
      model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
      supportsJsonSchema: false,
      timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 120_000),
    };
  }

  if (provider === "openai" || provider === "") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return {
      provider: "openai",
      baseUrl: "https://api.openai.com",
      apiKey,
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      supportsJsonSchema: true,
      timeoutMs: 15_000,
    };
  }

  // Unknown provider name: fail closed, do not guess.
  return null;
}

/** True when a generation provider is configured and reachable in principle. */
export function isProviderConfigured(): boolean {
  return getProviderConfig() !== null;
}

/** Human-readable label for the active provider (safe to log; no secrets). */
export function describeProvider(): string {
  const config = getProviderConfig();
  if (!config) return "none (model not configured)";
  if (config.provider === "ollama") {
    return `ollama (${config.model} at ${config.baseUrl})`;
  }
  return `openai (${config.model})`;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Build the request body for a chat completion.
 *
 * For providers with json_schema support (OpenAI), the schema is enforced
 * by the API. For others (Ollama json_object mode), the schema is described
 * in the system prompt and enforced afterwards by the caller's own
 * validation — which must run regardless of provider.
 */
export function buildChatBody(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    schema?: Record<string, unknown>;
    schemaName?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 800,
    messages,
  };

  if (opts.schema && config.supportsJsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName ?? "response",
        strict: true,
        schema: opts.schema,
      },
    };
  } else if (opts.schema) {
    // Ollama: JSON-object mode. The system prompt must already describe the
    // expected shape; the caller's validate function is the real enforcement.
    body.response_format = { type: "json_object" };
  }

  return body;
}

/**
 * POST a chat completion to the configured provider's OpenAI-compatible
 * endpoint. Returns the raw assistant content string, or throws on
 * transport/API failure. Callers own parsing and validation.
 */
export async function postChatCompletion(
  config: ProviderConfig,
  messages: ChatMessage[],
  opts: {
    schema?: Record<string, unknown>;
    schemaName?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(buildChatBody(config, messages, opts)),
    });

    if (!res.ok) {
      throw new Error(`Model API error: ${res.status} (${config.provider})`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    return content;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Model request timed out after ${config.timeoutMs}ms (${config.provider})`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
