/**
 * Persistence adapter contract.
 *
 * InMemory / localStorage are for development and internal lab reloads only.
 * They are NOT production evidence durability.
 * A future SupabaseSimulationPersistenceAdapter can implement this deliberately.
 */
import type { SimulationAttempt } from "../types";

export interface SimulationPersistenceAdapter {
  save(attempt: SimulationAttempt): Promise<void>;
  load(attemptId: string): Promise<SimulationAttempt | null>;
  list?(): Promise<string[]>;
  clear?(attemptId: string): Promise<void>;
}

export class InMemoryPersistenceAdapter implements SimulationPersistenceAdapter {
  private store = new Map<string, SimulationAttempt>();

  async save(attempt: SimulationAttempt): Promise<void> {
    this.store.set(attempt.id, structuredClone(attempt));
  }

  async load(attemptId: string): Promise<SimulationAttempt | null> {
    const v = this.store.get(attemptId);
    return v ? structuredClone(v) : null;
  }

  async list(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async clear(attemptId: string): Promise<void> {
    this.store.delete(attemptId);
  }
}

const LS_PREFIX = "fydell.sim-engine.dev.";

/**
 * Development-only. Survives reloads during internal testing.
 * Must not be described as production durability.
 */
export class LocalStoragePersistenceAdapter implements SimulationPersistenceAdapter {
  async save(attempt: SimulationAttempt): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${LS_PREFIX}${attempt.id}`, JSON.stringify(attempt));
    const index = await this.list();
    if (!index.includes(attempt.id)) {
      window.localStorage.setItem(`${LS_PREFIX}index`, JSON.stringify([...index, attempt.id]));
    }
  }

  async load(attemptId: string): Promise<SimulationAttempt | null> {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`${LS_PREFIX}${attemptId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SimulationAttempt;
    } catch {
      return null;
    }
  }

  async list(): Promise<string[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(`${LS_PREFIX}index`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  async clear(attemptId: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(`${LS_PREFIX}${attemptId}`);
  }
}
