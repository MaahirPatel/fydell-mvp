/**
 * Code-analysis prototype — deterministic detectors over AST facts.
 *
 * Every detector cites exact file/line evidence. Severity "bug" is reserved
 * for defects the evidence actually shows; anything conditional is "risk"
 * with the unknown stated outright. No finding is ever invented: when the
 * analyzer cannot see enough, it says so in `uncertainAbout`.
 */
import type { AstFact, Confidence, Evidence, Finding, Severity } from "./types";

export interface FileModel {
  path: string;
  content: string;
  lines: string[];
  facts: AstFact[];
}

const DROP_NAME_RE = /drop|unmatch|exclud|reject|missing|skip|leftover|orphan|invalid|fail/i;
const NORMALIZE_RE = /normaliz|canon|standardiz|casefold|\blower\b|\bstrip\b|clean/i;
const REMEDIATION_NAME_RE = /reconciled|normalized|robust|fixed|safe_/i;
const BARE_NAME_RE = /^[A-Za-z_]\w*$/;
const WORD = (name: string) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

function funcs(model: FileModel): AstFact[] {
  return model.facts.filter((f) => f.kind === "func_def");
}

function funcByName(model: FileModel, name: string): AstFact | undefined {
  return funcs(model).find((f) => f.name === name);
}

function snippetFor(model: FileModel, fact: AstFact): string {
  const line = model.lines[fact.lineno - 1] ?? "";
  return line.trim().slice(0, 180);
}

function ev(
  model: FileModel,
  fact: AstFact,
  role: Evidence["role"],
  note?: string,
): Evidence {
  return {
    file: model.path,
    line: fact.lineno,
    endLine: fact.endLineno,
    snippet: snippetFor(model, fact),
    role,
    note,
  };
}

function bareCallee(callee: string | null | undefined): string | null {
  if (!callee) return null;
  const parts = callee.split(".");
  return parts[parts.length - 1] ?? null;
}

/** Comprehension facts linked to an assignment by source line. */
function compsForAssign(model: FileModel, assign: AstFact): AstFact[] {
  return model.facts.filter(
    (f) =>
      f.kind === "comprehension" &&
      f.enclosing === assign.enclosing &&
      f.lineno === assign.lineno,
  );
}

/** Membership tests textually inside a comprehension's span. */
function testsInComp(model: FileModel, comp: AstFact): AstFact[] {
  return model.facts.filter(
    (f) =>
      f.kind === "membership_test" &&
      f.enclosing === comp.enclosing &&
      f.lineno >= comp.lineno &&
      comp.endLineno !== undefined &&
      f.lineno <= comp.endLineno,
  );
}

interface CallSite {
  model: FileModel;
  call: AstFact;
  viaAlias?: string;
}

/** All call sites of `funcName` across models, resolving parameter aliases
 *  (e.g. `join_fn(...)` where `join_fn` defaults to `naive_join`). */
function findCallSites(all: FileModel[], funcName: string): CallSite[] {
  const sites: CallSite[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      // alias: parameter name -> default bare function name
      const aliases = new Map<string, string>();
      for (const p of f.defaultPairs ?? []) {
        if (p.defSrc && BARE_NAME_RE.test(p.defSrc)) aliases.set(p.arg, p.defSrc);
      }
      for (const call of model.facts.filter(
        (c) => c.kind === "call" && c.enclosing === f.name,
      )) {
        const callee = bareCallee(call.callee);
        if (callee === funcName) {
          sites.push({ model, call });
        } else if (callee && aliases.get(callee) === funcName) {
          sites.push({ model, call, viaAlias: callee });
        }
      }
    }
  }
  return sites;
}

/** Innermost function containing a line. */
function enclosingFunc(model: FileModel, lineno: number): AstFact | undefined {
  const candidates = funcs(model).filter(
    (f) => f.lineno <= lineno && (f.endLineno ?? f.lineno) >= lineno,
  );
  candidates.sort((a, b) => b.lineno - a.lineno);
  return candidates[0];
}

type DropUsage = "count" | "ids" | "payload" | "surfaced" | "check" | "unused";

/** How the dropped-partition variable is used after the call, per line. */
function classifyDropUsage(
  model: FileModel,
  call: AstFact,
  container: AstFact,
  droppedVar: string,
): DropUsage[] {
  const w = WORD(droppedVar);
  const usages = new Set<DropUsage>();
  const end = container.endLineno ?? call.lineno;
  for (let i = call.lineno; i < end; i++) {
    const line = model.lines[i];
    if (!line || !w.test(line)) continue;
    // A loud failure on the dropped rows is the opposite of silent.
    if (/\braise\b/.test(line)) {
      usages.add("surfaced");
      continue;
    }
    if (new RegExp(`len\\s*\\(\\s*${droppedVar}\\s*\\)`).test(line)) {
      usages.add("count");
      continue;
    }
    // Single-key projection: [x["k"] for x in VAR] — ids surface, payload lost.
    if (
      /\bfor\b/.test(line) &&
      new RegExp(`\\bfor\\s+\\w+\\s+in\\s+${droppedVar}\\b`).test(line)
    ) {
      usages.add(/\[.*\["[^"]+"\]/.test(line) ? "ids" : "payload");
      continue;
    }
    // Truthiness/emptiness checks are neutral — neither use nor surfacing.
    if (new RegExp(`^\\s*if\\s+(not\\s+)?${droppedVar}\\s*:`).test(line)) {
      usages.add("check");
      continue;
    }
    usages.add("payload");
  }
  if (usages.size === 0) usages.add("unused");
  return [...usages];
}

function detectSilentDrop(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      // Partition: two comprehensions over the same iterable, one `in`,
      // one `not in` — or a single filtered comprehension with a
      // drop-named return.
      const assigns = model.facts.filter(
        (a) => a.kind === "assign" && a.enclosing === f.name,
      );
      const parts: { kept?: AstFact; dropped: AstFact; comp: AstFact }[] = [];
      for (const a of assigns) {
        for (const c of compsForAssign(model, a)) {
          const tests = testsInComp(model, c);
          if (tests.length === 0) continue;
          const targetName = (a.targets ?? [])[0];
          if (!targetName || !DROP_NAME_RE.test(targetName)) continue;
          // complementary kept partition over the same iterable?
          const kept = assigns.find(
            (b) =>
              b !== a &&
              compsForAssign(model, b).some(
                (cc) =>
                  (cc.iterSource ?? "").replace(/\s+/g, "") ===
                    (c.iterSource ?? "").replace(/\s+/g, "") &&
                  testsInComp(model, cc).some((t) => t.negated !== tests[0]?.negated),
              ),
          );
          parts.push({ kept, dropped: a, comp: c });
        }
      }
      if (parts.length === 0) continue;
      const ret = model.facts.find(
        (r) => r.kind === "return" && r.enclosing === f.name,
      );
      const droppedNames = parts
        .map((p) => (p.dropped.targets ?? [])[0])
        .filter((n): n is string => !!n)
        .filter((n) => (ret?.returnNames ?? []).includes(n));
      if (droppedNames.length === 0) continue;

      const droppedVar = droppedNames[0]!;
      const sites = findCallSites(all, f.name!);
      const evidence: Evidence[] = [];
      for (const p of parts) {
        evidence.push(ev(model, p.comp, "defect", `Rows failing the membership test are partitioned into \`${droppedVar}\``));
        if (p.kept) evidence.push(ev(model, p.kept, "context", "Complementary kept partition"));
      }
      if (ret) evidence.push(ev(model, ret, "defect", `Returns (kept, \`${droppedVar}\`)`));

      let tracedSilent = 0;
      let tracedHandled = 0;
      let untraceable = 0;
      const siteNotes: string[] = [];
      for (const site of sites) {
        const container = enclosingFunc(site.model, site.call.lineno);
        if (!container) {
          untraceable++;
          siteNotes.push(`${site.model.path}:${site.call.lineno} (call at module level — usage could not be traced into a function)`);
          continue;
        }
        // Binding position: which tuple slot holds the dropped partition.
        // The unpack may be on the same line as the call (`a, b = f(...)`).
        const unpack = site.model.facts.find(
          (a) =>
            a.kind === "assign" &&
            a.enclosing === container.name &&
            a.lineno >= site.call.lineno &&
            (a.targets ?? []).length >= 2,
        );
        const retIdx = (ret?.returnNames ?? []).indexOf(droppedVar);
        const boundVar =
          unpack && retIdx >= 0 ? (unpack.targets ?? [])[retIdx] : undefined;
        if (!boundVar) {
          untraceable++;
          siteNotes.push(`${site.model.path}:${site.call.lineno} (return unpacking not traceable)`);
          continue;
        }
        const usages = classifyDropUsage(site.model, site.call, container, boundVar);
        const via = site.viaAlias ? ` via parameter \`${site.viaAlias}\`` : "";
        siteNotes.push(
          `${site.model.path}:${site.call.lineno}${via} — \`${boundVar}\` is ${usages.join("+")}`,
        );
        evidence.push(
          ev(site.model, site.call, "call_site", `\`${boundVar}\` usage after this call: ${usages.join(", ")}${via}`),
        );
        if (usages.includes("payload") || usages.includes("surfaced")) tracedHandled++;
        else tracedSilent++;
      }

      // No finding when every traced call site demonstrably handles the
      // dropped rows (payload flows into output, or a loud failure).
      if (sites.length > 0 && tracedSilent === 0 && untraceable === 0) continue;

      const confidence: Confidence =
        sites.length === 0 || untraceable > 0 ? "medium" : "high";
      const severity: Severity = untraceable > 0 || sites.length === 0 ? "risk" : "bug";
      findings.push({
        code: "SILENT_DROP",
        severity,
        title: `Partitioned rows silently drop out of the result`,
        file: model.path,
        line: f.lineno,
        endLine: f.endLineno,
        summary:
          `\`${f.name}\` splits input rows into kept and \`${droppedVar}\` via an exact-match membership test. ` +
          (severity === "bug"
            ? `At ${tracedSilent} traced call site${tracedSilent === 1 ? "" : "s"}, the \`${droppedVar}\` rows are only counted or have their ids listed — their payload never influences any computed output. Rows vanish from the metric without warning.` +
              (tracedHandled > 0
                ? ` (${tracedHandled} other call site${tracedHandled === 1 ? "" : "s"} handle${tracedHandled === 1 ? "s" : ""} the dropped rows.)`
                : "")
            : `Whether the \`${droppedVar}\` rows vanish silently depends on call sites the analyzer could not trace (see evidence).`),
        evidence,
        confidence,
        uncertainAbout:
          severity === "bug"
            ? undefined
            : sites.length === 0
              ? "No call sites of this function exist in the analyzed files, so downstream handling of the dropped partition is unknown."
              : `Call-site handling: ${siteNotes.join("; ")}`,
        suggestedFix:
          "Do not let the dropped partition vanish: reconcile it (normalize ids and re-match), or surface every dropped row for human review — a loud failure beats a silent one.",
        relatedCodes: ["FRAGILE_ID_JOIN"],
      });
    }
  }
  return findings;
}

function detectFragileJoin(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      // Set bindings in this function: name -> { iterable source, rhs source }.
      const setInfo = new Map<string, { iter: string; rhs: string }>();
      for (const a of model.facts.filter(
        (x) => x.kind === "assign" && x.enclosing === f.name && x.rhsKind === "SetComp",
      )) {
        const comp = compsForAssign(model, a).find((c) => c.compKind === "SetComp");
        const target = (a.targets ?? [])[0];
        if (target && comp?.iterSource)
          setInfo.set(target, {
            iter: comp.iterSource.replace(/\s+/g, ""),
            rhs: (a.rhsSource ?? "").replace(/\s+/g, ""),
          });
      }
      const normalizeCalls = model.facts.filter(
        (c) =>
          c.kind === "call" &&
          c.enclosing === f.name &&
          c.callee !== null &&
          c.callee !== undefined &&
          NORMALIZE_RE.test(c.callee),
      );
      const normalizedVars = new Set<string>();
      for (const a of model.facts.filter(
        (x) => x.kind === "assign" && x.enclosing === f.name,
      )) {
        if (
          a.rhsSource &&
          normalizeCalls.some((c) => a.rhsSource!.includes((c.callee ?? "").split(".").pop()!))
        ) {
          for (const t of a.targets ?? []) normalizedVars.add(t);
        }
      }

      for (const t of model.facts.filter(
        (x) => x.kind === "membership_test" && x.enclosing === f.name,
      )) {
        const left = (t.leftSource ?? "").replace(/\s+/g, "");
        const right = (t.rightSource ?? "").replace(/\s+/g, "");
        if (!left.includes("[") || !setInfo.has(right)) continue;
        // Iterable being tested: enclosing comprehension, else enclosing loop.
        const comp = model.facts.find(
          (c) =>
            c.kind === "comprehension" &&
            c.enclosing === f.name &&
            c.lineno <= t.lineno &&
            (c.endLineno ?? c.lineno) >= t.lineno,
        );
        const loop =
          comp ??
          model.facts.find(
            (c) =>
              c.kind === "loop" &&
              c.enclosing === f.name &&
              c.lineno <= t.lineno &&
              (c.endLineno ?? c.lineno) >= t.lineno,
          );
        const testIter = ((comp ?? loop)?.iterSource ?? "").replace(/\s+/g, "");
        const { iter: setIter, rhs: setRhs } = setInfo.get(right)!;
        if (testIter && testIter === setIter) continue; // same source — not cross-source
        // The set itself was built from normalized values — not fragile.
        if (NORMALIZE_RE.test(setRhs)) continue;
        // Normalization anywhere on the key path?
        const keyNormalized =
          NORMALIZE_RE.test(left) ||
          normalizeCalls.some((c) => left.includes((c.callee ?? "").split(".").pop()!)) ||
          [...normalizedVars].some((v) => left === v || left.startsWith(v + "[") || left.startsWith(v + ".")) ||
          [...normalizeCalls].some((c) =>
            (c.callArgs ?? []).some((a) => !!a && left.includes(a.replace(/\s+/g, ""))),
          );
        if (keyNormalized) continue;

        const setAssign = model.facts.find(
          (a) =>
            a.kind === "assign" &&
            a.enclosing === f.name &&
            (a.targets ?? []).includes(right),
        );
        // Bug-grade only when the test partitions input rows (a sibling
        // comprehension over the same iterable with the negated test) — there
        // the silent-exclusion mechanism is directly demonstrated. Otherwise
        // the analyzer cannot trace data flow between the two sources, so the
        // pattern is reported as a risk with the uncertainty stated.
        let isPartitioning = false;
        if (comp && testIter) {
          isPartitioning = model.facts.some(
            (c) =>
              c.kind === "comprehension" &&
              c !== comp &&
              c.enclosing === f.name &&
              (c.iterSource ?? "").replace(/\s+/g, "") === testIter &&
              testsInComp(model, c).some((t2) => t2.negated !== t.negated),
          );
        }
        const severity: Severity = isPartitioning ? "bug" : "risk";
        findings.push({
          code: "FRAGILE_ID_JOIN",
          severity,
          title: `Exact-match join across differently-sourced id sets`,
          file: model.path,
          line: t.lineno,
          summary:
            `\`${left}\` is matched against \`${right}\` with exact string equality, but the set was built from a different source (\`${setIter || "?"}\`) than the rows being tested (\`${testIter || "?"}\`). ` +
            `No normalization is applied on either side` +
            (isPartitioning
              ? `, so any formatting difference (prefixes, padding, case) silently excludes rows.`
              : `.`),
          evidence: [
            ...(setAssign ? [ev(model, setAssign, "defect", `Lookup set built from \`${setIter}\``)] : []),
            ev(model, t, "defect", `Exact-match membership test against rows from \`${testIter}\``),
          ],
          confidence: isPartitioning ? "high" : "medium",
          uncertainAbout: isPartitioning
            ? undefined
            : "The analyzer does not trace data flow between the two id sources. If both sets are already known to share one canonical format, this match is safe and the finding is a false positive.",
          suggestedFix:
            "Canonicalize both id sets to one format before comparing (strip prefixes, zero-pad, normalize case) — or reuse this codebase's existing normalization if one exists.",
        });
        break; // one finding per function is enough
      }
    }
  }
  return findings;
}

function detectLossyDefault(all: FileModel[], flagged: Set<string>): Finding[] {
  const findings: Finding[] = [];
  // Every default-arg value that is a bare name, anywhere.
  const allDefaultNames = new Set<string>();
  for (const m of all)
    for (const f of funcs(m))
      for (const p of f.defaultPairs ?? [])
        if (p.defSrc && BARE_NAME_RE.test(p.defSrc)) allDefaultNames.add(p.defSrc);

  for (const model of all) {
    for (const f of funcs(model)) {
      for (const p of f.defaultPairs ?? []) {
        const defName = p.defSrc;
        if (!defName || !BARE_NAME_RE.test(defName) || !flagged.has(defName)) continue;
        const alternatives: AstFact[] = [];
        for (const m of all) {
          for (const g of funcs(m)) {
            if (!g.name || !REMEDIATION_NAME_RE.test(g.name)) continue;
            if (allDefaultNames.has(g.name)) continue;
            const calledInF = model.facts.some(
              (c) => c.kind === "call" && c.enclosing === f.name && bareCallee(c.callee) === g.name,
            );
            if (calledInF) continue;
            alternatives.push(g);
          }
        }
        if (alternatives.length === 0) continue;
        const alt = alternatives[0]!;
        const altModel = all.find((m) => funcs(m).includes(alt))!;
        findings.push({
          code: "LOSSY_DEFAULT_WIRING",
          severity: "bug",
          title: `Default wiring selects the lossy implementation`,
          file: model.path,
          line: f.lineno,
          summary:
            `\`${f.name}\` defaults \`${p.arg}\` to \`${defName}\`, which is flagged as a lossy/exact-match implementation, while \`${alt.name}\` — the reconciled alternative — exists in the codebase but is never wired in. Callers that accept the default silently get the defective behavior.`,
          evidence: [
            ev(model, f, "defect", `Default parameter \`${p.arg} = ${defName}\``),
            ev(altModel, alt, "remediation", `Existing reconciled alternative, never used as the default`),
          ],
          confidence: "high",
          suggestedFix: `Change the default to \`${alt.name}\` (${altModel.path}:${alt.lineno}), or remove the default and require callers to choose explicitly.`,
          relatedCodes: ["SILENT_DROP", "FRAGILE_ID_JOIN"],
        });
      }
    }
  }
  return findings;
}

function detectMutableDefault(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      for (const p of f.defaultPairs ?? []) {
        const d = (p.defSrc ?? "").replace(/\s+/g, "");
        if (/^\[.*\]$/.test(d) || /^\{.*\}$/.test(d) || /^(list|dict|set)\(\)$/.test(d)) {
          findings.push({
            code: "MUTABLE_DEFAULT_ARG",
            severity: "bug",
            title: `Mutable default argument`,
            file: model.path,
            line: f.lineno,
            summary:
              `Parameter \`${p.arg}\` defaults to mutable \`${p.defSrc}\`. The default is created once at def time and shared across calls — mutations leak between invocations.`,
            evidence: [ev(model, f, "defect", `def …(${p.arg}=${p.defSrc}, …)`)],
            confidence: "high",
            suggestedFix: `Default \`${p.arg}\` to None and create a fresh container inside the body.`,
          });
        }
      }
    }
  }
  return findings;
}

function detectRiskyExcept(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const h of model.facts.filter((f) => f.kind === "except_handler")) {
      if (h.handlerType !== "bare" && !h.onlyPass) continue;
      findings.push({
        code: "RISKY_EXCEPT_HANDLER",
        severity: "risk",
        title: h.handlerType === "bare" ? "Bare `except:` clause" : "Exception handler swallows errors silently",
        file: model.path,
        line: h.lineno,
        summary:
          h.handlerType === "bare"
            ? "A bare `except:` catches everything including KeyboardInterrupt/SystemExit, hiding real failures."
            : "The handler body is just `pass` — any exception here disappears without a trace, including ones the caller needs to know about.",
        evidence: [ev(model, h, "defect")],
        confidence: "high",
        uncertainAbout: "Whether any caller depends on distinguishing these failures — the handler makes that impossible to tell.",
        suggestedFix: "Catch the narrowest exception type you expect and log or re-raise the rest.",
      });
    }
  }
  return findings;
}

function detectUncheckedSubscript(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      const loopVars = new Set<string>();
      for (const l of model.facts.filter(
        (x) => (x.kind === "loop" || x.kind === "comprehension") && x.enclosing === f.name,
      )) {
        const t = (l.target ?? "").replace(/\s+/g, "");
        if (BARE_NAME_RE.test(t)) loopVars.add(t);
      }
      const hasGet = new Set<string>();
      for (const c of model.facts.filter((x) => x.kind === "call" && x.enclosing === f.name)) {
        const m = (c.callee ?? "").match(/^([A-Za-z_]\w*)\.get$/);
        if (m) hasGet.add(m[1]!);
      }
      const guardedExc = model.facts.some(
        (x) =>
          x.kind === "except_handler" &&
          x.enclosing === f.name &&
          ["KeyError", "LookupError", "Exception"].includes(x.handlerType ?? ""),
      );
      const seen = new Set<number>();
      for (const s of model.facts.filter(
        (x) => x.kind === "subscript" && x.enclosing === f.name && typeof x.key === "string",
      )) {
        const base = s.base ?? "";
        const isLoopVar = loopVars.has(base);
        const isIngestParam =
          (f.args ?? []).includes(base) && /load|parse|fetch|ingest|read/i.test(f.name ?? "");
        if (!isLoopVar && !isIngestParam) continue;
        if (hasGet.has(base) || guardedExc) continue;
        if (seen.has(s.lineno)) continue;
        seen.add(s.lineno);
        findings.push({
          code: "UNCHECKED_SUBSCRIPT",
          severity: "risk",
          title: `Unchecked key access \`${base}["${s.key}"]\``,
          file: model.path,
          line: s.lineno,
          summary:
            `Reads \`${base}["${s.key}"]\` with no \`.get()\` fallback and no KeyError handling in \`${f.name}\`. A row missing the key raises KeyError at runtime.`,
          evidence: [ev(model, s, "defect")],
          confidence: "medium",
          uncertainAbout:
            "Whether upstream data is guaranteed to contain this key (e.g. csv headers usually are) — the analyzer cannot prove the input contract.",
          suggestedFix: `Use \`${base}.get("${s.key}")\` with an explicit policy for the missing case, or validate the row shape once at ingestion.`,
        });
      }
    }
  }
  return findings;
}

function detectSecurity(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const d of model.facts.filter((f) => f.kind === "dangerous_call")) {
      findings.push({
        code: "DANGEROUS_EVAL_EXEC",
        severity: "security",
        title: `Use of ${d.callee}()`,
        file: model.path,
        line: d.lineno,
        summary: `\`${d.callee}()\` executes a string as code. If any part of that string is influenced by outside input, it is arbitrary code execution.`,
        evidence: [ev(model, d, "defect")],
        confidence: "high",
        uncertainAbout: "Whether the evaluated string can ever contain untrusted input — if it is fully constructed from constants, the practical risk is lower.",
        suggestedFix: "Replace with explicit dispatch (a dict of callables, ast.literal_eval for data) so no string is ever executed.",
      });
    }
    for (const s of model.facts.filter((f) => f.kind === "subprocess_shell")) {
      findings.push({
        code: "SUBPROCESS_SHELL",
        severity: "security",
        title: "Subprocess with shell=True",
        file: model.path,
        line: s.lineno,
        summary: "Runs a shell command from a string with shell=True — shell metacharacters in any interpolated value become command injection.",
        evidence: [ev(model, s, "defect")],
        confidence: "high",
        uncertainAbout: "Whether the command string interpolates untrusted data; with pure constants the risk is contained but the pattern is still fragile.",
        suggestedFix: "Pass argv as a list and drop shell=True.",
      });
    }
    for (const p of model.facts.filter((f) => f.kind === "possible_secret")) {
      findings.push({
        code: "POSSIBLE_SECRET",
        severity: "security",
        title: `Possible hardcoded secret \`${p.name}\``,
        file: model.path,
        line: p.lineno,
        summary: `A string literal is assigned to a name that looks like a credential. If this is a real secret it is now in version control forever.`,
        evidence: [ev(model, p, "defect")],
        confidence: "medium",
        uncertainAbout: "Whether the value is a real credential or a placeholder/test value — the analyzer cannot tell; verify against your secret manager.",
        suggestedFix: "Move to environment configuration or a secret manager; rotate the value if it was ever real.",
      });
    }
  }
  return findings;
}

function detectComplexity(all: FileModel[]): Finding[] {
  const findings: Finding[] = [];
  for (const model of all) {
    for (const f of funcs(model)) {
      const cx = f.complexity ?? 1;
      const nest = f.maxNesting ?? 0;
      if (cx > 10 || nest > 4) {
        findings.push({
          code: "COMPLEXITY_HOTSPOT",
          severity: "note",
          title: `High complexity in \`${f.name}\``,
          file: model.path,
          line: f.lineno,
          endLine: f.endLineno,
          summary: `Cyclomatic complexity ${cx}, max nesting depth ${nest}. Hard to test exhaustively and easy to break.`,
          evidence: [ev(model, f, "context", `complexity=${cx}, max_nesting=${nest}`)],
          confidence: "high",
          suggestedFix: "Extract the inner branches into small named helpers with their own tests.",
        });
      }
    }
  }
  return findings;
}

function detectTestGaps(all: FileModel[], testModels: FileModel[]): Finding[] {
  if (testModels.length === 0) return [];
  const referenced = new Set<string>();
  for (const t of testModels) {
    for (const c of t.facts.filter((f) => f.kind === "call")) {
      const b = bareCallee(c.callee);
      if (b) referenced.add(b);
    }
    for (const i of t.facts.filter((f) => f.kind === "import")) {
      for (const n of i.importedNames ?? []) referenced.add(n);
    }
  }
  // Reachability from entrypoints: functions named `main` + module-level calls.
  const defsByName = new Map<string, AstFact[]>();
  for (const m of all) {
    if (testModels.includes(m)) continue;
    for (const f of funcs(m)) {
      const list = defsByName.get(f.name!) ?? [];
      list.push(f);
      defsByName.set(f.name!, list);
    }
  }
  const calleesOf = (enclosing: string, model: FileModel): string[] =>
    model.facts
      .filter((c) => c.kind === "call" && c.enclosing === enclosing)
      .map((c) => bareCallee(c.callee))
      .filter((n): n is string => !!n);
  const roots = new Set<string>();
  for (const m of all) {
    if (testModels.includes(m)) continue;
    for (const c of calleesOf("<module>", m)) roots.add(c);
    for (const f of funcs(m)) if (f.name === "main") roots.add("main");
  }
  const reachable = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (reachable.has(name)) continue;
    reachable.add(name);
    for (const m of all) {
      if (testModels.includes(m)) continue;
      const def = funcByName(m, name);
      if (def) for (const c of calleesOf(def.name!, m)) queue.push(c);
    }
  }

  const findings: Finding[] = [];
  for (const m of all) {
    if (testModels.includes(m)) continue;
    for (const f of funcs(m)) {
      const name = f.name!;
      if (name.startsWith("_") || name === "main") continue;
      if (referenced.has(name)) continue;
      if (!reachable.has(name) && (f.complexity ?? 1) < 3) continue;
      findings.push({
        code: "TEST_GAP",
        severity: "note",
        title: `No test references \`${name}\``,
        file: m.path,
        line: f.lineno,
        summary:
          `\`${name}\` is ${reachable.has(name) ? "reachable from an entrypoint" : "non-trivial"} but no test file calls or imports it. Behavior here is unverified.`,
        evidence: [ev(modelOf(all, f) ?? m, f, "context")],
        confidence: "medium",
        uncertainAbout: "Whether coverage exists outside the analyzed test files.",
        suggestedFix: `Add a test that exercises \`${name}\` directly, including its edge cases.`,
      });
    }
  }
  return findings;
}

function modelOf(all: FileModel[], fact: AstFact): FileModel | undefined {
  return all.find((m) => m.facts.includes(fact));
}

export interface DetectionInput {
  models: FileModel[];
  testModels: FileModel[];
}

export function runDetectors({ models, testModels }: DetectionInput): Finding[] {
  const silent = detectSilentDrop(models);
  const fragile = detectFragileJoin(models);
  // Flagged = function names carrying SILENT_DROP or FRAGILE_ID_JOIN.
  const flagged = new Set<string>();
  for (const f of [...silent, ...fragile]) {
    const m = models.find((x) => x.path === f.file);
    if (!m) continue;
    const firstDefect = f.evidence.find((e) => e.role === "defect");
    if (!firstDefect) continue;
    const fn = enclosingFunc(m, firstDefect.line);
    if (fn?.name) flagged.add(fn.name);
  }
  const lossy = detectLossyDefault(models, flagged);
  return [
    ...silent,
    ...fragile,
    ...lossy,
    ...detectMutableDefault(models),
    ...detectRiskyExcept(models),
    ...detectUncheckedSubscript(models),
    ...detectSecurity(models),
    ...detectComplexity(models),
    ...detectTestGaps(models, testModels),
  ].sort((a, b) => {
    const order: Record<Severity, number> = { bug: 0, security: 1, risk: 2, note: 3 };
    return order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || a.line - b.line;
  });
}
