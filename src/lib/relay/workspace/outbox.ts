/**
 * Durable IndexedDB command outbox — ordered, idempotent replay on reconnect.
 */

const DB_NAME = "fydell-relay-outbox";
const STORE = "commands";
const DB_VERSION = 1;

export type OutboxCommand = {
  commandId: string;
  sessionId: string;
  type: string;
  expectedHeadVersion: number;
  payload: Record<string, unknown>;
  actor: string;
  enqueuedAt: number;
  status: "pending" | "acked" | "failed";
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "commandId" });
        os.createIndex("sessionId", "sessionId", { unique: false });
        os.createIndex("status", "status", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IDB open failed"));
  });
}

export async function enqueueCommand(cmd: OutboxCommand): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...cmd, status: "pending" });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function ackCommand(commandId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(commandId);
    getReq.onsuccess = () => {
      const row = getReq.result as OutboxCommand | undefined;
      if (row) store.put({ ...row, status: "acked" });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function failCommand(commandId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(commandId);
    getReq.onsuccess = () => {
      const row = getReq.result as OutboxCommand | undefined;
      if (row) store.put({ ...row, status: "failed" });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listPending(sessionId: string): Promise<OutboxCommand[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxCommand[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("sessionId");
    const req = idx.getAll(sessionId);
    req.onsuccess = () => {
      const all = (req.result as OutboxCommand[]) || [];
      resolve(
        all
          .filter((c) => c.status === "pending")
          .sort((a, b) => a.enqueuedAt - b.enqueuedAt)
      );
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

/** Dynamic debounce: d = clamp(300, 1200, 900 - 15k) where k = keystrokes / 2s */
export function computeSaveDebounceMs(keystrokesLast2s: number): number {
  const d = 900 - 15 * keystrokesLast2s;
  return Math.max(300, Math.min(1200, d));
}
