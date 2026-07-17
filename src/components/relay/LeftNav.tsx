"use client";

export type LeftTab = "brief" | "files" | "requirements" | "evaluations" | "deployment_notes" | "handoff";

const TABS: { id: LeftTab; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "files", label: "Files" },
  { id: "requirements", label: "Requirements" },
  { id: "evaluations", label: "Evaluations" },
  { id: "deployment_notes", label: "Deployment notes" },
  { id: "handoff", label: "Handoff" },
];

export default function LeftNav({
  active,
  onChange,
  badges,
}: {
  active: LeftTab;
  onChange: (tab: LeftTab) => void;
  /** Optional small status badge per tab, e.g. file count or eval status. */
  badges?: Partial<Record<LeftTab, string>>;
}) {
  return (
    <nav className="p-2">
      <p className="px-2 pb-2 pt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/35">
        Workspace
      </p>
      <ul className="space-y-0.5">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const badge = badges?.[tab.id];
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-left text-[13px] transition-colors ${
                  isActive ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
                }`}
              >
                <span>{tab.label}</span>
                {badge && (
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                      isActive ? "bg-white/15 text-white/80" : "bg-white/[0.06] text-white/40"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
