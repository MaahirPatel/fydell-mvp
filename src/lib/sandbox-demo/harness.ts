import type { HarnessOutput, HarnessTest, RunOutcome, TestMeta, TestResult } from "./types";

/**
 * The test harness, kept as plain JavaScript source so the exact same code
 * runs inside the browser Web Worker and inside the Node unit tests. It
 * defines `runHarness(payload)`, which loads the task's files and runs the
 * registered tests. Nothing here touches the network or any storage.
 *
 * Two module styles are supported:
 * - CommonJS: `require("./a.js")`, `module.exports`, with `test` and `assert`
 *   available as globals in test files.
 * - ES modules in the Node style: `import test from "node:test"`,
 *   `import assert from "node:assert/strict"`, relative `import`s and
 *   `export function/const/class/default`. A small source transform turns
 *   static import and export statements into calls the loader understands.
 *   Statements must start at the beginning of a line; destructured exports
 *   and top-level await are reported as unsupported rather than guessed.
 */
export const HARNESS_SOURCE = String.raw`
async function runHarness(payload) {
  var started = Date.now();
  var logs = [];
  var files = payload && payload.files ? payload.files : {};
  var testFiles = payload && Array.isArray(payload.testFiles) ? payload.testFiles : [];
  var hasOwn = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); };

  function show(value, depth) {
    depth = depth || 0;
    if (typeof value === "string") return JSON.stringify(value);
    if (value === undefined) return "undefined";
    if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
    if (typeof value === "bigint") return String(value) + "n";
    if (typeof value === "symbol") return String(value);
    if (typeof value === "function") return "[Function" + (value.name ? ": " + value.name : " (anonymous)") + "]";
    if (value === null || typeof value !== "object") return String(value);
    if (value instanceof Error) return (value.name || "Error") + ": " + value.message;
    if (value instanceof Date) return isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    if (value instanceof RegExp) return String(value);
    if (depth > 3) return Array.isArray(value) ? "[Array]" : "[Object]";
    var parts = [];
    if (value instanceof Map) {
      value.forEach(function (v, k) { if (parts.length < 50) parts.push(show(k, depth + 1) + " => " + show(v, depth + 1)); });
      return "Map(" + value.size + ") {" + (parts.length ? " " + parts.join(", ") + " " : "") + "}";
    }
    if (value instanceof Set) {
      value.forEach(function (v) { if (parts.length < 50) parts.push(show(v, depth + 1)); });
      return "Set(" + value.size + ") {" + (parts.length ? " " + parts.join(", ") + " " : "") + "}";
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length && i < 50; i++) parts.push(show(value[i], depth + 1));
      if (value.length > 50) parts.push("... " + (value.length - 50) + " more");
      return "[" + parts.join(", ") + "]";
    }
    var keys = Object.keys(value);
    for (var k = 0; k < keys.length && k < 50; k++) {
      var key = keys[k];
      parts.push((/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)) + ": " + show(value[key], depth + 1));
    }
    return parts.length ? "{ " + parts.join(", ") + " }" : "{}";
  }
  function plain(value) { return typeof value === "string" ? value : show(value); }
  function record() {
    if (logs.length >= 200) return;
    logs.push(Array.prototype.map.call(arguments, plain).join(" "));
  }
  var sandboxConsole = { log: record, info: record, warn: record, error: record, debug: record, trace: record, dir: record, table: record };
  var sandboxProcess = { env: {}, argv: [], nextTick: function (fn) { var args = Array.prototype.slice.call(arguments, 1); Promise.resolve().then(function () { fn.apply(null, args); }); } };

  function describe(error) {
    if (error && typeof error === "object" && typeof error.message === "string") {
      var name = typeof error.name === "string" && error.name !== "Error" ? error.name + ": " : "";
      return name + error.message;
    }
    return "Thrown value: " + show(error);
  }

  // ---------- assert ----------

  function AssertionError(options) {
    var error = new Error(options.message);
    error.name = "AssertionError";
    error.code = "ERR_ASSERTION";
    error.actual = options.actual;
    error.expected = options.expected;
    error.operator = options.operator;
    return error;
  }
  function fail(message, fallback, actual, expected, operator) {
    if (message instanceof Error) throw message;
    throw AssertionError({ message: message === undefined ? fallback : String(message), actual: actual, expected: expected, operator: operator });
  }
  function isDeep(a, b, strict, memo) {
    if (Object.is(a, b)) return true;
    var objA = typeof a === "object" && a !== null;
    var objB = typeof b === "object" && b !== null;
    if (!objA || !objB) {
      if (strict || objA || objB) return false;
      return a == b || (a !== a && b !== b);
    }
    if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    var tag = Object.prototype.toString.call(a);
    if (tag !== Object.prototype.toString.call(b)) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime() || (isNaN(a.getTime()) && isNaN(b.getTime()));
    if (a instanceof RegExp) return String(a) === String(b) && a.lastIndex === b.lastIndex;
    if (a instanceof Error && (a.message !== b.message || a.name !== b.name)) return false;
    if (typeof a.valueOf === "function" && (a instanceof Number || a instanceof String || a instanceof Boolean) && !Object.is(a.valueOf(), b.valueOf())) return false;
    memo = memo || [];
    for (var m = 0; m < memo.length; m++) if (memo[m][0] === a && memo[m][1] === b) return true;
    memo.push([a, b]);
    if (a instanceof Map) {
      if (a.size !== b.size) return false;
      var mapOk = true;
      a.forEach(function (v, k) { if (mapOk && (!b.has(k) || !isDeep(v, b.get(k), strict, memo))) mapOk = false; });
      if (!mapOk) return false;
    } else if (a instanceof Set) {
      if (a.size !== b.size) return false;
      var setOk = true;
      a.forEach(function (v) {
        if (!setOk || b.has(v)) return;
        if (typeof v !== "object" || v === null) { setOk = false; return; }
        var found = false;
        b.forEach(function (w) { if (!found && isDeep(v, w, strict, memo)) found = true; });
        if (!found) setOk = false;
      });
      if (!setOk) return false;
    }
    var ka = Object.keys(a);
    var kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      if (!hasOwn(b, ka[i]) || !isDeep(a[ka[i]], b[ka[i]], strict, memo)) return false;
    }
    return true;
  }
  function checkError(error, expected, message, verb) {
    if (expected === undefined) return;
    if (expected instanceof RegExp) {
      if (!expected.test(String(error))) fail(message, "The error did not match " + String(expected) + ". Got " + show(error), error, expected, verb);
      return;
    }
    if (typeof expected === "function") {
      if (expected.prototype !== undefined && error instanceof expected) return;
      if (expected === Error || Error.isPrototypeOf(expected)) {
        fail(message, "The error is expected to be an instance of " + show(expected.name) + ". Got " + show(error), error, expected, verb);
      }
      if (expected.call({}, error) === true) return;
      fail(message, "The validation function rejected the error: " + show(error), error, expected, verb);
    }
    if (typeof expected === "object" && expected !== null) {
      var keys = Object.keys(expected);
      for (var i = 0; i < keys.length; i++) {
        var want = expected[keys[i]];
        var got = error === null || error === undefined ? undefined : error[keys[i]];
        var ok = want instanceof RegExp && typeof got === "string" ? want.test(got) : isDeep(got, want, true);
        if (!ok) fail(message, "Expected the error's " + keys[i] + " to be " + show(want) + ", got " + show(got), error, expected, verb);
      }
      return;
    }
    throw new TypeError("The expected error must be a RegExp, a function, an object or an Error class");
  }
  function makeAssert(strict) {
    function equalValues(a, b) { return strict ? Object.is(a, b) : a == b || (a !== a && b !== b); }
    function assert(value, message) {
      if (!value) fail(message, arguments.length === 0 ? "No value argument passed to assert.ok()" : "Expected a truthy value, got " + show(value), value, true, "==");
    }
    assert.ok = function ok(value, message) {
      if (!value) fail(message, arguments.length === 0 ? "No value argument passed to assert.ok()" : "Expected a truthy value, got " + show(value), value, true, "==");
    };
    assert.strictEqual = function strictEqual(actual, expected, message) {
      if (!Object.is(actual, expected)) fail(message, "Expected values to be strictly equal:\n\n" + show(actual) + " !== " + show(expected), actual, expected, "strictEqual");
    };
    assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
      if (Object.is(actual, expected)) fail(message, "Expected " + show(actual) + " to be strictly unequal to " + show(expected), actual, expected, "notStrictEqual");
    };
    assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
      if (!isDeep(actual, expected, true)) fail(message, "Expected values to be strictly deep-equal:\n+ actual\n- expected\n\n+ " + show(actual) + "\n- " + show(expected), actual, expected, "deepStrictEqual");
    };
    assert.notDeepStrictEqual = function notDeepStrictEqual(actual, expected, message) {
      if (isDeep(actual, expected, true)) fail(message, "Expected " + show(actual) + " not to be strictly deep-equal to " + show(expected), actual, expected, "notDeepStrictEqual");
    };
    assert.equal = strict ? assert.strictEqual : function equal(actual, expected, message) {
      if (!equalValues(actual, expected)) fail(message, show(actual) + " == " + show(expected), actual, expected, "==");
    };
    assert.notEqual = strict ? assert.notStrictEqual : function notEqual(actual, expected, message) {
      if (equalValues(actual, expected)) fail(message, show(actual) + " != " + show(expected), actual, expected, "!=");
    };
    assert.deepEqual = strict ? assert.deepStrictEqual : function deepEqual(actual, expected, message) {
      if (!isDeep(actual, expected, false)) fail(message, "Expected values to be loosely deep-equal:\n\n" + show(actual) + "\n\nshould loosely deep-equal\n\n" + show(expected), actual, expected, "deepEqual");
    };
    assert.notDeepEqual = strict ? assert.notDeepStrictEqual : function notDeepEqual(actual, expected, message) {
      if (isDeep(actual, expected, false)) fail(message, "Expected " + show(actual) + " not to loosely deep-equal " + show(expected), actual, expected, "notDeepEqual");
    };
    assert.throws = function throws(fn, expected, message) {
      if (typeof fn !== "function") throw new TypeError("The \"fn\" argument must be of type function");
      if (typeof expected === "string") { message = expected; expected = undefined; }
      var threw = false;
      var error;
      try { fn(); } catch (e) { threw = true; error = e; }
      if (!threw) fail(message, "Missing expected exception" + (expected && expected.name ? " (" + expected.name + ")." : "."), undefined, expected, "throws");
      checkError(error, expected, message, "throws");
    };
    assert.doesNotThrow = function doesNotThrow(fn, message) {
      if (typeof fn !== "function") throw new TypeError("The \"fn\" argument must be of type function");
      try { fn(); } catch (e) { fail(typeof message === "string" ? message : undefined, "Got unwanted exception: " + describe(e), e, undefined, "doesNotThrow"); }
    };
    assert.rejects = async function rejects(promiseOrFn, expected, message) {
      if (typeof expected === "string") { message = expected; expected = undefined; }
      var promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
      if (!promise || typeof promise.then !== "function") throw new TypeError("assert.rejects needs a promise or a function that returns one");
      try {
        await promise;
      } catch (e) {
        checkError(e, expected, message, "rejects");
        return;
      }
      fail(message, "Missing expected rejection" + (expected && expected.name ? " (" + expected.name + ")." : "."), undefined, expected, "rejects");
    };
    assert.doesNotReject = async function doesNotReject(promiseOrFn, message) {
      var promise = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;
      try { await promise; } catch (e) { fail(typeof message === "string" ? message : undefined, "Got unwanted rejection: " + describe(e), e, undefined, "doesNotReject"); }
    };
    assert.match = function match(string, regexp, message) {
      if (!(regexp instanceof RegExp)) throw new TypeError("The \"regexp\" argument must be an instance of RegExp");
      if (typeof string !== "string") fail(message, "The \"string\" argument must be of type string. Received " + show(string), string, regexp, "match");
      regexp.lastIndex = 0;
      if (!regexp.test(string)) fail(message, "The input did not match the regular expression " + String(regexp) + ". Input:\n\n" + show(string), string, regexp, "match");
    };
    assert.doesNotMatch = function doesNotMatch(string, regexp, message) {
      if (!(regexp instanceof RegExp)) throw new TypeError("The \"regexp\" argument must be an instance of RegExp");
      if (typeof string !== "string") fail(message, "The \"string\" argument must be of type string. Received " + show(string), string, regexp, "doesNotMatch");
      regexp.lastIndex = 0;
      if (regexp.test(string)) fail(message, "The input was expected to not match the regular expression " + String(regexp) + ". Input:\n\n" + show(string), string, regexp, "doesNotMatch");
    };
    assert.fail = function (message) { fail(message, "Failed", undefined, undefined, "fail"); };
    assert.AssertionError = AssertionError;
    return assert;
  }
  var strictAssert = makeAssert(true);
  var looseAssert = makeAssert(false);
  strictAssert.strict = strictAssert;
  looseAssert.strict = strictAssert;

  // ---------- node:test ----------

  function newSuite(name, parent) {
    return { name: name, parent: parent, before: [], after: [], beforeEach: [], afterEach: [], started: false, beforeError: null };
  }
  function readArgs(args) {
    var name;
    var options = {};
    var fn;
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      if (typeof a === "string") name = a;
      else if (typeof a === "function") fn = a;
      else if (a && typeof a === "object") options = a;
    }
    if (name === undefined) name = fn && fn.name ? fn.name : "<anonymous>";
    return { name: name, options: options, fn: fn };
  }
  function makeTestApi(ctx) {
    function current() { return ctx.stack.length ? ctx.stack[ctx.stack.length - 1] : ctx.root; }
    function test() {
      var entry = readArgs(arguments);
      if (!entry.options.skip && !entry.options.todo) ctx.tests.push({ name: entry.name, fn: entry.fn, chain: [ctx.root].concat(ctx.stack) });
      return Promise.resolve();
    }
    function describe() {
      var entry = readArgs(arguments);
      if (entry.options.skip || entry.options.todo) return Promise.resolve();
      var suite = newSuite(entry.name, current());
      ctx.suites.push(suite);
      ctx.stack.push(suite);
      try {
        if (typeof entry.fn === "function") entry.fn({ name: entry.name });
      } finally {
        ctx.stack.pop();
      }
      return Promise.resolve();
    }
    function skip() { return Promise.resolve(); }
    function hook(kind) { return function (fn) { if (typeof fn === "function") current()[kind].push(fn); }; }
    test.skip = skip;
    test.todo = skip;
    test.only = test;
    describe.skip = skip;
    describe.todo = skip;
    describe.only = describe;
    var api = {
      test: test,
      it: test,
      describe: describe,
      suite: describe,
      before: hook("before"),
      after: hook("after"),
      beforeEach: hook("beforeEach"),
      afterEach: hook("afterEach"),
    };
    test.test = test;
    test.it = test;
    test.describe = describe;
    test.suite = describe;
    test.before = api.before;
    test.after = api.after;
    test.beforeEach = api.beforeEach;
    test.afterEach = api.afterEach;
    return test;
  }
  function invoke(fn, context) {
    if (typeof fn !== "function") return Promise.reject(new Error("test() needs a function"));
    if (fn.length >= 2) {
      return new Promise(function (resolve, reject) {
        var done = function (err) { if (err) reject(err); else resolve(); };
        var returned = fn(context, done);
        if (returned && typeof returned.then === "function") returned.then(null, reject);
      });
    }
    return Promise.resolve().then(function () { return fn(context); });
  }
  function makeContext(name) {
    var context = {
      name: name,
      fullName: name,
      assert: strictAssert,
      diagnostic: function (message) { record(String(message)); },
      plan: function () {},
      skip: function () {},
      todo: function () {},
      test: function () {
        var entry = readArgs(arguments);
        if (entry.options.skip || entry.options.todo) return Promise.resolve();
        return invoke(entry.fn, makeContext(entry.name)).catch(function (e) {
          throw new Error("Subtest " + JSON.stringify(entry.name) + " failed: " + describe(e));
        });
      },
    };
    return context;
  }

  // ---------- modules ----------

  var IDENT = "[A-Za-z_$][\\w$]*";
  function newlines(text) {
    var count = 0;
    for (var i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++;
    return new Array(count + 1).join("\n");
  }
  function stripComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  }
  function unquote(name) { return name.replace(/^["']|["']$/g, ""); }
  function readList(inner, path) {
    return stripComments(inner).split(",").map(function (p) { return p.trim(); }).filter(Boolean).map(function (part) {
      var m = new RegExp("^(" + IDENT + "|\"[^\"]*\"|'[^']*')(?:\\s+as\\s+(" + IDENT + "|\"[^\"]*\"|'[^']*'))?$").exec(part);
      if (!m) throw new SyntaxError(path + ": cannot read the import or export list { " + inner.trim() + " }");
      return { from: unquote(m[1]), to: unquote(m[2] || m[1]) };
    });
  }

  /**
   * Rewrites static import and export statements. Returns the code and
   * whether the file is an ES module. Line numbers are preserved.
   */
  function transformModule(source, path) {
    var exported = [];
    var counter = 0;
    var esm = false;
    function exportName(name, expr) { exported.push([name, expr]); }
    function nextId() { return "__m" + counter++; }
    var out = source;

    out = out.replace(/^import\s*(["'])([^"'\n]+)\1[ \t]*;?/gm, function (all, q, spec) {
      esm = true;
      return "__import(" + JSON.stringify(spec) + ");";
    });
    out = out.replace(/^import\s+([\w$*\s{},]+?)\s*from\s*(["'])([^"'\n]+)\2[ \t]*;?/gm, function (all, clause, q, spec) {
      esm = true;
      var id = nextId();
      var names = [];
      var parts = [];
      var rest = clause.trim();
      var def = new RegExp("^(" + IDENT + ")\\s*(?:,\\s*|$)").exec(rest);
      if (def) {
        names.push("default");
        parts.push("const " + def[1] + " = " + id + ".default;");
        rest = rest.slice(def[0].length).trim();
      }
      if (rest) {
        var ns = new RegExp("^\\*\\s*as\\s+(" + IDENT + ")$").exec(rest);
        if (ns) {
          parts.push("const " + ns[1] + " = " + id + ";");
        } else if (/^\{[\s\S]*\}$/.test(rest)) {
          readList(rest.slice(1, -1), path).forEach(function (s) {
            names.push(s.from);
            parts.push("const " + s.to + " = " + id + "[" + JSON.stringify(s.from) + "];");
          });
        } else {
          throw new SyntaxError(path + ": cannot read the import " + JSON.stringify(clause.trim()));
        }
      }
      return "const " + id + " = __import(" + JSON.stringify(spec) + ", " + JSON.stringify(names) + "); " + parts.join(" ") + newlines(all);
    });

    out = out.replace(new RegExp("^export\\s*\\*\\s*as\\s+(" + IDENT + ")\\s+from\\s*([\"'])([^\"'\\n]+)\\2[ \\t]*;?", "gm"), function (all, name, q, spec) {
      esm = true;
      var id = nextId();
      exportName(name, id);
      return "const " + id + " = __import(" + JSON.stringify(spec) + ");";
    });
    out = out.replace(/^export\s*\*\s*from\s*(["'])([^"'\n]+)\1[ \t]*;?/gm, function (all, q, spec) {
      esm = true;
      return "__exportStar(__import(" + JSON.stringify(spec) + "));";
    });
    out = out.replace(/^export\s*\{([^}]*)\}\s*from\s*(["'])([^"'\n]+)\2[ \t]*;?/gm, function (all, inner, q, spec) {
      esm = true;
      var id = nextId();
      var list = readList(inner, path);
      list.forEach(function (s) { exportName(s.to, id + "[" + JSON.stringify(s.from) + "]"); });
      return "const " + id + " = __import(" + JSON.stringify(spec) + ", " + JSON.stringify(list.map(function (s) { return s.from; })) + ");" + newlines(all);
    });
    out = out.replace(/^export\s*\{([^}]*)\}[ \t]*;?/gm, function (all, inner) {
      esm = true;
      readList(inner, path).forEach(function (s) { exportName(s.to, s.from); });
      return newlines(all);
    });
    out = out.replace(new RegExp("^export\\s+default\\s+(async\\s+)?function\\b(\\s*\\*)?\\s*(" + IDENT + ")?", "gm"), function (all, isAsync, star, name) {
      esm = true;
      var local = name || "__default";
      exportName("default", local);
      return (isAsync || "") + "function" + (star ? "*" : "") + " " + local;
    });
    out = out.replace(new RegExp("^export\\s+default\\s+class\\b\\s*(" + IDENT + ")?", "gm"), function (all, name) {
      esm = true;
      var local = name && name !== "extends" ? name : "__default";
      exportName("default", local);
      return "class " + local + (name === "extends" ? " extends" : "");
    });
    out = out.replace(/^export\s+default\s+/gm, function () {
      esm = true;
      exportName("default", "__default");
      return "const __default = ";
    });
    out = out.replace(new RegExp("^export\\s+(async\\s+)?function\\b(\\s*\\*)?\\s*(" + IDENT + ")", "gm"), function (all, isAsync, star, name) {
      esm = true;
      exportName(name, name);
      return (isAsync || "") + "function" + (star ? "*" : "") + " " + name;
    });
    out = out.replace(new RegExp("^export\\s+class\\s+(" + IDENT + ")", "gm"), function (all, name) {
      esm = true;
      exportName(name, name);
      return "class " + name;
    });
    out = out.replace(/^export\s+(const|let|var)\s+([^\s=;,]+)/gm, function (all, kind, rest) {
      esm = true;
      if (!new RegExp("^" + IDENT + "$").test(rest)) {
        throw new SyntaxError(path + ": destructured exports are not supported in the browser runner. Export each name on its own.");
      }
      exportName(rest, rest);
      return kind + " " + rest;
    });
    if (/^export\b/m.test(out)) throw new SyntaxError(path + ": this export form is not supported in the browser runner");
    if (/^await\b/m.test(out) && esm) throw new SyntaxError(path + ": top-level await is not supported in the browser runner");

    if (!esm) return { code: source, esm: false };
    var header = exported.map(function (e) {
      return "Object.defineProperty(exports, " + JSON.stringify(e[0]) + ", { enumerable: true, get: function () { return " + e[1] + "; } });";
    }).join(" ");
    return { code: "\"use strict\"; " + header + " " + out, esm: true };
  }

  var SHADOWED = ["self", "globalThis", "postMessage", "fetch", "importScripts", "XMLHttpRequest", "WebSocket"];
  var OUTER = ["test", "assert", "process"].concat(SHADOWED);
  var INNER = ["module", "exports", "require", "__import", "__exportStar", "console"];
  function compile(code, path) {
    try {
      return new Function(OUTER.join(","), "return function (" + INNER.join(",") + ") {" + code + "\n};\n//# sourceURL=" + path);
    } catch (e) {
      throw new Error(path + ": " + describe(e));
    }
  }

  function normalize(path) {
    var parts = path.split("/");
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === "" || part === ".") continue;
      if (part === "..") out.pop(); else out.push(part);
    }
    return out.join("/");
  }
  function dirname(path) {
    var i = path.lastIndexOf("/");
    return i === -1 ? "" : path.slice(0, i);
  }
  function namespaceOf(value) {
    var ns = { default: value };
    if (value && (typeof value === "object" || typeof value === "function")) {
      Object.keys(value).forEach(function (k) { if (k !== "default") ns[k] = value[k]; });
    }
    return ns;
  }

  function makeLoader(fromPath, ctx) {
    function builtin(spec) {
      if (spec === "node:test") return ctx.testApi;
      if (spec === "node:assert/strict" || spec === "assert/strict") return strictAssert;
      if (spec === "node:assert" || spec === "assert") return looseAssert;
      return null;
    }
    function resolve(spec) {
      if (typeof spec !== "string" || (spec.indexOf("./") !== 0 && spec.indexOf("../") !== 0)) {
        throw new Error("Cannot load " + show(spec) + " from " + fromPath + ": only files in this task, node:test and node:assert are available in the browser runner");
      }
      var base = normalize(dirname(fromPath) + "/" + spec);
      var options = [base, base + ".js", base + ".mjs", base + ".cjs", base + "/index.js"];
      for (var i = 0; i < options.length; i++) if (hasOwn(files, options[i])) return options[i];
      throw new Error("Cannot find module " + show(spec) + " from " + fromPath);
    }
    function load(target) {
      if (hasOwn(ctx.cache, target)) return ctx.cache[target];
      var transformed;
      try {
        transformed = transformModule(String(files[target]), target);
      } catch (e) {
        throw new Error(describe(e));
      }
      var module = { exports: {} };
      var rec = { module: module, esm: transformed.esm };
      ctx.cache[target] = rec;
      var factory = compile(transformed.code, target)(ctx.testApi, strictAssert, sandboxProcess);
      var child = makeLoader(target, ctx);
      factory(module, module.exports, child.require, child.importer, exportStar(module.exports), sandboxConsole);
      return rec;
    }
    function exportStar(target) {
      return function (ns) {
        Object.keys(ns).forEach(function (k) {
          if (k === "default" || hasOwn(target, k)) return;
          Object.defineProperty(target, k, { enumerable: true, get: function () { return ns[k]; } });
        });
      };
    }
    function require(spec) {
      var b = builtin(spec);
      if (b) return b;
      return load(resolve(spec)).module.exports;
    }
    function importer(spec, names) {
      var b = builtin(spec);
      var ns;
      if (b) {
        ns = namespaceOf(b);
      } else {
        var rec = load(resolve(spec));
        ns = rec.esm ? rec.module.exports : namespaceOf(rec.module.exports);
      }
      if (names) {
        for (var i = 0; i < names.length; i++) {
          if (!(names[i] in ns)) throw new SyntaxError("The requested module " + JSON.stringify(spec) + " does not provide an export named " + JSON.stringify(names[i]));
        }
      }
      return ns;
    }
    return { require: require, importer: importer, load: load };
  }

  // ---------- run ----------

  var tests = [];
  var fileErrors = [];
  for (var f = 0; f < testFiles.length; f++) {
    var testPath = testFiles[f];
    var ctx = { cache: {}, tests: [], suites: [], stack: [], root: newSuite("", null), testApi: null };
    ctx.testApi = makeTestApi(ctx);
    try {
      if (!hasOwn(files, testPath)) throw new Error("Test file " + testPath + " is missing");
      makeLoader(testPath, ctx).load(testPath);
    } catch (e) {
      fileErrors.push({ file: testPath, message: describe(e) });
      continue;
    }
    for (var t = 0; t < ctx.tests.length; t++) {
      var entry = ctx.tests[t];
      var t0 = Date.now();
      var error = null;
      var failed = false;
      try {
        for (var s = 0; s < entry.chain.length; s++) {
          var suite = entry.chain[s];
          if (!suite.started) {
            suite.started = true;
            try {
              for (var h = 0; h < suite.before.length; h++) await suite.before[h]({ name: suite.name });
            } catch (e) {
              suite.beforeError = e;
            }
          }
          if (suite.beforeError) throw new Error("A before hook failed: " + describe(suite.beforeError));
        }
        for (var s2 = 0; s2 < entry.chain.length; s2++) {
          for (var h2 = 0; h2 < entry.chain[s2].beforeEach.length; h2++) await entry.chain[s2].beforeEach[h2](makeContext(entry.name));
        }
        await invoke(entry.fn, makeContext(entry.name));
      } catch (e) {
        failed = true;
        error = e;
      }
      for (var s3 = entry.chain.length - 1; s3 >= 0; s3--) {
        for (var h3 = 0; h3 < entry.chain[s3].afterEach.length; h3++) {
          try {
            await entry.chain[s3].afterEach[h3](makeContext(entry.name));
          } catch (e) {
            if (!failed) { failed = true; error = e; }
          }
        }
      }
      tests.push({ file: testPath, name: entry.name, status: failed ? "fail" : "pass", message: failed ? describe(error) : null, durationMs: Date.now() - t0 });
    }
    var allSuites = [ctx.root].concat(ctx.suites);
    for (var a = allSuites.length - 1; a >= 0; a--) {
      if (!allSuites[a].started) continue;
      for (var h4 = 0; h4 < allSuites[a].after.length; h4++) {
        try { await allSuites[a].after[h4]({ name: allSuites[a].name }); } catch (e) { record("An after hook failed: " + describe(e)); }
      }
    }
  }
  return { tests: tests, fileErrors: fileErrors, logs: logs, durationMs: Date.now() - started };
}
`;

/** Worker bootstrap: removes network and storage entry points, then answers one message. */
export const WORKER_SOURCE =
  HARNESS_SOURCE +
  String.raw`
(function () {
  var reply = self.postMessage.bind(self);
  ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches", "BroadcastChannel"].forEach(function (key) {
    try { Object.defineProperty(self, key, { value: undefined, configurable: false, writable: false }); } catch (e) {}
  });
  self.onmessage = function (event) {
    runHarness(event.data).then(
      function (output) { reply({ ok: true, output: output }); },
      function (error) { reply({ ok: false, message: error && error.message ? error.message : String(error) }); }
    );
  };
})();
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHarnessTest(value: unknown): HarnessTest | null {
  if (!isRecord(value)) return null;
  const { file, name, status, message, durationMs } = value;
  if (typeof file !== "string" || typeof name !== "string") return null;
  if (status !== "pass" && status !== "fail") return null;
  const text = message === null ? null : typeof message === "string" ? message : undefined;
  if (text === undefined || typeof durationMs !== "number") return null;
  return { file, name, status, message: text, durationMs };
}

/** Narrows whatever `runHarness` returned. */
export function parseHarnessOutput(value: unknown): HarnessOutput | null {
  if (!isRecord(value)) return null;
  const { tests, fileErrors, logs, durationMs } = value;
  if (!Array.isArray(tests) || !Array.isArray(fileErrors) || !Array.isArray(logs) || typeof durationMs !== "number") return null;
  const parsedTests: HarnessTest[] = [];
  for (const t of tests) {
    const parsed = parseHarnessTest(t);
    if (!parsed) return null;
    parsedTests.push(parsed);
  }
  const parsedErrors: HarnessOutput["fileErrors"] = [];
  for (const e of fileErrors) {
    if (!isRecord(e)) return null;
    const { file, message } = e;
    if (typeof file !== "string" || typeof message !== "string") return null;
    parsedErrors.push({ file, message });
  }
  return {
    tests: parsedTests,
    fileErrors: parsedErrors,
    logs: logs.filter((l): l is string => typeof l === "string"),
    durationMs,
  };
}

/** Narrows a message posted by the worker. */
export function parseWorkerMessage(value: unknown): RunOutcome {
  if (!isRecord(value)) return { kind: "error", message: "The test worker sent an unreadable message." };
  if (value.ok === true) {
    const output = parseHarnessOutput(value.output);
    return output ? { kind: "completed", output } : { kind: "error", message: "The test worker sent unreadable results." };
  }
  return { kind: "error", message: typeof value.message === "string" ? value.message : "The test worker failed." };
}

/**
 * One result per expected test. Tests that could not load (a syntax error, a
 * missing export) or that never reported are failures with the reason, and a
 * timeout fails every test because the run as a whole did not finish.
 */
export function completeResults(expected: TestMeta[], outcome: RunOutcome): TestResult[] {
  if (outcome.kind === "timeout") {
    const seconds = Math.round(outcome.timeoutMs / 100) / 10;
    return expected.map((m) => ({
      id: m.id,
      status: "fail",
      message: "The run was stopped after " + seconds + " s without finishing. Look for a loop that never ends.",
      durationMs: 0,
    }));
  }
  if (outcome.kind === "error") {
    return expected.map((m) => ({ id: m.id, status: "fail", message: outcome.message, durationMs: 0 }));
  }
  const { tests, fileErrors } = outcome.output;
  return expected.map((m) => {
    const hit = tests.find((t) => t.file === m.file && t.name === m.name);
    if (hit) return { id: m.id, status: hit.status, message: hit.message, durationMs: hit.durationMs };
    const fileError = fileErrors.find((e) => e.file === m.file);
    return {
      id: m.id,
      status: "fail",
      message: fileError ? "Could not load the test file: " + fileError.message : "This test did not report a result.",
      durationMs: 0,
    };
  });
}
