/**
 * Test stub for @/lib/supabase/admin.
 * Minimal chainable query builder over an in-memory table store.
 * Only supports what the traversed sim routes use: from().select().eq()
 * .in().gt().order().limit().maybeSingle()/.single().
 *
 * (2026-09-27) Added in() and gt() for the invitation inbox listing
 * (GET /api/sim/invitations/mine), which filters on status and expires_at.
 * gt() compares with JS `>` (ISO-8601 strings compare chronologically).
 */
type Row = Record<string, unknown>;

const tables: Record<string, Row[]> = {
  candidate_consents: [],
  preflight_checks: [],
  sim_invitations: [],
};

export function __seedAdminTable(table: string, rows: Row[]) {
  tables[table] = rows;
}

export function __resetAdminStore() {
  for (const k of Object.keys(tables)) tables[k] = [];
}

type Filter = { col: string; op: "eq" | "in" | "gt"; val: unknown };

class FakeQuery {
  private filters: Filter[] = [];
  constructor(private table: string) {}
  select(_cols?: string) {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push({ col, op: "eq", val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ col, op: "in", val: vals });
    return this;
  }
  gt(col: string, val: unknown) {
    this.filters.push({ col, op: "gt", val });
    return this;
  }
  order(_col: string, _opts?: unknown) {
    return this;
  }
  limit(_n: number) {
    return this;
  }
  private rows(): Row[] {
    return (tables[this.table] || []).filter((r) =>
      this.filters.every((f) => {
        const v = r[f.col];
        if (f.op === "eq") return v === f.val;
        if (f.op === "in") return (f.val as unknown[]).includes(v);
        return (v as string | number) > (f.val as string | number);
      })
    );
  }
  async maybeSingle() {
    const r = this.rows();
    return { data: r[0] ?? null, error: null };
  }
  async single() {
    const r = this.rows();
    return r.length > 0
      ? { data: r[0], error: null }
      : { data: null, error: new Error("no rows") };
  }
  // supabase-js builders are thenable: awaiting one executes it. The mine
  // route awaits the bare builder, so support it too.
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: (value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows(), error: null }).then(onfulfilled, onrejected);
  }
}

export function createAdminSupabaseClient() {
  return { from: (table: string) => new FakeQuery(table) };
}
