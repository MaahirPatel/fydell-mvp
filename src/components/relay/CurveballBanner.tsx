"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export default function CurveballBanner({
  text,
  onAcknowledge,
}: {
  text: string;
  onAcknowledge?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  if (dismissed) return null;

  return (
    <div className="shrink-0 border-b border-[#6470FF]/30 bg-[#6470FF]/[0.1]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
        <Info className="h-4 w-4 shrink-0 text-[#B8C4FF]" strokeWidth={2} />
        <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[#D5DBFF]">
          <span className="font-medium text-white">New constraint · </span>
          {text.length > 140 ? `${text.slice(0, 140)}…` : text}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[12px] font-medium text-[#B8C4FF] underline-offset-2 hover:underline"
          >
            Review change
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[12px] text-[#9AA3B2] hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 border-t border-[#6470FF]/20 px-4 py-3 text-[12.5px] leading-relaxed text-[#9AA3B2] sm:px-5">
          <p>
            <span className="font-medium text-white">What changed: </span>
            {text}
          </p>
          <p>
            <span className="font-medium text-white">Who: </span>
            Priya Anand, VP of Operations (via client channel)
          </p>
          <p>
            <span className="font-medium text-white">May affect: </span>
            Delivery timeline, recommendation scope, and handoff wording. Revisit your plan before
            submit.
          </p>
          <p>
            <span className="font-medium text-white">Original message: </span>
            {text}
          </p>
          <button
            type="button"
            onClick={() => {
              onAcknowledge?.();
              setOpen(false);
            }}
            className="mt-1 inline-flex h-8 items-center rounded-[7px] bg-[#6470FF] px-3 text-[12px] font-medium text-white"
          >
            Acknowledge
          </button>
        </div>
      )}
    </div>
  );
}
