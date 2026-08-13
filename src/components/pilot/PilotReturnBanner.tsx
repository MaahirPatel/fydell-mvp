"use client";

import Link from "next/link";
import { useStoredString } from "@/lib/client/local-storage";
import { PILOT_PROFILE_KEY } from "@/components/pilot/profile-storage";

/**
 * Shown on the result page only when a pilot tester profile exists in
 * localStorage. Guides the tester back to the structured feedback form.
 */
export default function PilotReturnBanner() {
  const isPilotTester = Boolean(useStoredString(PILOT_PROFILE_KEY));

  if (!isPilotTester) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3.5">
      <p className="text-[14px] leading-relaxed text-violet-900">
        Testing Fydell as a pilot reviewer? Once you have reviewed this result, please share
        your feedback.
      </p>
      <Link
        href="/pilot/feedback"
        className="inline-flex h-9 shrink-0 items-center rounded-lg bg-violet-600 px-3.5 text-[13px] font-semibold text-white transition hover:bg-violet-500"
      >
        Continue to feedback
      </Link>
    </div>
  );
}
