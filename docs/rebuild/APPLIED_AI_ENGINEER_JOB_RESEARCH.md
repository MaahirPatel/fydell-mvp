# Applied AI / LLM Engineering job research

Research date: 2026-08-21

Scope: application-layer engineers who ship model-powered production systems,
especially at Series A-C startups. This research excludes foundation-model
research, pretraining, and research-only ML roles.

## Executive finding

Applied AI Engineering is production software engineering around a
probabilistic dependency. It is not synonymous with prompt engineering,
framework familiarity, or model research.

The recurring job is to:

1. turn ambiguous product workflows into measurable system requirements;
2. build end-to-end services and product features in Python and/or TypeScript;
3. integrate model APIs, tools, data, and existing systems;
4. define typed schemas and validate model/tool boundaries;
5. build evaluation datasets, graders, regression gates, and feedback loops;
6. instrument traces, versions, token use, latency, cost, and failures;
7. implement retries, fallbacks, idempotency, recovery, and human escalation;
8. decide which steps should remain deterministic;
9. debug production failures and make quality/latency/cost tradeoffs; and
10. protect sensitive data and constrain tool permissions.

RAG, vector databases, MCP, multi-agent frameworks, fine-tuning, and model
hosting are contextual techniques. They are not universal proof requirements.

## Job-posting corpus

Postings were live or discoverable on the research date. Publication dates are
included only where the source exposed them.

### Stage-verified Series A-C roles

1. [Zania — Applied AI Engineer](https://builtin.com/job/applied-ai-engineer/6676057)
   (Series A): production GRC systems, accuracy, explainability, responsible
   design, LLM/RAG/agent implementation, and explicit tradeoffs.
2. [Voyfai — Senior AI Product Engineer](https://jobs.ashbyhq.com/voyfai/490f6746-8811-4f6d-806b-fd22f5d78b2e)
   (Series A): multilingual document pipelines, structured-output validation,
   evals, retries, fallbacks, alerts, cost tracking, and model selection;
   Python and TypeScript/Node.
3. [Sim — Software Engineer, Agents](https://www.ycombinator.com/companies/sim/jobs/Bwr4zt7-software-engineer-agents)
   (Series A): TypeScript agent runtime, orchestration, API integrations,
   observability, and distributed-system debugging.
4. [PermitFlow — Applied AI Engineer](https://hiretik.com/jobs/9d77bbc7-ebb2-4b10-a9c4-8e3d35d408ef)
   (Series B): model integration through productionization, APIs, services,
   pipelines, benchmarks, and accuracy/reliability/cost evaluation.
5. [Mintlify — Applied AI Engineer](https://startup.jobs/applied-ai-engineer-mintlify-2-9011815)
   (Series B): full-stack AI products, long-running tool loops, failure
   recovery, evals, and failure analysis.
6. [LangChain — Fullstack Software Engineer, Applied AI](https://jobs.ashbyhq.com/LangChain/c75915ba-a32b-4e17-873d-19b47564170d)
   (Series B): ambiguous business problems to deployed agents, measurable
   outcomes, evaluation, monitoring, retrieval, orchestration, and model
   selection.
7. [Numeric — Software Engineer, Applied AI](https://jobs.ashbyhq.com/numeric/f2db141e-1548-48ed-98ba-63ea0f7549e4)
   (Series B): auditable customer-facing AI, full-stack foundations,
   measurement loops, ownership, and product judgment.
8. [WorkOS — Applied AI Engineer](https://jobs.ashbyhq.com/workos/5e650527-d8dd-413a-9cfb-d7d68143274b)
   (Series C): idea-to-production ownership, real-user iteration, services,
   data flows, LLM APIs, and tool calling in a security-sensitive product.
9. [CodeRabbit — Senior Applied AI Engineer](https://forgeapply.com/j/senior-applied-ai-engineer-at-coderabbit-694eef48-8e31-4a85-af19-9bf420714ef8)
   (Series C; secondary listing): Python/TypeScript production code-review
   systems, retrieval, and multi-step reasoning. Fine-tuning is specialization,
   not the baseline role.

### Additional startup and scale-up evidence

10. [RobCo — Senior Applied AI Engineer](https://jobs.ashbyhq.com/robco/4d090169-ddee-4058-9020-4940f0877f7d):
    workflow agents, evals, observability, cost, guardrails, security, tools,
    structured outputs, and versioned/tested prompts.
11. [Titan AI — Applied AI Engineer](https://jobs.ashbyhq.com/titan-ai/297cf9a9-289d-4cd5-a4a1-1e051f6f5d64):
    agent workflows, retrieval, behavioral contracts, regression baselines,
    observability, structured outputs, and asynchronous Python services.
12. [Boom — AI Engineer](https://jobs.ashbyhq.com/boom/5c08f741-1f65-427c-90b1-7ccb9349e866):
    tools, memory, retrieval, orchestration, evals, observability, idempotency,
    incidents, and explicit deterministic-versus-model decisions.
13. [Metaforms — Senior AI Engineer](https://jobs.ashbyhq.com/metaforms/274f033c-5328-4a15-98e3-0c75effd3f3b):
    rubrics, golden datasets, model judges, regression suites,
    cascading-error controls, and human review for irreversible errors.
14. [Level — Senior Applied AI Engineer](https://jobs.ashbyhq.com/level/16021400-6ce7-47c8-87ef-58baf6652b75):
    workflow decomposition, success criteria with domain experts,
    decontaminated datasets, judge calibration, and deterministic workflows
    where appropriate.
15. [Bubble — Senior Applied AI Engineer](https://jobs.ashbyhq.com/bubble/32a3ade2-1e62-4ad9-9ab8-32036d6f7b6b):
    explicitly an engineering rather than research role; Python,
    TypeScript/Node, product features, agents, context, retrieval, and evals.
16. [Dwelly — Applied AI Engineer](https://boards.greenhouse.io/dwelly/jobs/4954106101):
    changing operational processes to reliable automation, direct
    product/operations work, and production TypeScript/Node/Postgres systems.
17. [Instrumentl — Senior Backend Engineer, AI](https://jobs.lever.co/Instrumentl/76f33356-fa76-44fc-9576-6186113ec086):
    prototypes to observable services with SLAs, rollback/fallback paths,
    latency/cost budgets, alerts, incidents, and automated/human evaluation.
18. [Decagon — Staff Software Engineer, Agent Product](https://jobs.ashbyhq.com/decagon/834d9a8b-4f7f-416a-9953-05d93c326a5f):
    production agents, continuous iteration, model evaluation, and failure
    diagnosis in asynchronous Python/TypeScript systems.

## Directional frequency

This is a qualitative coding of the corpus, not a statistical labor-market
study.

### Near-universal

- end-to-end production ownership;
- ordinary software-engineering quality;
- product/domain collaboration under ambiguity;
- model/API integration;
- deployment, operation, debugging, and real-user iteration.

### Common

- Python backend and AI pipeline work;
- TypeScript/Node or full-stack product integration;
- tool calling and multi-step orchestration;
- eval datasets, regression tests, or explicit quality measurement;
- reliability, monitoring, latency, and cost;
- schemas, structured output, and typed parsing boundaries.

### Repeated but contextual

- retrieval for document- or knowledge-heavy products;
- human review for high-stakes or irreversible actions;
- prompt/model/config versioning;
- security, privacy, permission, and prompt-injection controls;
- durable execution;
- explicit deterministic-versus-LLM boundaries.

## Practitioner and engineering sources

1. [Hamel Husain and Shreya Shankar — LLM Evals: Everything You Need to Know](https://hamel.dev/blog/posts/evals-faq/):
   start with error analysis and production traces; turn recurring failures into
   CI cases; validate model judges against people.
2. [Eugene Yan — Patterns for Building LLM-based Systems & Products](https://eugeneyan.com/writing/llm-patterns/):
   evaluation, retrieval, caching, guardrails, defensive UX, and feedback are
   system patterns; RAG is conditional.
3. [Chip Huyen — AI Engineering](https://github.com/chiphuyen/aie-book):
   application engineering with existing foundation models, emphasizing
   systematic evaluation, context, security, latency, and cost.
4. [Anthropic — Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents):
   prefer simple composable workflows; add autonomy only when evaluations
   demonstrate value.
5. [Anthropic — How We Built Our Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system):
   production work concentrates in tool coordination, compounding failures,
   deployment, and evaluation.
6. [OpenAI — Inside OpenAI's In-house Data Agent](https://openai.com/index/inside-our-in-house-data-agent/):
   golden results, continuous evals, constrained tools, stronger validation,
   and production feedback.

## Startup and engineering-leader sources

1. [Harrison Chase — Sequoia Training Data interview](https://sequoiacap.com/podcast/training-data-harrison-chase):
   non-determinism changes testing; use-case-specific evaluation and
   observability matter more than general autonomy.
2. [Jerry Liu — Production RAG](https://h2o.ai/resources/video/building-evaluating-and-optimizing-your-rag-app-for-production/):
   retrieval and generation need separate and end-to-end evaluation.
3. [Ankur Goyal — First Round interview](https://review.firstround.com/podcast/what-braintrust-got-right-about-product-market-fit/):
   evals are a product-engineering artifact, not a research afterthought.
4. [Raza Habib — Humanloop GA](https://humanloop.com/blog/ga-announcement):
   dependable products combine code checks, model graders, human review,
   versioned datasets, and production observability.
5. [Boris Cherny — YC Root Access](https://www.ycrootaccess.com/p/boris-cherny-building-claude-code):
   verification outlasts prompt fashions; evals should evolve from empirical
   use.
6. [Shawn Wang — Cognitive Revolution interview](https://www.cognitiverevolution.ai/ai-engineers-pendants-and-competition-between-openai-and-developers-with-swyx-of-latent-space/):
   AI Engineers specialize in the application stack after a foundation model
   exists, distinct from model researchers.

## Relevant technical documentation

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs):
  schema adherence still requires semantic/business validation and refusal
  handling.
- [Anthropic Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs):
  constrained JSON and strict tool inputs.
- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices):
  datasets, graders, adversarial cases, human calibration, and judge limits.
- [OpenAI error handling](https://developers.openai.com/api/docs/guides/error-codes)
  and [Anthropic rate limits](https://platform.claude.com/docs/en/api/rate-limits):
  classify retryable failures, honor retry headers, and bound backoff.
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/checkpointers)
  and [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts):
  recoverable execution and idempotent resumed side effects.
- [Temporal activity guidance](https://docs.temporal.io/activity-definition):
  at-least-once activity execution makes idempotency explicit.
- [LangSmith evaluation concepts](https://docs.langchain.com/langsmith/evaluation-concepts):
  offline datasets/regression tests and online production-trace evaluation are
  different loops.
- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai):
  model, tool, token, finish-reason, and latency telemetry; conventions were
  still marked development at research time.
- [Vercel AI SDK telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)
  and [structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data):
  TypeScript schemas and tool-loop tracing.
- [OWASP Top 10 for LLM and GenAI](https://genai.owasp.org/initiatives/top-10-for-llm-and-genai/):
  prompt injection, sensitive-data disclosure, improper output handling,
  excessive agency, and unbounded consumption.
- [MCP Authorization](https://modelcontextprotocol.org/specification/2025-11-25/basic/authorization):
  resource-bound tokens, validation, and least privilege.
- [Pydantic JSON Schema](https://docs.pydantic.dev/2.9/api/json_schema/):
  shared schema generation and validation at Python boundaries.

## Core, contextual, and unsupported constructs

### Core to the instrument

- ambiguous problem decomposition and success criteria;
- maintainable Python and/or TypeScript implementation;
- model/provider integration and selection;
- typed tools and structured outputs;
- task-specific evaluation and error analysis;
- observability and production debugging;
- bounded retry, fallback, recovery, and idempotency;
- prompt/model/config versioning;
- quality/latency/cost/reliability tradeoffs;
- state and schema design;
- security/privacy and constrained tools;
- product judgment and human escalation;
- deterministic-versus-probabilistic boundaries.

### Contextual only

- RAG, embeddings, reranking, and vector databases;
- multi-agent or long-running orchestration;
- voice, multimodal, browser, or computer use;
- fine-tuning and self-hosted models;
- customer-facing or forward-deployed work;
- Kubernetes/GPU inference infrastructure;
- specific frameworks.

### Unsupported as universal requirements

- multi-agent design by default;
- autonomous planning as inherently superior;
- mandatory RAG, MCP, memory, or knowledge graphs;
- mandatory framework-name expertise;
- fine-tuning, RLHF, CUDA, or model training;
- prompt cleverness without versioning and evaluation;
- self-improving loops without controlled data and approval.

## Implications for Fydell

The flagship instrument should observe artifacts and behavior, not vocabulary:

- a bounded product/system decomposition;
- a real code or executable configuration change;
- schemas plus semantic validation;
- representative normal, difficult, and known-failure eval cases;
- before/after quality, latency, and cost evidence;
- bounded retries/fallbacks and idempotent side effects;
- traces with model/config versions and redacted failure context;
- authorization outside the model;
- an explicit deterministic-versus-LLM boundary;
- a production recommendation with residual uncertainty.

Framework recall receives no independent credit. Multiple architectures can
pass if they produce reliable, measurable, secure outcomes.

## Research limitations

- Job descriptions are employer-authored marketing, not time-use studies.
- Hiring pages change; access dates and URLs should be preserved.
- Company stage is not inferred where the source did not state it.
- Vendor documentation naturally promotes vendor-specific mechanisms.
- Recurrence justifies construct inclusion, not exact scoring weights. Weights
  require pilots, evaluator stability tests, and outcome validation.
