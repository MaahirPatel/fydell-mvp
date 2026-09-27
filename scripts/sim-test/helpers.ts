/**
 * Minimal test harness for the sim grind tests.
 * Run: npx tsx --require ./scripts/sim-test/preload.cjs scripts/test-sim-grind-<name>.ts
 * Exit code is non-zero on any failure; prints per-assertion failures and a summary.
 */

export class Harness {
  private passed = 0;
  private failed = 0;
  private failures: string[] = [];
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  ok(cond: unknown, label: string, detail?: string): void {
    if (cond) {
      this.passed++;
    } else {
      this.failed++;
      this.failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    }
  }

  eq<T>(actual: T, expected: T, label: string): void {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    this.ok(a === e, label, a === e ? undefined : `expected ${e}, got ${a}`);
  }

  throws(fn: () => unknown, label: string, match?: RegExp): void {
    try {
      fn();
      this.ok(false, label, "expected throw, nothing thrown");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.ok(!match || match.test(msg), label, `threw "${msg}" (wanted ${match})`);
    }
  }

  summary(): number {
    console.log(`\n[${this.name}] ${this.passed} passed, ${this.failed} failed`);
    for (const f of this.failures) console.log(`  FAIL: ${f}`);
    return this.failed === 0 ? 0 : 1;
  }
}

export function finish(code: number): never {
  process.exit(code);
}
