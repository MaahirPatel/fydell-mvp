"use client";

const FIELDS: { key: "approach" | "risks" | "testStrategy"; label: string; placeholder: string }[] = [
  { key: "approach", label: "Approach", placeholder: "What are you deploying, and why this cut first?" },
  { key: "risks", label: "Risks", placeholder: "What could go wrong, and what did you check for?" },
  { key: "testStrategy", label: "Test strategy", placeholder: "How are you verifying this before it ships?" },
];

export default function DeploymentNotesPanel({
  notes,
  onChange,
}: {
  notes: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mx-auto max-w-[720px] space-y-5 p-6">
      <div>
        <h2 className="text-[17px] font-medium text-white">Deployment notes</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-white/50">
          Autosaved with the rest of your workspace state. These are read as evidence of scoping and risk
          awareness, not graded on length.
        </p>
      </div>
      {FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">{field.label}</span>
          <textarea
            value={notes[field.key] || ""}
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
