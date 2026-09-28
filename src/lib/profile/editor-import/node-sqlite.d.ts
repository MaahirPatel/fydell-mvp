/**
 * Minimal declarations for `node:sqlite`, which is not present in the
 * `@types/node` v20 tree used here. Verified present at runtime on Node 22.6+
 * (this repo runs Node 24). Only the surface the editor importer uses is
 * declared; extend as needed.
 */
declare module "node:sqlite" {
  export interface StatementSync {
    all(...params: unknown[]): Array<Record<string, unknown>>;
  }
  export class DatabaseSync {
    constructor(path: string, options?: { readOnly?: boolean; open?: boolean });
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}
