"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function NewMissionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [customerContext, setCustomerContext] = useState("");
  const [successMeasures, setSuccessMeasures] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const createRes = await fetch("/api/fde/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, objective, customerContext, successMeasures }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Could not create mission");

      const missionId = createData.mission.id;
      const submitRes = await fetch(`/api/fde/missions/${missionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_review" }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Could not submit mission for review");

      router.push(`/app/employer/missions/${missionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        New mission
      </p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Describe the real work
      </h1>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
        Be specific. This is submitted for review before you can invite an FDE.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4">
        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Mission title</span>
          <input
            className="platform-input mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rebuild the customer churn triage workflow"
            required
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Objective</span>
          <textarea
            className="platform-input mt-1.5 min-h-[100px] resize-y"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="What does the FDE need to accomplish?"
            required
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">
            Customer context <span className="text-white/35">(optional)</span>
          </span>
          <textarea
            className="platform-input mt-1.5 min-h-[80px] resize-y"
            value={customerContext}
            onChange={(e) => setCustomerContext(e.target.value)}
            placeholder="Who is this for, and what constraints matter?"
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">
            Success measures <span className="text-white/35">(optional)</span>
          </span>
          <textarea
            className="platform-input mt-1.5 min-h-[80px] resize-y"
            value={successMeasures}
            onChange={(e) => setSuccessMeasures(e.target.value)}
            placeholder="How will you know this was done well?"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-[#fb7185]/40 bg-[#fb7185]/15 px-3.5 py-2.5 text-[13px] font-medium text-[#fecdd3]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group mt-1 inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#3B5BFF] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Create and submit for review"}
          {!loading && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </button>
      </form>
    </div>
  );
}
