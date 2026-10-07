import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/* Signed self-update. The updater only accepts packages signed with the
   public key in tauri.conf.json, fetched from the fixed release endpoint.
   Installing restarts the app, so the prompt is held back while a timed
   simulation is open and shown once the candidate is back on a safe screen. */

const FIRST_CHECK_DELAY_MS = 8_000;
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type State =
  | { kind: "idle" }
  | { kind: "available"; update: Update }
  | { kind: "installing"; update: Update; received: number; total: number | null }
  | { kind: "failed"; update: Update; message: string };

export default function UpdatePrompt({ hold }: { hold: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const checking = useRef(false);

  const runCheck = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const update = await check();
      if (update) {
        setState((prev) => (prev.kind === "idle" ? { kind: "available", update } : prev));
      }
    } catch {
      // Offline, rate-limited, or running outside the native shell: a failed
      // background check is not something the candidate can act on.
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void runCheck(), FIRST_CHECK_DELAY_MS);
    const repeat = setInterval(() => void runCheck(), RECHECK_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [runCheck]);

  const install = useCallback(async (update: Update) => {
    setState({ kind: "installing", update, received: 0, total: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setState({ kind: "installing", update, received: 0, total: event.data.contentLength ?? null });
        } else if (event.event === "Progress") {
          setState((prev) =>
            prev.kind === "installing"
              ? { ...prev, received: prev.received + event.data.chunkLength }
              : prev
          );
        }
      });
      await relaunch();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState({ kind: "failed", update, message });
    }
  }, []);

  if (state.kind === "idle") return null;
  if (hold && state.kind !== "installing") return null;
  if (state.kind === "available" && dismissedVersion === state.update.version) return null;

  const version = state.update.version;
  const percent =
    state.kind === "installing" && state.total
      ? Math.min(100, Math.round((state.received / state.total) * 100))
      : null;

  return (
    <div className="update-prompt" role="status" aria-live="polite">
      <div className="update-prompt-title">
        {state.kind === "installing" ? `Installing Fydell ${version}` : `Fydell ${version} is available`}
      </div>
      <div className="update-prompt-body">
        {state.kind === "available" &&
          "Installs in the background and restarts the app. Your files and sign-in are kept."}
        {state.kind === "installing" &&
          (percent != null ? `Downloading… ${percent}%` : "Downloading…")}
        {state.kind === "failed" && `The update didn't install: ${state.message}`}
      </div>
      {state.kind === "installing" && (
        <div className="update-prompt-bar" aria-hidden="true">
          <div style={{ width: `${percent ?? 8}%` }} />
        </div>
      )}
      {state.kind !== "installing" && (
        <div className="update-prompt-actions">
          <button className="btn ghost sm" onClick={() => {
            setDismissedVersion(version);
            setState({ kind: "available", update: state.update });
          }}>
            Later
          </button>
          <button className="btn sm" onClick={() => void install(state.update)}>
            {state.kind === "failed" ? "Try again" : "Install and restart"}
          </button>
        </div>
      )}
    </div>
  );
}
