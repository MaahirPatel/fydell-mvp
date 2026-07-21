"use client";

import { cn } from "@/lib/cn";

export type MissionInfo = {
  title: string;
  objective: string;
  customerContext: string;
  expectedOutcome: string;
  systemsContext: string;
  technicalEnvironment: string;
  constraints: string;
  securityConsiderations: string;
  successMeasures: string;
};

function Section({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  if (!value.trim() && compact) return null;
  return (
    <details open={!compact} className="group border-b border-white/[0.06] py-2.5">
      <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
        {label}
      </summary>
      <p
        className={cn(
          "mt-1.5 whitespace-pre-wrap leading-relaxed text-[#9AA3B2]",
          compact ? "text-[12.5px]" : "text-[13px]"
        )}
      >
        {value.trim() || "—"}
      </p>
    </details>
  );
}

export default function BriefPanel({
  mission,
  canonicalFacts,
  variant,
  compact,
}: {
  mission: MissionInfo;
  canonicalFacts: string[];
  variant: "brief" | "requirements";
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "space-y-0 px-3 py-2" : "mx-auto max-w-[720px] space-y-4 p-6")}>
      <div className={compact ? "pb-2 pt-1" : ""}>
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
          Customer overview
        </p>
        <h2 className="mt-1 text-[15px] font-medium text-[#F4F5F7]">
          {mission.title || "Northbeam Logistics"}
        </h2>
      </div>

      {variant === "brief" ? (
        <>
          <Section label="Current objective" value={mission.objective} compact={compact} />
          <Section label="Customer context" value={mission.customerContext} compact={compact} />
          <Section label="Systems & resources" value={mission.systemsContext} compact={compact} />
          <Section
            label="Technical environment"
            value={mission.technicalEnvironment}
            compact={compact}
          />
          <Section label="Definition of completion" value={mission.expectedOutcome} compact={compact} />
        </>
      ) : (
        <>
          <Section label="Expected outcome" value={mission.expectedOutcome} compact={compact} />
          <Section label="Constraints" value={mission.constraints} compact={compact} />
          <Section
            label="Security / approval policy"
            value={mission.securityConsiderations}
            compact={compact}
          />
          <Section label="Success measures" value={mission.successMeasures} compact={compact} />
        </>
      )}

      <details open className="py-2.5">
        <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
          Known constraints ({canonicalFacts.length})
        </summary>
        {canonicalFacts.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] text-[#687182]">None listed.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {canonicalFacts.map((f) => (
              <li key={f} className="text-[12.5px] leading-relaxed text-[#9AA3B2]">
                · {f}
              </li>
            ))}
          </ul>
        )}
      </details>

      <div className="pb-3 pt-1 text-[12px] leading-relaxed text-[#687182]">
        Stakeholders: Dana Whitfield (Operations) · Priya Anand (VP Operations). Use Client chat to
        clarify — do not invent facts.
      </div>
    </div>
  );
}
