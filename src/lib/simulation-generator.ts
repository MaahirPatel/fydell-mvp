import { randomBytes } from "crypto";
import type {
  GenerateSimulationInput,
  GeneratedSimulation,
  SimulationDocument,
  SimulationNotification,
  SimulationTask
} from "./platform-types";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  Difficulty,
  DraftCandidateBrief,
  DraftCurveball,
  DraftEvidenceCapture,
  DraftPhase,
  DraftReportTemplate,
  DraftResource,
  DraftRubricDimension,
  DraftScenario,
  DraftTeamMessage,
  GeneratorInput,
  SimulationDraft,
  SimulationStyle,
  ValidationIssue,
  ValidationResult
} from "./mvp/generator-types";

const INDUSTRY_TEMPLATES: Record<
  string,
  { deal: string; target: string; offer: string; errorThemes: string[] }
> = {
  finance: {
    deal: "acquisition diligence",
    target: "target business",
    offer: "$2.4B",
    errorThemes: ["terminal growth inflation", "hidden debt at close", "synergy double-count"]
  },
  tech: {
    deal: "strategic investment review",
    target: "target software business",
    offer: "$890M",
    errorThemes: ["ARR churn understated", "share-based compensation excluded from margins", "customer concentration"]
  },
  healthcare: {
    deal: "merger review",
    target: "target healthcare business",
    offer: "$1.1B",
    errorThemes: ["pipeline probability", "regulatory milestone risk", "research capitalization"]
  },
  retail: {
    deal: "take-private evaluation",
    target: "target retail business",
    offer: "$640M",
    errorThemes: ["store closure costs", "inventory write-down", "lease obligations"]
  },
  default: {
    deal: "transaction assessment",
    target: "target business",
    offer: "$1.5B",
    errorThemes: ["optimistic assumptions", "contractual trigger", "double-counted upside"]
  }
};

function pickTemplate(industry: string) {
  const key = industry.toLowerCase();
  for (const k of Object.keys(INDUSTRY_TEMPLATES)) {
    if (key.includes(k)) return INDUSTRY_TEMPLATES[k];
  }
  return INDUSTRY_TEMPLATES.default;
}

function buildDocuments(
  input: GenerateSimulationInput,
  tmpl: ReturnType<typeof pickTemplate>
): SimulationDocument[] {
  const skills = input.skills.join(", ") || "financial reasoning";
  return [
    {
      id: "doc-model",
      title: "Base Case Model",
      type: "dcf",
      content: `Five-year projection for ${tmpl.target}. Management case implies enterprise value above the ${tmpl.offer} offer. Review revenue build, margin trajectory, and terminal assumptions. Skills under test: ${skills}.`
    },
    {
      id: "doc-legal",
      title: "Key Agreement Extract",
      type: "legal",
      content: `Selected clauses from financing documents for ${tmpl.target}. One provision may materially change close economics if the ${tmpl.deal} proceeds. Read every section carefully. Boilerplate can hide leverage.`
    },
    {
      id: "doc-mgmt",
      title: "Management Narrative",
      type: "presentation",
      content: `Value-creation deck from ${tmpl.target} leadership. Headline synergy and growth story support the ${tmpl.offer} valuation. Footnotes matter.`
    },
    {
      id: "doc-memo",
      title: "Internal Mandate",
      type: "memo",
      content: input.scenarioBrief.trim() ||
        `Assess whether the ${tmpl.offer} offer for ${tmpl.target} represents fair value. ${input.durationMinutes} minutes. ${input.difficulty === "advanced" ? "Assume a skeptical IC." : "Flag what you would diligence next."}`
    }
  ];
}

function buildTasks(input: GenerateSimulationInput): SimulationTask[] {
  return [
    {
      id: "work_fair_value",
      label: "Your fair value estimate",
      type: "input",
      documentId: "doc-model",
      placeholder: "e.g. $2.1B or 6.5x EBITDA",
      required: true
    },
    {
      id: "work_assumption",
      label: "Which assumption would you challenge first, and why?",
      type: "textarea",
      documentId: "doc-model",
      minChars: 40,
      required: true
    },
    {
      id: "work_clause",
      label: "Most material legal/financing clause",
      type: "select",
      documentId: "doc-legal",
      options: [
        { value: "", label: "Select..." },
        { value: "change_of_control", label: "Change of control / acceleration" },
        { value: "covenant", label: "Financial covenant breach" },
        { value: "maturity", label: "Maturity / refinancing risk" },
        { value: "representation", label: "Representation & warranty" },
        { value: "other", label: "Other - explain in impact field" }
      ],
      required: true
    },
    {
      id: "work_clause_impact",
      label: "Dollar or strategic impact on the deal",
      type: "textarea",
      documentId: "doc-legal",
      minChars: 30,
      required: true
    },
    {
      id: "work_upside",
      label: "Adjusted upside after removing double-counts",
      type: "input",
      documentId: "doc-mgmt",
      placeholder: "e.g. $45M synergies",
      required: true
    },
    {
      id: "work_mgmt_note",
      label: "Explain your adjustment to management's story",
      type: "textarea",
      documentId: "doc-mgmt",
      minChars: 40,
      required: true
    },
    {
      id: "work_recommendation",
      label: "Recommendation",
      type: "radio",
      options: [
        { value: "proceed", label: "Proceed - offer is fair" },
        { value: "negotiate", label: "Negotiate - gaps remain" },
        { value: "pass", label: "Pass - risk outweighs value" },
        { value: "more_work", label: "More diligence required" }
      ],
      required: true
    },
    {
      id: "work_recommendation_detail",
      label: "Write your recommendation (2-4 sentences)",
      type: "textarea",
      minChars: 60,
      required: true
    }
  ];
}

function buildNotifications(duration: number): SimulationNotification[] {
  const t1 = Math.max(3, Math.floor(duration * 0.32));
  const t2 = Math.max(6, Math.floor(duration * 0.64));
  const t3 = Math.max(9, Math.floor(duration * 0.88));
  return [
    {
      triggerMinute: t1,
      from: "Associate",
      kind: "message",
      body: "Flagging recent comps: closest precedents closed at different multiples than management cites. Might change your range.",
      stage: "associate_update",
      responseLabel: "Response to associate (optional but recommended)",
      required: false
    },
    {
      triggerMinute: t2,
      from: "Managing Director",
      kind: "message",
      body: "Need a quick preliminary read with fair value view and top two risks in 2-3 sentences.",
      stage: "manager_read",
      responseLabel: "Preliminary read to managing director (required to proceed)",
      required: true,
      minChars: 50
    },
    {
      triggerMinute: t3,
      from: "Market Update",
      kind: "market",
      body: "Target just released numbers below consensus. European / core segment weakness cited.",
      stage: "market_update",
      responseLabel: "Does this change your recommendation?",
      required: false
    }
  ];
}

/** Rule-based generator. Production can swap in OpenAI when OPENAI_API_KEY is set. */
export async function generateSimulation(
  companyUserId: string,
  input: GenerateSimulationInput
): Promise<GeneratedSimulation> {
  const tmpl = pickTemplate(input.industry);
  const title = `${input.role} Simulation`;
  const scenarioHeader = `You are a ${input.role} evaluating ${tmpl.target}. ${input.scenarioBrief || `The team needs a view on the ${tmpl.offer} offer.`} You have ${input.durationMinutes} minutes. Materials and workbook fields are in the workstation. Colleagues may ping you with updates.`;

  const embeddedErrors = tmpl.errorThemes.map((e, i) => `${i + 1}. ${e}`);
  if (input.difficulty === "advanced") {
    embeddedErrors.push(`${embeddedErrors.length + 1}. Cross-document inconsistency in growth vs. footnotes`);
  }

  const sim: GeneratedSimulation = {
    id: randomBytes(12).toString("hex"),
    companyUserId,
    title,
    role: input.role,
    industry: input.industry,
    durationMinutes: input.durationMinutes,
    brief: input.scenarioBrief,
    scenarioHeader,
    documents: buildDocuments(input, tmpl),
    tasks: buildTasks(input),
    notifications: buildNotifications(input.durationMinutes),
    finalQuestions: [
      { stage: "final_q1", prompt: "What was the single most important finding?" },
      { stage: "final_q2", prompt: "Where were you least confident and why?" },
      { stage: "final_q3", prompt: "If you had 30 more minutes, what would you do first?" }
    ],
    embeddedErrors,
    createdAt: new Date().toISOString(),
    promptSummary: `${input.industry} | ${input.role} | ${input.skills.join(", ")}`
  };

  if (process.env.OPENAI_API_KEY) {
    try {
      const enriched = await enrichWithOpenAI(sim, input);
      return enriched;
    } catch {
      /* fall back to template */
    }
  }

  return sim;
}

async function enrichWithOpenAI(
  sim: GeneratedSimulation,
  input: GenerateSimulationInput
): Promise<GeneratedSimulation> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You enrich hiring simulation scenarios. Return JSON with: scenarioHeader (string), documents (array of {id,title,type,content}), embeddedErrors (array of strings). Keep ids stable if provided."
        },
        {
          role: "user",
          content: JSON.stringify({ input, current: sim })
        }
      ]
    })
  });
  if (!res.ok) throw new Error("OpenAI error");
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  if (parsed.scenarioHeader) sim.scenarioHeader = parsed.scenarioHeader;
  if (parsed.embeddedErrors) sim.embeddedErrors = parsed.embeddedErrors;
  if (parsed.documents?.length) {
    sim.documents = sim.documents.map((d, i) => ({
      ...d,
      content: parsed.documents[i]?.content ?? d.content,
      title: parsed.documents[i]?.title ?? d.title
    }));
  }
  return sim;
}
