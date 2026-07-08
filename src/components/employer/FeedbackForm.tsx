"use client";

import { useState } from "react";

const QUESTIONS = [
  "Was this more useful than what you normally receive at the screening stage?",
  "Did it change which candidates you would have advanced?",
  "Would you pay for this as part of your standard hiring process?"
];

function Rating({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} out of 5`}
          className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-all duration-150 ${
            value >= n
              ? "border-teal bg-teal text-white"
              : "border-line bg-white text-ink-2 hover:border-line-strong"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackForm({ token }: { token: string }) {
  const [ratings, setRatings] = useState<number[]>([0, 0, 0]);
  const [texts, setTexts] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function setRating(i: number, v: number) {
    setRatings((r) => r.map((x, idx) => (idx === i ? v : x)));
  }
  function setText(i: number, v: string) {
    setTexts((t) => t.map((x, idx) => (idx === i ? v : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (ratings.some((r) => r === 0)) {
      setError("Please rate all three questions.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1_rating: ratings[0],
          q1_text: texts[0],
          q2_rating: ratings[1],
          q2_text: texts[1],
          q3_rating: ratings[2],
          q3_text: texts[2]
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit feedback.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal/25 bg-teal/5 p-6 text-center">
        <h3 className="text-lg text-navy">Thank you</h3>
        <p className="mt-1 text-sm text-ink-2">
          Your feedback was recorded and the Fydell team has been notified.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      {QUESTIONS.map((q, i) => (
        <div key={i}>
          <p className="text-sm font-semibold text-navy">{q}</p>
          <div className="mt-2.5">
            <Rating value={ratings[i]} onChange={(v) => setRating(i, v)} />
          </div>
          <textarea
            value={texts[i]}
            onChange={(e) => setText(i, e.target.value)}
            rows={2}
            placeholder="Add a comment (optional)..."
            className="mt-2.5 w-full resize-y rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue"
          />
        </div>
      ))}

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-2.5 text-sm text-coral-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-navy px-6 font-semibold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:bg-teal disabled:opacity-45"
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        Submit feedback
      </button>
    </form>
  );
}
