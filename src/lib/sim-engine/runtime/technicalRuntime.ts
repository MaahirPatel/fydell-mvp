import type { SimulationAttempt, TechnicalRuntimeConfig } from "../types";
import { pushScenarioEvent, setWorldFlag } from "./worldState";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBody(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function checkFieldType(value: unknown, type: string): boolean {
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number";
  if (type === "email") return typeof value === "string" && value.includes("@");
  if (type === "object") return typeof value === "object" && value !== null;
  if (type === "uuid") return typeof value === "string" && UUID_RE.test(value);
  return true;
}

export interface ApiExecuteResult {
  status: number;
  body: string;
  success: boolean;
  requestId?: string;
  errorCode?: string;
  attempt: SimulationAttempt;
}

/**
 * Deterministic API mock — multiple failure states, recoverable.
 * Not a single scripted success path.
 */
export function executeApiRequest(
  config: TechnicalRuntimeConfig | undefined,
  attempt: SimulationAttempt,
  args: {
    method: string;
    path: string;
    headers: string;
    body: string;
    elapsedMs: number;
    seed: string;
  }
): ApiExecuteResult {
  const requestId = `req_${args.seed.slice(0, 6)}_${Math.abs(args.elapsedMs).toString(36)}`;

  if (!config) {
    return {
      status: 500,
      body: JSON.stringify({ error: "No technical runtime configured" }),
      success: false,
      attempt,
    };
  }

  // Auth check
  if (config.authHeader) {
    const headersLower = args.headers.toLowerCase();
    if (!headersLower.includes(config.authHeader.toLowerCase())) {
      let world = setWorldFlag(attempt.world, "last_api_status", 401, args.elapsedMs, false);
      world = setWorldFlag(world, "candidate_saw_401", true, args.elapsedMs);
      world = pushScenarioEvent(world, "API_FAILURE", "API 401 Unauthorized", args.elapsedMs, {
        status: 401,
        requestId,
      });
      return {
        status: 401,
        body: JSON.stringify({ error: "Unauthorized", message: "Missing or invalid Authorization header" }),
        success: false,
        requestId,
        errorCode: "UNAUTHORIZED",
        attempt: { ...attempt, world },
      };
    }
  }

  const endpoint = config.endpoints.find(
    (e) =>
      e.method.toUpperCase() === args.method.toUpperCase() &&
      (e.path === args.path || args.path.endsWith(e.path))
  );

  if (!endpoint) {
    let world = setWorldFlag(attempt.world, "last_api_status", 404, args.elapsedMs, false);
    world = setWorldFlag(world, "candidate_saw_404", true, args.elapsedMs);
    world = pushScenarioEvent(world, "API_FAILURE", "API 404 Not Found", args.elapsedMs, {
      status: 404,
      path: args.path,
      requestId,
    });
    return {
      status: 404,
      body: JSON.stringify({ error: "Not Found", path: args.path }),
      success: false,
      requestId,
      errorCode: "NOT_FOUND",
      attempt: { ...attempt, world },
    };
  }

  const parsed = parseBody(args.body);
  if (!parsed) {
    let world = setWorldFlag(attempt.world, "last_api_status", 400, args.elapsedMs, false);
    world = setWorldFlag(world, "candidate_saw_malformed_json", true, args.elapsedMs);
    world = pushScenarioEvent(world, "API_FAILURE", "API 400 Malformed JSON", args.elapsedMs, {
      status: 400,
      requestId,
    });
    return {
      status: 400,
      body: JSON.stringify({ error: "Bad Request", message: "Request body must be valid JSON object" }),
      success: false,
      requestId,
      errorCode: "MALFORMED_JSON",
      attempt: { ...attempt, world },
    };
  }

  // Rate limit misuse
  const recent = attempt.telemetry.filter((e) => e.type === "API_EXECUTE").length;
  if (recent >= 8 && !attempt.world.flags.rate_limit_cleared) {
    let world = setWorldFlag(attempt.world, "candidate_saw_429", true, args.elapsedMs);
    world = pushScenarioEvent(world, "API_FAILURE", "API 429 Rate Limited", args.elapsedMs, {
      status: 429,
      requestId,
    });
    return {
      status: 429,
      body: JSON.stringify({ error: "Too Many Requests", retry_after: 2 }),
      success: false,
      requestId,
      errorCode: "RATE_LIMIT",
      attempt: { ...attempt, world },
    };
  }

  const missing = (endpoint.requiredFields ?? []).filter((f) => !(f in parsed));
  if (missing.length) {
    let world = setWorldFlag(attempt.world, "last_api_status", 422, args.elapsedMs, false);
    world = setWorldFlag(world, "candidate_has_seen_422", true, args.elapsedMs);
    world = setWorldFlag(world, "last_request_id", requestId, args.elapsedMs);
    world = pushScenarioEvent(world, "API_FAILURE", "API 422 Missing fields", args.elapsedMs, {
      status: 422,
      requestId,
      missing,
    });
    world = pushScenarioEvent(world, "REQUEST_ID_ISSUED", `Request ID ${requestId}`, args.elapsedMs, {
      requestId,
    });
    return {
      status: 422,
      body: JSON.stringify({
        error: "INVALID_FIELD",
        message: `Missing required fields: ${missing.join(", ")}`,
        request_id: requestId,
        fields: missing,
      }),
      success: false,
      requestId,
      errorCode: "MISSING_FIELDS",
      attempt: { ...attempt, world },
    };
  }

  if (endpoint.fieldTypes) {
    for (const [field, type] of Object.entries(endpoint.fieldTypes)) {
      if (!(field in parsed)) continue;
      if (!checkFieldType(parsed[field], type)) {
        let world = setWorldFlag(attempt.world, "last_api_status", 422, args.elapsedMs, false);
        world = setWorldFlag(world, "candidate_has_seen_422", true, args.elapsedMs);
        world = setWorldFlag(world, "last_request_id", requestId, args.elapsedMs);
        world = setWorldFlag(world, "invalid_field", field, args.elapsedMs);
        world = pushScenarioEvent(world, "API_FAILURE", `API 422 Invalid field: ${field}`, args.elapsedMs, {
          status: 422,
          field,
          expected: type,
          requestId,
        });
        world = pushScenarioEvent(world, "REQUEST_ID_ISSUED", `Request ID ${requestId}`, args.elapsedMs, {
          requestId,
        });
        return {
          status: 422,
          body: JSON.stringify({
            error: "INVALID_FIELD",
            message: `Field '${field}' must be a valid ${type}`,
            field,
            expected: type,
            received: typeof parsed[field],
            request_id: requestId,
          }),
          success: false,
          requestId,
          errorCode: "INVALID_FIELD",
          attempt: { ...attempt, world },
        };
      }
    }
  }

  // Success path
  let world = setWorldFlag(attempt.world, "last_api_status", endpoint.successStatus, args.elapsedMs, false);
  world = setWorldFlag(world, "api_succeeded", true, args.elapsedMs);
  world = setWorldFlag(world, "last_request_id", requestId, args.elapsedMs);
  world = pushScenarioEvent(world, "API_SUCCESS", `API ${endpoint.successStatus} Success`, args.elapsedMs, {
    status: endpoint.successStatus,
    requestId,
  });

  return {
    status: endpoint.successStatus,
    body: JSON.stringify({ ...(endpoint.successBody as object), request_id: requestId }),
    success: true,
    requestId,
    attempt: { ...attempt, world },
  };
}

export function runIntegrationCode(
  code: string,
  language: string
): { output: string; success: boolean } {
  const trimmed = code.trim();
  if (!trimmed) {
    return { output: "No code to run.", success: false };
  }
  if (/syntax\s*error|throw new Error\(['\"]fail/i.test(trimmed)) {
    return { output: "RuntimeError: simulated failure in integration script", success: false };
  }
  // Lightweight structural checks
  if (language === "javascript" || language === "typescript") {
    if (!/fetch\(|axios|request\(/i.test(trimmed) && !/Authorization|customer_id|uuid/i.test(trimmed)) {
      return {
        output:
          "Script ran with no network call detected. Tip: include the API request with Authorization and a UUID customer_id.",
        success: false,
      };
    }
    if (/customer_id\s*[:=]\s*\d+/.test(trimmed) && !/customer_id\s*[:=]\s*['\"][0-9a-f-]{36}/i.test(trimmed)) {
      return {
        output:
          "Script executed locally. Warning: customer_id looks numeric — recent schema validation expects UUID.",
        success: false,
      };
    }
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(trimmed)) {
      return {
        output: "Script OK. Payload shape looks UUID-compliant. Use the API Console to confirm against the live mock.",
        success: true,
      };
    }
  }
  return {
    output: "Script evaluated. No fatal errors. Confirm with API Console for authoritative status codes.",
    success: true,
  };
}
