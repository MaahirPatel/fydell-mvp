"use client";

export type RightTab = "customer" | "ai" | "evidence" | "requirements";

const TABS: { id: RightTab; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "ai", label: "AI workspace" },
  { id: "evidence", label: "Evidence trail" },
  { id: "requirements", label: "Requirements" },
];

export default function RightNav({ active, onChange }: { active: RightTab; onChange: (tab: RightTab) => void }) {
  return (
    <div className="flex border-b border-white/[0.06]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 border-b-2 px-2 py-2.5 text-[11.5px] font-medium transition-colors ${
            active === tab.id
              ? "border-[#3B5BFF] text-white"
              : "border-transparent text-white/40 hover:text-white/70"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
