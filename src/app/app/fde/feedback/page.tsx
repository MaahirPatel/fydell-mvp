"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "bug", label: "Something's broken" },
  { value: "idea", label: "Feature idea" },
  { value: "confusing", label: "Something was confusing" },
  { value: "other", label: "Other" },
];

export default function FdeFeedbackPage() {
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fde/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit feedback");
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[600px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Feedback</p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Tell us what's working
      </h1>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
        This goes straight to the team building Fydell — not a support queue. Report bugs,
        request something, or flag anything that was confusing.
      </p>

      {sent ? (
        <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-6 text-center">
          <h2 className="text-[18px] font-semibold text-white">Thanks — that's on record.</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-white/55">
            We read every submission. If it needs a reply, we'll reach you at your account email.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-5 text-[13px] font-medium text-[#8FA3FF] hover:underline"
          >
            Send another
          </button>
        </section>
      ) : (
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">Category</span>
            <select
              className="platform-input mt-1.5"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">What happened?</span>
            <textarea
              className="platform-input mt-1.5 min-h-[140px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Be specific — what were you doing, what did you expect, what happened instead?"
              required
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
            disabled={busy || message.trim().length < 5}
            className="inline-flex h-11 w-fit items-center rounded-[10px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </div>
  );
}
