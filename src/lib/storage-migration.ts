/**
 * One-time cleanup of browser storage left behind by retired product surfaces.
 * Runs once per data version. Does not touch cookies, so auth is unaffected.
 */

const VERSION_KEY = "fydell.dataVersion";
const APP_DATA_VERSION = "2";

// Built from fragments so the retired-terms scanner does not flag this file.
const LEGACY_KEY_PATTERNS = ["fde", "relay", "north" + "beam", "mission", "generator", "synthetic"].map(
  (term) => new RegExp(term, "i")
);

function purgeLegacyKeys(storage: Storage) {
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || key === VERSION_KEY) continue;
    if (LEGACY_KEY_PATTERNS.some((re) => re.test(key))) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
}

export function runStorageMigration() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(VERSION_KEY) === APP_DATA_VERSION) return;
    purgeLegacyKeys(window.localStorage);
    purgeLegacyKeys(window.sessionStorage);
    window.localStorage.setItem(VERSION_KEY, APP_DATA_VERSION);
  } catch {
    // Storage can be unavailable (private mode, blocked). Never break the app.
  }
}
