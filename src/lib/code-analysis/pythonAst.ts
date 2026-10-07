/**
 * Code-analysis prototype - Python AST bridge.
 *
 * Runs an embedded stdlib-only `ast` walker over each target file and returns
 * a stream of typed facts (function defs, calls, assignments, comprehensions,
 * membership tests, exception handlers, …) with line numbers. The target
 * code is PARSED, never executed. If python3 is missing or the file has a
 * syntax error, the caller gets an honest structured error, not a crash.
 */
import { execFile } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { AstFact } from "./types";

const DUMPER = `
import ast, json, re, sys

with open(sys.argv[1], encoding="utf-8") as fh:
    payload = json.load(fh)
SOURCE = payload["source"]

def seg(node):
    try:
        s = ast.get_source_segment(SOURCE, node)
    except Exception:
        return None
    if s is None:
        return None
    s = " ".join(s.split())
    return s if len(s) <= 220 else s[:217] + "..."

def dotted(node):
    parts = []
    while isinstance(node, ast.Attribute):
        parts.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        parts.append(node.id)
        return ".".join(reversed(parts))
    return None

facts = []
func_stack = []
depth = 0

def enclosing_name():
    return ".".join(f["qual"] for f in func_stack) if func_stack else "<module>"

def cur():
    return func_stack[-1] if func_stack else None

def bump(n=1):
    f = cur()
    if f is not None:
        f["decisions"] += n

def emit(kind, lineno, **kw):
    fact = {"kind": kind, "lineno": lineno, "enclosing": enclosing_name()}
    fact.update(kw)
    facts.append(fact)
    return fact

class V(ast.NodeVisitor):
    def visit_FunctionDef(self, node):
        self._func(node)
    def visit_AsyncFunctionDef(self, node):
        self._func(node)

    def _func(self, node):
        global depth
        args = node.args
        plain = list(args.posonlyargs) + list(args.args)
        pairs = []
        nd = len(args.defaults)
        for i, a in enumerate(plain):
            di = i - (len(plain) - nd)
            pairs.append({"arg": a.arg, "defSrc": seg(args.defaults[di]) if di >= 0 else None})
        for a, d in zip(args.kwonlyargs, args.kw_defaults):
            pairs.append({"arg": a.arg, "defSrc": seg(d) if d is not None else None})
        doc = ast.get_docstring(node)
        rec = {"qual": node.name, "decisions": 0, "maxdepth": 0}
        fact = emit("func_def", node.lineno, name=node.name,
                    endLineno=node.end_lineno,
                    args=[p["arg"] for p in pairs], defaultPairs=pairs,
                    docstring=(doc.split("\\n")[0][:160] if doc else None))
        func_stack.append(rec)
        saved = depth
        depth = 0
        for stmt in node.body:
            self.visit(stmt)
        rec["maxdepth"] = max(rec["maxdepth"], depth)
        depth = saved
        func_stack.pop()
        fact["complexity"] = rec["decisions"] + 1
        fact["maxNesting"] = rec["maxdepth"]

    def _block(self, node):
        global depth
        f = cur()
        depth += 1
        if f is not None and depth > f["maxdepth"]:
            f["maxdepth"] = depth
        self.generic_visit(node)
        depth -= 1

    def visit_If(self, node):
        bump(1)
        self._block(node)
    def visit_For(self, node):
        bump(1)
        emit("loop", node.lineno, endLineno=node.end_lineno, target=seg(node.target), iterSource=seg(node.iter))
        self._block(node)
    def visit_AsyncFor(self, node):
        bump(1)
        emit("loop", node.lineno, endLineno=node.end_lineno, target=seg(node.target), iterSource=seg(node.iter))
        self._block(node)
    def visit_While(self, node):
        bump(1)
        self._block(node)
    def visit_With(self, node):
        self._block(node)
    def visit_AsyncWith(self, node):
        self._block(node)
    def visit_Assert(self, node):
        bump(1)
        self.generic_visit(node)
    def visit_IfExp(self, node):
        bump(1)
        self.generic_visit(node)
    def visit_BoolOp(self, node):
        bump(max(0, len(node.values) - 1))
        self.generic_visit(node)
    def visit_Match(self, node):
        bump(len(node.cases))
        self.generic_visit(node)

    def _try(self, node):
        bump(len(node.handlers))
        for h in node.handlers:
            htype = dotted(h.type) if h.type is not None else "bare"
            only_pass = len(h.body) == 1 and isinstance(h.body[0], ast.Pass)
            emit("except_handler", h.lineno, handlerType=htype, onlyPass=only_pass)
        self._block(node)
    def visit_Try(self, node):
        self._try(node)
    def visit_TryStar(self, node):
        self._try(node)

    def visit_Return(self, node):
        v = node.value
        names = []
        kind = type(v).__name__ if v is not None else "None"
        if isinstance(v, ast.Tuple):
            names = [e.id for e in v.elts if isinstance(e, ast.Name)]
        elif isinstance(v, ast.Name):
            names = [v.id]
        emit("return", node.lineno, returnKind=kind, returnNames=names)
        if v is not None:
            self.visit(v)

    def _assign(self, targets_node, value, lineno, visit_value):
        names = [n.id for n in ast.walk(targets_node) if isinstance(n, ast.Name)]
        rhs_kind = type(value).__name__
        rhs_src = seg(value)
        emit("assign", lineno, targets=names, rhsKind=rhs_kind, rhsSource=rhs_src)
        if isinstance(value, ast.Constant) and isinstance(value.value, str):
            for t in names:
                if re.search(r"password|secret|api[_-]?key|apikey|passwd|token", t, re.I):
                    emit("possible_secret", lineno, name=t)
        if visit_value:
            self.visit(value)

    def visit_Assign(self, node):
        for i, t in enumerate(node.targets):
            self._assign(t, node.value, node.lineno, i == 0)
    def visit_AnnAssign(self, node):
        if node.value is not None:
            self._assign(node.target, node.value, node.lineno, True)
        else:
            self.generic_visit(node)
    def visit_AugAssign(self, node):
        self.generic_visit(node)

    def visit_Call(self, node):
        callee = dotted(node.func)
        emit("call", node.lineno, callee=callee,
             callArgs=[seg(a) for a in node.args],
             callKeywords=[k.arg for k in node.keywords])
        if callee in ("eval", "exec"):
            emit("dangerous_call", node.lineno, callee=callee)
        if callee is not None and "subprocess" in callee:
            for k in node.keywords:
                if k.arg == "shell" and isinstance(k.value, ast.Constant) and k.value.value is True:
                    emit("subprocess_shell", node.lineno, callee=callee)
        if callee == "open":
            mode = None
            for k in node.keywords:
                if k.arg == "mode":
                    mode = seg(k.value)
            emit("open_call", node.lineno, mode=mode)
        self.generic_visit(node)

    def visit_Subscript(self, node):
        base = node.value.id if isinstance(node.value, ast.Name) else seg(node.value)
        sl = node.slice
        key = sl.value if isinstance(sl, ast.Constant) else None
        emit("subscript", node.lineno, base=base,
             key=key if isinstance(key, (str, int)) else None)
        self.generic_visit(node)

    def visit_Compare(self, node):
        ops = [type(o).__name__ for o in node.ops]
        if any(o in ("In", "NotIn") for o in ops):
            emit("membership_test", node.lineno,
                 leftSource=seg(node.left),
                 rightSource=seg(node.comparators[0]) if node.comparators else None,
                 negated=any(o == "NotIn" for o in ops))
        self.generic_visit(node)

    def _comp(self, node, kind):
        for gen in node.generators:
            emit("comprehension", node.lineno, compKind=kind,
                 endLineno=node.end_lineno,
                 target=seg(gen.target), iterSource=seg(gen.iter),
                 conditions=[seg(c) for c in gen.ifs])
            bump(len(gen.ifs))
            self.visit(gen.iter)
            for c in gen.ifs:
                self.visit(c)
        self.visit(node.elt)
        for gen in node.generators:
            self.visit(gen.target)
    def visit_ListComp(self, node):
        self._comp(node, "ListComp")
    def visit_SetComp(self, node):
        self._comp(node, "SetComp")
    def visit_GeneratorExp(self, node):
        self._comp(node, "GeneratorExp")
    def visit_DictComp(self, node):
        for gen in node.generators:
            emit("comprehension", node.lineno, compKind="DictComp",
                 endLineno=node.end_lineno,
                 target=seg(gen.target), iterSource=seg(gen.iter),
                 conditions=[seg(c) for c in gen.ifs])
            bump(len(gen.ifs))
            self.visit(gen.iter)
            for c in gen.ifs:
                self.visit(c)
        self.visit(node.key)
        self.visit(node.value)
        for gen in node.generators:
            self.visit(gen.target)

    def visit_Import(self, node):
        emit("import", node.lineno, module=None,
             importedNames=[a.asname or a.name.split(".")[0] for a in node.names])
        self.generic_visit(node)
    def visit_ImportFrom(self, node):
        emit("import", node.lineno, module=node.module,
             importedNames=[a.asname or a.name for a in node.names])
        self.generic_visit(node)

try:
    tree = ast.parse(SOURCE)
except SyntaxError as e:
    print(json.dumps({"parseError": {"lineno": e.lineno or 1, "message": e.msg}}))
    sys.exit(0)

V().visit(tree)
print(json.dumps({"facts": facts}))
`;

export interface AstResult {
  facts: AstFact[] | null;
  parseError: { line: number; message: string } | null;
  /** Set when python3 itself is unavailable - the analysis cannot run. */
  engineError: string | null;
}

/** Alias kept for readability at call sites. */
export type ExtractionResult = AstResult;

function runDumper(source: string): Promise<AstResult> {
  return new Promise((resolve) => {
    let dir = "";
    const finish = (result: AstResult) => {
      if (dir) rm(dir, { recursive: true, force: true }).catch(() => {});
      resolve(result);
    };
    mkdtemp(join(tmpdir(), "fydell-ast-"))
      .then((d) => {
        dir = d;
        const inputPath = join(d, "input.json");
        return writeFile(inputPath, JSON.stringify({ source }), "utf8").then(() => inputPath);
      })
      .then(
        (inputPath) =>
          new Promise<void>((done) => {
            execFile(
              "python3",
              ["-c", DUMPER, inputPath],
              { timeout: 20000, maxBuffer: 16 * 1024 * 1024 },
              (error, stdout, _stderr) => {
                done();
                if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
                  finish({ facts: null, parseError: null, engineError: "python3 not found on PATH" });
                  return;
                }
                if (error) {
                  finish({
                    facts: null,
                    parseError: null,
                    engineError: `AST walker failed: ${String((error as Error).message).slice(0, 200)}`,
                  });
                  return;
                }
                try {
                  const parsed = JSON.parse(stdout) as {
                    facts?: AstFact[];
                    parseError?: { lineno: number; message: string };
                  };
                  if (parsed.parseError) {
                    finish({
                      facts: null,
                      parseError: { line: parsed.parseError.lineno, message: parsed.parseError.message },
                      engineError: null,
                    });
                    return;
                  }
                  finish({ facts: parsed.facts ?? [], parseError: null, engineError: null });
                } catch {
                  finish({ facts: null, parseError: null, engineError: "AST walker returned invalid JSON" });
                }
              },
            );
          }),
      )
      .catch((e: unknown) =>
        finish({
          facts: null,
          parseError: null,
          engineError: `AST setup failed: ${String(e).slice(0, 160)}`,
        }),
      );
  });
}

export async function extractFacts(source: string): Promise<AstResult> {
  return runDumper(source);
}
