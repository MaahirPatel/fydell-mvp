"use client";

import { useState } from "react";
import type { HiringDecision } from "@/lib/mvp/types";

const OPTIONS: { value: HiringDecision; label: string }[] = [
  { value: "not_decided", label: "Not decided" },
  { value: "advance", label: "Advance" },
  { value: "hold", label: "Hold" },
  { value: "reject", label: "Reject" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" }
];

export default function DecisionControls({
  attemptId,
  current
}: {
  attemptId: string;
  current: HiringDecision;
}) {
  const [decision, setDecision] = useState<HiringDecision>(current);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function update(next: HiringDecision) {
    setDecision(next);
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/mvp/attempts/${attemptId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: next })
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => update(o.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              decision === o.value
                ? "border-navy bg-navy text-white"
                : "border-line text-ink-2 hover:border-navy"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {saving ? "Saving…" : saved ? "Saved." : "Marking “Hired” starts the outcome check-in clock."}
      </p>
    </div>
  );
}
