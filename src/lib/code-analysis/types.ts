/**
 * Code-analysis prototype - shared types.
 *
 * Design rule: every finding must cite the exact file/line(s) it rests on.
 * Severity "bug" means the evidence shows a real defect; "risk" means the
 * pattern is present but impact depends on something the analyzer cannot see
 * (stated in `uncertainAbout`); "security" is a security-relevant pattern;
 * "note" is maintainability/test-coverage information, not a defect claim.
 */

export type Severity = "bug" | "security" | "risk" | "note";

export type Confidence = "high" | "medium" | "low";

export interface Evidence {
  file: string;
  line: number;
  endLine?: number;
  snippet: string;
  /** defect = where the problem is; call_site = how it is used;
   *  context = supporting code; remediation = existing fix in the codebase */
  role: "defect" | "call_site" | "context" | "remediation";
  note?: string;
}

export interface Finding {
  /** Stable machine code, e.g. SILENT_DROP, FRAGILE_ID_JOIN. */
  code: string;
  severity: Severity;
  title: string;
  file: string;
  line: number;
  endLine?: number;
  summary: string;
  evidence: Evidence[];
  confidence: Confidence;
  /** What the analyzer could not verify - stated explicitly, never guessed. */
  uncertainAbout?: string;
  suggestedFix?: string;
  relatedCodes?: string[];
}

export interface SourceFile {
  path: string;
  bytes: number;
  lines: number;
  /** True when the file exceeded the size limit and was not analyzed. */
  skipped: boolean;
  isTest?: boolean;
  functions: number;
  parseError?: { line: number; message: string };
}

export interface FunctionSummary {
  file: string;
  name: string;
  line: number;
  endLine?: number;
  complexity: number;
  maxNesting: number;
  args: string[];
  docstring?: string | null;
  /** Distinct callee names referenced in the body. */
  calls: string[];
  isTest: boolean;
}

export interface LlmLayer {
  kind: "enabled" | "unavailable";
  model?: string;
  note: string;
}

export interface AnalysisReport {
  engine: "deterministic";
  deterministic: true;
  llm: LlmLayer;
  files: SourceFile[];
  filesAnalyzed: number;
  functionsAnalyzed: number;
  functionSummaries: FunctionSummary[];
  findings: Finding[];
  summary: {
    filesAnalyzed: number;
    filesSkipped: number;
    functions: number;
    bugs: number;
    security: number;
    risks: number;
    notes: number;
  };
  confidenceNote: string;
  errors: { file: string; kind: "parse" | "engine" | "skipped"; message: string }[];
  generatedAt: string;
}

/** Raw fact emitted by the Python AST walk. Kind-specific fields are optional. */
export interface AstFact {
  kind: string;
  lineno: number;
  endLineno?: number;
  enclosing: string;
  name?: string;
  args?: string[];
  /** Aligned {arg, default-source} pairs for the function's parameters. */
  defaultPairs?: { arg: string; defSrc: string | null }[];
  docstring?: string | null;
  complexity?: number;
  maxNesting?: number;
  targets?: string[];
  rhsKind?: string;
  rhsSource?: string | null;
  callee?: string | null;
  callArgs?: (string | null)[];
  callKeywords?: (string | null)[];
  base?: string | null;
  key?: string | number | null;
  leftSource?: string | null;
  rightSource?: string | null;
  negated?: boolean;
  compKind?: string;
  target?: string | null;
  iterSource?: string | null;
  conditions?: (string | null)[];
  returnNames?: string[];
  returnKind?: string;
  handlerType?: string;
  onlyPass?: boolean;
  module?: string | null;
  importedNames?: string[];
  mode?: string | null;
}
