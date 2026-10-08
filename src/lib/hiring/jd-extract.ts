/**
 * Deterministic draft from a pasted job description. Everything it returns is
 * a guess for the employer to edit: requirements come back as unconfirmed
 * suggestions and are never saved until the employer reviews each one. No
 * model calls and no network; the same text always gives the same draft.
 */
import type { Level, RoleFamily, Specialization } from "@/lib/eng/taxonomy";
import type { RemotePolicy } from "./role-contract";
import { clampRequirementText, newRequirementId, type RequirementKind, type RoleRequirement } from "./requirements";

export const JD_MAX_LENGTH = 20000;

export type ExtractedDraft = {
  title: string;
  family: RoleFamily | null;
  specialization: Specialization | null;
  level: Level | null;
  responsibilities: string[];
  requirements: RoleRequirement[];
  languages: string[];
  location: string;
  remotePolicy: RemotePolicy | null;
  compensation: string;
};

type Tech = { label: string; pattern: RegExp };

/** Languages and technologies recognized in a description, in display form. */
export const TECHNOLOGIES: readonly Tech[] = [
  { label: "TypeScript", pattern: /\bTypeScript\b/i },
  { label: "JavaScript", pattern: /\bJavaScript\b/i },
  { label: "Python", pattern: /\bPython\b/i },
  { label: "Go", pattern: /\bGo(?:lang)?\b(?![-'])|\bGolang\b/ },
  { label: "Rust", pattern: /\bRust\b/ },
  { label: "Java", pattern: /\bJava\b(?!\s?Script)/i },
  { label: "Kotlin", pattern: /\bKotlin\b/i },
  { label: "Swift", pattern: /\bSwift\b/ },
  { label: "C++", pattern: /(?:^|[^A-Za-z])C\+\+/ },
  { label: "C#", pattern: /(?:^|[^A-Za-z])C#/ },
  { label: "Ruby", pattern: /\bRuby\b/ },
  { label: "PHP", pattern: /\bPHP\b/ },
  { label: "Scala", pattern: /\bScala\b/ },
  { label: "Elixir", pattern: /\bElixir\b/i },
  { label: "SQL", pattern: /\bSQL\b/ },
  { label: "PostgreSQL", pattern: /\bPostgres(?:QL)?\b/i },
  { label: "MySQL", pattern: /\bMySQL\b/i },
  { label: "Redis", pattern: /\bRedis\b/i },
  { label: "Kafka", pattern: /\bKafka\b/i },
  { label: "RabbitMQ", pattern: /\bRabbitMQ\b/i },
  { label: "AWS", pattern: /\bAWS\b/ },
  { label: "GCP", pattern: /\bGCP\b|\bGoogle Cloud\b/ },
  { label: "Azure", pattern: /\bAzure\b/ },
  { label: "Kubernetes", pattern: /\bKubernetes\b|\bK8s\b/i },
  { label: "Docker", pattern: /\bDocker\b/i },
  { label: "Terraform", pattern: /\bTerraform\b/i },
  { label: "React", pattern: /\bReact(?:\.js)?\b/ },
  { label: "Next.js", pattern: /\bNext\.js\b/i },
  { label: "Node.js", pattern: /\bNode(?:\.js|JS)\b/i },
  { label: "Vue", pattern: /\bVue(?:\.js)?\b/ },
  { label: "Angular", pattern: /\bAngular\b/ },
  { label: "GraphQL", pattern: /\bGraphQL\b/i },
  { label: "gRPC", pattern: /\bgRPC\b/i },
  { label: "Django", pattern: /\bDjango\b/i },
  { label: "FastAPI", pattern: /\bFastAPI\b/i },
  { label: "Flask", pattern: /\bFlask\b/ },
  { label: "Rails", pattern: /\bRails\b/ },
  { label: "Spring", pattern: /\bSpring(?: Boot)?\b/ },
  { label: "PyTorch", pattern: /\bPyTorch\b/i },
  { label: "TensorFlow", pattern: /\bTensorFlow\b/i },
  { label: "Spark", pattern: /\bSpark\b/ },
  { label: "Airflow", pattern: /\bAirflow\b/ },
  { label: "Linux", pattern: /\bLinux\b/i },
];

export const TECHNOLOGY_SUGGESTIONS: readonly string[] = TECHNOLOGIES.map((t) => t.label);

type Section = "responsibilities" | "required" | "preferred" | "other" | null;

const HEADINGS: Array<{ section: Exclude<Section, null>; pattern: RegExp }> = [
  { section: "preferred", pattern: /^(nice[- ]to[- ]haves?|preferred( qualifications| skills| experience)?|bonus( points)?|good to have|extra credit|it'?s a plus|pluses)\b/i },
  { section: "responsibilities", pattern: /^(responsibilities|key responsibilities|what you('|’)ll do|what you will do|what you('|’)ll work on|the role|your role|in this role|day[- ]to[- ]day|you will)\b/i },
  { section: "required", pattern: /^(requirements|qualifications|minimum qualifications|basic qualifications|required( skills| experience)?|must[- ]haves?|what you('|’)ll need|what you need|what we('|’)re looking for|who you are|about you|you have|skills( and experience)?)\b/i },
  { section: "other", pattern: /^(about us|about the (company|team)|who we are|benefits|perks|what we offer|compensation|salary|pay|location|how to apply|our stack|tech stack|equal (opportunity|employment)|eeo)\b/i },
];

const BULLET = /^\s*(?:[-*•·◦▪●‣]|\d{1,2}[.)])\s+/;

function headingOf(line: string): Exclude<Section, null> | null {
  const t = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/[:：]\s*$/, "").trim();
  if (!t || t.length > 60 || BULLET.test(line)) return null;
  const words = t.split(/\s+/).length;
  const endsWithColon = /[:：]\s*$/.test(line.trim());
  if (!endsWithColon && words > 6) return null;
  for (const h of HEADINGS) if (h.pattern.test(t)) return h.section;
  return null;
}

function stripBullet(line: string): string {
  return line.replace(BULLET, "").replace(/\*\*/g, "").trim();
}

const PREFERRED_MARKER = /\b(nice to have|is a plus|a plus|bonus|preferred|ideally)\b/i;

function guessTitle(lines: string[]): string {
  const candidates = lines.slice(0, 8).filter((l) => l && !BULLET.test(l) && !headingOf(l) && l.length <= 100);
  const labeled = candidates.find((l) => /^(job )?title\s*[:：]/i.test(l));
  if (labeled) return labeled.replace(/^(job )?title\s*[:：]\s*/i, "").trim().slice(0, 120);
  const engineering = candidates.find((l) => /\b(engineer|developer|architect|sre|scientist)\b/i.test(l));
  return (engineering ?? candidates[0] ?? "").replace(/^#+\s*/, "").replace(/\*\*/g, "").trim().slice(0, 120);
}

function guessLevel(title: string, text: string): Level | null {
  const byWords = (s: string): Level | null => {
    if (/\b(staff|principal)\b/i.test(s)) return "staff";
    if (/\b(senior|sr\.?|lead)\b/i.test(s)) return "senior";
    if (/\b(junior|jr\.?|entry[- ]level|graduate|new grad)\b/i.test(s)) return "junior";
    if (/\b(mid[- ]level|intermediate)\b/i.test(s)) return "mid";
    return null;
  };
  const fromTitle = byWords(title);
  if (fromTitle) return fromTitle;
  const years = /(\d{1,2})\+?\s*(?:or more\s*)?years/i.exec(text);
  if (years) {
    const n = Number(years[1]);
    if (n >= 6) return "senior";
    if (n >= 3) return "mid";
    return "junior";
  }
  return byWords(text);
}

function guessFamily(title: string, text: string): { family: RoleFamily | null; specialization: Specialization | null } {
  const rules: Array<{ re: RegExp; family: RoleFamily; specialization: Specialization }> = [
    { re: /\b(front[- ]?end|ui engineer|web engineer)\b/i, family: "software_engineer", specialization: "frontend" },
    { re: /\bfull[- ]?stack\b/i, family: "software_engineer", specialization: "full_stack" },
    { re: /\b(platform|infrastructure|sre|site reliability|devops)\b/i, family: "software_engineer", specialization: "platform_infrastructure" },
    { re: /\b(developer tools|devtools|developer experience|developer productivity)\b/i, family: "software_engineer", specialization: "developer_tools" },
    { re: /\b(machine learning|ml engineer|ml)\b/i, family: "applied_ai_engineer", specialization: "ml_engineering" },
    { re: /\b(ai|llm|applied ai|genai|generative ai)\b/i, family: "applied_ai_engineer", specialization: "general" },
    { re: /\b(back[- ]?end|api|services)\b/i, family: "backend_api_engineer", specialization: "general" },
    { re: /\b(software|engineer|developer)\b/i, family: "software_engineer", specialization: "general" },
  ];
  for (const r of rules) if (r.re.test(title)) return { family: r.family, specialization: r.specialization };
  for (const r of rules.slice(0, 7)) if (r.re.test(text)) return { family: r.family, specialization: r.specialization };
  return { family: null, specialization: null };
}

function guessRemote(text: string): RemotePolicy | null {
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\b(fully remote|remote[- ]first|100% remote|remote)\b/i.test(text)) return "remote";
  if (/\b(on[- ]?site|in[- ]office|in the office)\b/i.test(text)) return "onsite";
  return null;
}

function guessLocation(lines: string[]): string {
  for (const l of lines) {
    const m = /^(?:location|based in|office)\s*[:：]\s*(.+)$/i.exec(stripBullet(l));
    if (m) return m[1].trim().slice(0, 120);
  }
  return "";
}

const MONEY = String.raw`[$£€]\s?\d[\d,.]*\s?[kK]?`;
const RANGE = new RegExp(String.raw`${MONEY}(?:\s*(?:-|–|to)\s*(?:${MONEY}|\d[\d,.]*\s?[kK]?))?(?:\s*(?:USD|GBP|EUR|CAD|AUD))?(?:\s*(?:per year|a year|\/\s?year|annually|per annum|base))?`);

function guessCompensation(lines: string[], text: string): string {
  for (const l of lines) {
    const m = /^(?:salary|compensation|pay|base salary|pay range)\s*[:：]\s*(.+)$/i.exec(stripBullet(l));
    if (m) return m[1].trim().slice(0, 200);
  }
  const m = RANGE.exec(text);
  return m ? m[0].trim().slice(0, 200) : "";
}

function uniquePush(list: string[], value: string, max: number) {
  const key = value.toLowerCase();
  if (list.length < max && value && !list.some((v) => v.toLowerCase() === key)) list.push(value);
}

export function extractJobDescription(input: string): ExtractedDraft {
  const text = input.slice(0, JD_MAX_LENGTH).replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((l) => l.trim());
  const title = guessTitle(lines.filter(Boolean));

  const responsibilities: string[] = [];
  const reqTexts: Array<{ text: string; kind: RequirementKind }> = [];
  const addReq = (raw: string, kind: RequirementKind) => {
    const t = clampRequirementText(raw);
    if (t.length < 3 || reqTexts.length >= 40) return;
    if (reqTexts.some((r) => r.text.toLowerCase() === t.toLowerCase())) return;
    reqTexts.push({ text: t, kind });
  };

  let section: Section = null;
  let sawSection = false;
  for (const line of lines) {
    if (!line) continue;
    const heading = headingOf(line);
    if (heading) {
      section = heading;
      sawSection = true;
      continue;
    }
    const item = stripBullet(line);
    if (!item || item === title) continue;
    if (section === "responsibilities") uniquePush(responsibilities, clampRequirementText(item, 300), 15);
    else if (section === "required") addReq(item, PREFERRED_MARKER.test(item) ? "preferred" : "required");
    else if (section === "preferred") addReq(item, "preferred");
  }

  if (!sawSection) {
    for (const line of lines) {
      if (!BULLET.test(line)) continue;
      const item = stripBullet(line);
      if (/\b(experience|proficien|familiar|knowledge|years|comfortable|understanding)\b/i.test(item)) {
        addReq(item, PREFERRED_MARKER.test(item) ? "preferred" : "required");
      } else {
        uniquePush(responsibilities, clampRequirementText(item, 300), 15);
      }
    }
  }

  const languages: string[] = [];
  for (const t of TECHNOLOGIES) if (t.pattern.test(text)) uniquePush(languages, t.label, 20);

  const { family, specialization } = guessFamily(title, text);
  return {
    title,
    family,
    specialization,
    level: guessLevel(title, text),
    responsibilities,
    requirements: reqTexts.map((r) => ({ id: newRequirementId(), text: r.text, kind: r.kind, source: "suggested", confirmed: false })),
    languages,
    location: guessLocation(lines),
    remotePolicy: guessRemote(text),
    compensation: guessCompensation(lines, text),
  };
}
