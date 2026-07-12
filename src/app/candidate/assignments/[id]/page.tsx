"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";

export default function CandidateAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<{
    id: string;
    deadline_at: string | null;
    status: string;
    state_version: number;
    submission_reference?: string | null;
  } | null>(null);
  const [memo, setMemo] = useState("");
  const [recommendation, setRecommendation] = useState("Hold");
  const [saveState, setSaveState] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<string>("—");

  async function start() {
    setError(null);
    const res = await fetch("/api/pilot/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", assignmentId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not start");
      return;
    }
    setSession(data.session);
  }

  useEffect(() => {
    if (!session?.deadline_at) return;
    const tick = () => {
      const ms = new Date(session.deadline_at!).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("00:00");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session?.deadline_at]);

  useEffect(() => {
    if (!session || session.status === "submitted") return;
    const handle = setTimeout(async () => {
      setSaveState("Saving…");
      const res = await fetch("/api/pilot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "autosave",
          sessionId: session.id,
          stateVersion: session.state_version,
          currentStage: "recommendation",
          sessionState: { memo, recommendation },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveState("Save failed — retrying");
        setError(data.error || "Autosave failed");
        return;
      }
      if (data.expired) {
        setSession(data.session);
        setSaveState("Autosubmitted on expiry");
        return;
      }
      if (data.conflict) {
        setSaveState("Synced newer server state");
        setSession(data.session);
        return;
      }
      setSession(data.session);
      setSaveState("Saved just now");
    }, 800);
    return () => clearTimeout(handle);
  }, [memo, recommendation, session]);

  async function submit() {
    if (!session) return;
    const res = await fetch("/api/pilot/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        sessionId: session.id,
        finalRecommendation: recommendation,
        executiveMemo: memo,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Submit failed");
      return;
    }
    setSession({ ...data.session, submission_reference: data.reference });
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[900px] bg-[#050609] px-5 py-8 text-[#F4F5F7]">
      <div className="flex items-center justify-between gap-4">
        <FydellBrand markSize={30} wordmarkSize={18} />
        <div className="text-right text-[12px] text-white/55">
          <p>Timer {remaining}</p>
          <p>{saveState}</p>
        </div>
      </div>

      <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Project Meridian
      </h1>
      <p className="mt-2 text-[14px] text-white/55">
        Server-timed session with durable autosave. Refresh resumes the same session.
      </p>

      {error ? <p className="mt-4 text-[13px] text-[#fda4b0]">{error}</p> : null}

      {!session ? (
        <button
          type="button"
          onClick={start}
          className="mt-8 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Begin Project Meridian
        </button>
      ) : session.status === "submitted" ? (
        <div className="mt-8 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5">
          <p className="text-[15px] font-medium text-white">Submission received</p>
          <p className="mt-2 text-[13px] text-white/60">
            Reference: {session.submission_reference || "—"}
          </p>
          <Link href="/login" className="mt-4 inline-block text-[13px] text-white/70 underline">
            Sign out
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <label className="block text-[13px] text-white/65">
            Recommendation
            <select
              className="platform-input mt-1.5"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
            >
              <option>Go</option>
              <option>Hold</option>
              <option>Revise</option>
            </select>
          </label>
          <label className="block text-[13px] text-white/65">
            Executive memo
            <textarea
              className="platform-input mt-1.5 min-h-[140px]"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Submit work trial
          </button>
        </div>
      )}
    </main>
  );
}
