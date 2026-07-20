"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";

type CheckState = "pending" | "ok" | "fail";

type Check = {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
};

/** Simple UA sniff — good enough to catch the browsers we know break Pyodide/Monaco. */
function detectSupportedBrowser(): { ok: boolean; label: string } {
  if (typeof navigator === "undefined") return { ok: true, label: "Unknown" };
  const ua = navigator.userAgent;
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !/OPR\//.test(ua) && !isEdge;
  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  if (isEdge) return { ok: true, label: "Edge" };
  if (isChrome) return { ok: true, label: "Chrome" };
  if (isFirefox) return { ok: false, label: "Firefox" };
  if (isSafari) return { ok: false, label: "Safari" };
  return { ok: false, label: "your browser" };
}

function runEnvironmentChecks(): Check[] {
  const checks: Check[] = [];

  const browser = detectSupportedBrowser();
  checks.push({
    id: "browser",
    label: "Browser (Chrome or Edge required)",
    state: browser.ok ? "ok" : "fail",
    detail: browser.ok ? undefined : `${browser.label} is not supported yet — switch to Chrome or Edge.`,
  });

  checks.push({
    id: "wasm",
    label: "WebAssembly support",
    state: typeof WebAssembly !== "undefined" ? "ok" : "fail",
  });

  let storageOk = false;
  try {
    window.localStorage.setItem("__relay_check__", "1");
    window.localStorage.removeItem("__relay_check__");
    storageOk = true;
  } catch {
    storageOk = false;
  }
  checks.push({ id: "storage", label: "Local autosave storage", state: storageOk ? "ok" : "fail" });

  checks.push({
    id: "network",
    label: "Network connection",
    state: navigator.onLine ? "ok" : "fail",
  });

  return checks;
}

export default function RelayPreflightPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState<number>(55);

  useEffect(() => {
    (async () => {
      try {
        const { sessionId: id, status } = await resolveSessionByToken(token);
        const stage = stageForStatus(status);
        if (stage === "workspace" || stage === "submitted") {
          router.replace(`/s/${token}/${stage}`);
          return;
        }
        if (stage === "consent") {
          router.replace(`/s/${token}/consent`);
          return;
        }
        setSessionId(id);
        await patchSession(id, "start_preflight");
        try {
          const data = await fetchSession(id);
          if (typeof data.durationMinutes === "number" && data.durationMinutes > 0) {
            setDurationMinutes(data.durationMinutes);
          }
        } catch {
          // non-fatal — fall back to the default duration shown above
        }
        setChecks(runEnvironmentChecks());
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not run setup checks");
        setLoading(false);
      }
    })();
  }, [token, router]);

  const browserCheck = checks.find((c) => c.id === "browser");
  const browserUnsupported = browserCheck?.state === "fail";
  // Hard-fail: an unsupported browser blocks starting the session outright —
  // the timer only ever starts from the explicit "Start session" click below,
  // and that control stays disabled while this is true.
  const allOk = checks.length > 0 && checks.every((c) => c.state === "ok");

  async function start() {
    if (!sessionId) return;
    setStarting(true);
    setError(null);
    try {
      await patchSession(sessionId, "begin");
      router.push(`/s/${token}/workspace`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the session");
      setStarting(false);
    }
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[680px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />
      <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Setup
      </p>
      <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Environment check
      </h1>
      <p className="mt-1.5 text-[13px] text-white/45">Northbeam Logistics · Forward Deployed Engineer deployment</p>
      <p className="mt-4 text-[14px] leading-relaxed text-white/60">
        Project Relay runs real Python in your browser (no install) via Pyodide — this needs
        Chrome or Edge. Once you explicitly start below, a {durationMinutes}-minute timer begins —
        it is not paused by network hiccups.
      </p>

      {error && <p className="mt-6 text-[14px] text-[#fda4b0]">{error}</p>}

      {loading ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-12 rounded-[12px] bg-white/5" />
          <div className="h-12 rounded-[12px] bg-white/5" />
        </div>
      ) : (
        <>
          {browserUnsupported && (
            <div className="mt-6 rounded-[12px] border border-[#fda4b0]/30 bg-[#fda4b0]/[0.08] px-4 py-3.5">
              <p className="text-[13.5px] font-semibold text-[#fda4b0]">
                This browser isn&apos;t supported — you can&apos;t start the session here.
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">
                Project Relay requires Chrome or Edge to run Python in the browser reliably. The
                {" "}
                {durationMinutes}-minute timer will not start until you reopen this exact link in
                Chrome or Edge and pass this check.
              </p>
            </div>
          )}

          <ul className="mt-8 space-y-2.5">
            {checks.map((c) => (
              <li
                key={c.id}
                className="rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/80 px-4 py-3 text-[13.5px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white/80">{c.label}</span>
                  <span
                    className={
                      c.state === "ok"
                        ? "text-[#8EE4B8]"
                        : c.state === "fail"
                          ? "text-[#fda4b0]"
                          : "text-white/40"
                    }
                  >
                    {c.state === "ok" ? "Ready" : c.state === "fail" ? "Unavailable" : "Checking…"}
                  </span>
                </div>
                {c.detail && <p className="mt-1 text-[12px] text-white/45">{c.detail}</p>}
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!allOk || starting}
            onClick={start}
            className="mt-8 inline-flex h-11 items-center rounded-[9px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {starting ? "Starting…" : `Start session — ${durationMinutes} minutes begins now`}
          </button>
          {!allOk && (
            <p className="mt-3 text-[12.5px] text-white/45">
              Fix the checks above (or switch to Chrome or Edge) before starting.
            </p>
          )}
        </>
      )}
    </main>
  );
}
