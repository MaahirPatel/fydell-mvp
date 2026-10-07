/**
 * Code-analysis prototype - analyzer orchestration.
 *
 * analyzeSource: extract AST facts per file, run deterministic detectors,
 * deduplicate, attach summaries. LLM layer is a clean seam: it is only
 * consulted when a model provider is configured (MODEL_PROVIDER), and it never
 * invents findings - it can only re-rank or explain deterministic findings.
 */
import { extractFacts, type ExtractionResult } from "./pythonAst";
import { runDetectors, type FileModel } from "./detectors";
import { getProviderConfig } from "@/lib/ai/provider";
import type {
  AnalysisReport,
  Confidence,
  Finding,
  FunctionSummary,
  LlmLayer,
  Severity,
  SourceFile,
} from "./types";

export interface AnalyzeInput {
  files: { path: string; content: string }[];
}

export const MAX_FILES = 40;
export const MAX_FILE_BYTES = 100_000;
export const MAX_TOTAL_BYTES = 1_000_000;

const SEVERITY_RANK: Record<Severity, number> = { bug: 0, security: 1, risk: 2, note: 3 };

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.code}|${f.file}|${f.line}|${f.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}

function llmLayer(): LlmLayer {
  const config = getProviderConfig();
  if (config) {
    return {
      kind: "enabled",
      model: config.model,
      note: "LLM reranking/explanation is configured but not implemented in this prototype. Deterministic findings only.",
    };
  }
  return {
    kind: "unavailable",
    note: "No model provider configured. All findings below are deterministic AST-pattern detections; nothing was generated or paraphrased by a language model.",
  };
}

export async function analyzeSource(input: AnalyzeInput): Promise<AnalysisReport> {
  const files = input.files.slice(0, MAX_FILES);
  const fileModels: FileModel[] = [];
  const fileSummaries: SourceFile[] = [];
  const errors: AnalysisReport["errors"] = [];
  const fnSummaries: FunctionSummary[] = [];

  for (const file of files) {
    const byteLen = Buffer.byteLength(file.content, "utf8");
    const base: SourceFile = {
      path: file.path,
      bytes: byteLen,
      lines: file.content.split("\n").length,
      skipped: byteLen > MAX_FILE_BYTES,
      functions: 0,
    };
    if (base.skipped) {
      errors.push({
        file: file.path,
        kind: "skipped",
        message: `File exceeds ${MAX_FILE_BYTES} byte prototype limit and was not analyzed.`,
      });
      fileSummaries.push(base);
      continue;
    }
    let result: ExtractionResult;
    try {
      result = await extractFacts(file.content);
    } catch (e) {
      errors.push({
        file: file.path,
        kind: "engine",
        message: `Extraction failed: ${String(e).slice(0, 160)}`,
      });
      fileSummaries.push(base);
      continue;
    }
    if (result.engineError) {
      errors.push({ file: file.path, kind: "engine", message: result.engineError });
      fileSummaries.push(base);
      continue;
    }
    if (result.parseError) {
      errors.push({
        file: file.path,
        kind: "parse",
        message: `Syntax error at line ${result.parseError.line}: ${result.parseError.message}`,
      });
      base.parseError = { line: result.parseError.line, message: result.parseError.message };
      fileSummaries.push(base);
      continue;
    }
    const lines = file.content.split("\n");
    const isTest = /test/i.test(file.path);
    fileModels.push({ path: file.path, content: file.content, lines, facts: result.facts! });
    fileSummaries.push({ ...base, isTest, functions: 0 });
    for (const f of result.facts!.filter((x) => x.kind === "func_def")) {
      fnSummaries.push({
        file: file.path,
        name: f.name!,
        line: f.lineno,
        endLine: f.endLineno,
        complexity: f.complexity ?? 1,
        maxNesting: f.maxNesting ?? 0,
        args: f.args ?? [],
        docstring: f.docstring,
        calls: result
          .facts!.filter((c) => c.kind === "call" && c.enclosing === f.name && c.callee)
          .map((c) => c.callee!)
          .filter((v, i, a) => a.indexOf(v) === i),
        isTest,
      });
    }
  }

  const testModels = fileModels.filter((m) => /test/i.test(m.path));
  const prodModels = fileModels.filter((m) => !/test/i.test(m.path));
  // Test files inform TEST_GAP detection but are not themselves scanned for bugs.
  const findings = dedupeFindings(runDetectors({ models: prodModels, testModels }));

  const forSummary = (list: SourceFile[]) => {
    for (const s of list) {
      s.functions = fnSummaries.filter((f) => f.file === s.path).length;
    }
  };
  forSummary(fileSummaries);

  const bySeverity = (sev: Severity) => findings.filter((f) => f.severity === sev).length;
  return {
    engine: "deterministic",
    deterministic: true,
    files: fileSummaries,
    filesAnalyzed: fileModels.length,
    functionsAnalyzed: fnSummaries.length,
    functionSummaries: fnSummaries,
    findings,
    summary: {
      filesAnalyzed: fileModels.length,
      filesSkipped: fileSummaries.filter((f) => f.skipped).length,
      functions: fnSummaries.length,
      bugs: bySeverity("bug"),
      security: bySeverity("security"),
      risks: bySeverity("risk"),
      notes: bySeverity("note"),
    },
    llm: llmLayer(),
    errors,
    confidenceNote:
      "Severity `bug` means the defect is demonstrated by cited code. `risk` means the pattern is real but impact depends on stated unknowns. `note` is informational. Anything the analyzer could not see is listed in `uncertainAbout` on the finding, not guessed.",
    generatedAt: new Date().toISOString(),
  };
}

export type { Confidence };
