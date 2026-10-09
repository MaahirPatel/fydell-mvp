"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DemoWorkspace from "@/components/sandbox/demo/task/TaskWorkspace";
import { DEMO_HOME, DEMO_SCENARIO_KEY, SAMPLE_APPLICANT_KEY } from "@/lib/employer-demo/fixtures";
import type { Attempt } from "@/lib/sandbox-demo/state";

/**
 * The sample task seen from the applicant's side, inside the employer's demo
 * workspace. A bar across the top keeps the perspective and the way back
 * visible for the whole session.
 */
export default function DemoTaskPerspective({ storageScope, returnHref }: { storageScope: string; returnHref: string }) {
  const submit = async (attempt: Attempt): Promise<{ ok: true; href: string } | { ok: false; error: string }> => {
    const res = await fetch("/api/employer/demo/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: attempt.files, handoff: attempt.handoff, run: attempt.run }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: body.error ?? "Your submission was not saved. Your files are still here; try again." };
    return { ok: true, href: `${DEMO_HOME}/applicants/${SAMPLE_APPLICANT_KEY}` };
  };

  return (
    <DemoWorkspace
      scenarioKey={DEMO_SCENARIO_KEY}
      embed={{
        storageScope,
        overview: { href: returnHref, label: "Return to review" },
        notice: (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-2 text-[13px]">
            <p className="text-[var(--text-primary)]">
              <span className="font-medium">Demo workspace, applicant perspective.</span>{" "}
              <span className="text-[var(--text-secondary)]">This is what an applicant sees. Tests run in your browser and nothing is sent to a real candidate.</span>
            </p>
            <Link href={returnHref} className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)] underline underline-offset-2">
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={1.7} />
              Return to review
            </Link>
          </div>
        ),
        consequence: {
          confirm: "Submit to your demo workspace",
          kept: "Your files, handoff answers and test run are saved as “Your sample submission” in your demo workspace, replacing any earlier one. You then review it as an employer. Nobody else sees it.",
        },
        onSubmitted: submit,
      }}
    />
  );
}
