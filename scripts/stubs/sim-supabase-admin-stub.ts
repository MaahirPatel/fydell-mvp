/**
 * Test stub for @/lib/supabase/admin.
 * Minimal chainable query builder over an in-memory table store.
 * Only supports what the traversed sim routes use: from().select().eq()
 * .order().limit().maybeSingle()/.single().
 */
type Row = Record<string, unknown>;

const tables: Record<string, Row[]> = {
  candidate_consents: [],
  preflight_checks: [],
};

export function __seedAdminTable(table: string, rows: Row[]) {
  tables[table] = rows;
}

export function __resetAdminStore() {
  for (const k of Object.keys(tables)) tables[k] = [];
}

class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  constructor(private table: string) {}
  select(_cols?: string) {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push([col, val]);
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
      this.filters.every(([c, v]) => r[c] === v)
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
}

export function createAdminSupabaseClient() {
  return { from: (table: string) => new FakeQuery(table) };
}
