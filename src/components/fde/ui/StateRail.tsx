import { Check } from "lucide-react";

export type MissionStage = {
  key: string;
  label: string;
};

export const MISSION_STAGES: MissionStage[] = [
  { key: "defined", label: "Mission defined" },
  { key: "invited", label: "Invited" },
  { key: "active", label: "Active" },
  { key: "evidence", label: "Evidence" },
  { key: "decision", label: "Decision" },
];

/**
 * Horizontal rail through the employer golden path.
 * `currentIndex` is the highest stage reached (0-based, into `stages`).
 * Pass -1 when nothing has happened yet (no mission at all).
 */
export default function StateRail({
  currentIndex,
  stages = MISSION_STAGES,
}: {
  currentIndex: number;
  stages?: MissionStage[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-y-4">
      {stages.map((stage, i) => {
        const status = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        const isLast = i === stages.length - 1;

        return (
          <li key={stage.key} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors " +
                  (status === "done"
                    ? "bg-[#3B5BFF] text-white"
                    : status === "current"
                      ? "bg-[#3B5BFF]/15 text-[#B8C4FF] ring-1 ring-inset ring-[#3B5BFF]/60"
                      : "bg-white/[0.04] text-white/35 ring-1 ring-inset ring-white/10")
                }
              >
                {status === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={
                  "text-[13px] " +
                  (status === "upcoming" ? "text-white/35" : "text-white/85") +
                  (status === "current" ? " font-semibold" : " font-medium")
                }
              >
                {stage.label}
              </span>
            </div>
            {!isLast && (
              <span
                className={
                  "mx-3 h-px w-8 sm:w-14 " + (status === "done" ? "bg-[#3B5BFF]/50" : "bg-white/10")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
