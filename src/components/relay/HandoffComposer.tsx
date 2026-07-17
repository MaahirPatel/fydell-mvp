"use client";

const FIELDS: { key: "summary" | "recommendation" | "followUps"; label: string; placeholder: string }[] = [
  {
    key: "summary",
    label: "Summary",
    placeholder: "What did you ship, and what state is it in?",
  },
  {
    key: "recommendation",
    label: "Recommendation",
    placeholder: "What should happen before this goes to production?",
  },
  {
    key: "followUps",
    label: "Follow-ups",
    placeholder: "What's left unresolved, and who should pick it up?",
  },
];

export default function HandoffComposer({
  handoff,
  onChange,
}: {
  handoff: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const filledCount = FIELDS.filter((f) => (handoff[f.key] || "").trim().length > 0).length;

  return (
    <div className="mx-auto max-w-[720px] space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-medium text-white">Handoff composer</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            This is what the reviewer reads first. Be honest about residual risk — vague or overclaiming
            handoffs read as a signal too.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/45">
          {filledCount}/{FIELDS.length} filled
        </span>
      </div>
      {FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">{field.label}</span>
          <textarea
            value={handoff[field.key] || ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={5}
            className="mt-1.5 w-full resize-none rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-[13px] leading-relaxed text-white/80 placeholder:text-white/25"
          />
        </label>
      ))}
    </div>
  );
}
