"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import { patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";

type CheckState = "pending" | "ok" | "fail";

type Check = {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
};

function runEnvironmentChecks(): Check[] {
  const checks: Check[] = [];

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
        setChecks(runEnvironmentChecks());
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not run setup checks");
        setLoading(false);
      }
    })();
  }, [token, router]);

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
      <p className="mt-4 text-[14px] leading-relaxed text-white/60">
        The workspace runs Python in your browser (no install). Once you start, a 50-minute timer
        begins immediately — this is not paused by network hiccups.
      </p>

      {error && <p className="mt-6 text-[14px] text-[#fda4b0]">{error}</p>}

      {loading ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-12 rounded-[12px] bg-white/5" />
          <div className="h-12 rounded-[12px] bg-white/5" />
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-2.5">
            {checks.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/80 px-4 py-3 text-[13.5px]"
              >
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
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!allOk || starting}
            onClick={start}
            className="mt-8 inline-flex h-11 items-center rounded-[9px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start session — 50 minutes begins now"}
          </button>
          {!allOk && (
            <p className="mt-3 text-[12.5px] text-white/45">
              Fix the checks above (or switch browsers) before starting.
            </p>
          )}
        </>
      )}
    </main>
  );
}
