"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pilotModeEnabled } from "@/lib/fde/flags";

const STEPS = [
  { n: 1, label: "Create or open a simulation", href: "/app/employer/simulations/generate" },
  { n: 2, label: "Review generation preferences", href: "/app/employer/simulations/generate" },
  { n: 3, label: "Generate, edit, and publish", href: "/app/employer/missions" },
  { n: 4, label: "Preview the candidate workspace", href: "/app/employer/missions" },
  { n: 5, label: "Invite a candidate and open evidence", href: "/app/employer/evidence" },
] as const;

/**
 * Subtle checklist shown only in pilot/dev mode. Does not take over the UI.
 * Works for any company workspace — never company-specific copy.
 */
export default function PilotWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const show =
      pilotModeEnabled() ||
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_FDE_MARKETPLACE === "1";
    setVisible(show);
    try {
      if (sessionStorage.getItem("fydell_pilot_walkthrough_dismissed") === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible || dismissed) return null;

  return (
    <aside
      className="fixed bottom-4 right-4 z-40 w-[min(100%-2rem,320px)] rounded-[12px] border border-white/12 bg-[#0B0E14]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur"
      aria-label="Pilot walkthrough"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.07em] text-white/45">
            Pilot walkthrough
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/65">
            Complete the hiring loop in under 8 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem("fydell_pilot_walkthrough_dismissed", "1");
            } catch {
              /* ignore */
            }
          }}
          className="text-[11px] text-white/40 hover:text-white/70"
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Link
              href={step.href}
              className="flex gap-2 rounded-[8px] px-1.5 py-1 text-[12.5px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <span className="tabular-nums text-white/35">{step.n}.</span>
              <span>{step.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
