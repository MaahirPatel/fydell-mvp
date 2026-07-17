"use client";

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">{label}</p>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">
        {value.trim() || "—"}
      </p>
    </div>
  );
}

/**
 * Shared content for the "Brief" and "Requirements" tabs — the left-rail
 * center panel and the right-panel Requirements tab both render this, just
 * scoped to a different subset of real mission fields. No invented copy.
 */
export default function BriefPanel({
  mission,
  canonicalFacts,
  variant,
}: {
  mission: MissionInfo;
  canonicalFacts: string[];
  variant: "brief" | "requirements";
}) {
  return (
    <div className="mx-auto max-w-[720px] space-y-6 p-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Mission</p>
        <h2 className="mt-1 text-[19px] font-medium text-white">{mission.title || "Untitled mission"}</h2>
      </div>

      {variant === "brief" ? (
        <>
          <Field label="Objective" value={mission.objective} />
          <Field label="Customer context" value={mission.customerContext} />
          <Field label="Systems context" value={mission.systemsContext} />
          <Field label="Technical environment" value={mission.technicalEnvironment} />
        </>
      ) : (
        <>
          <Field label="Expected outcome" value={mission.expectedOutcome} />
          <Field label="Constraints" value={mission.constraints} />
          <Field label="Security considerations" value={mission.securityConsiderations} />
          <Field label="Success measures" value={mission.successMeasures} />
        </>
      )}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">
          Known constraints (canonical)
        </p>
        {canonicalFacts.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-white/40">—</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {canonicalFacts.map((f) => (
              <li key={f} className="flex gap-2 text-[13px] leading-relaxed text-white/60">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#3B5BFF]" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
