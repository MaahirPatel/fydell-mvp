"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { PanelSection } from "@/components/ui/Panel";
import { RespondForm, ResponseList, type ResponseTarget } from "@/components/eng/CandidateReport";
import type { AuthoredCandidateReport } from "@/lib/eng/authored/types";

function shorten(text: string): string {
  return text.length > 72 ? `${text.slice(0, 71).trimEnd()}…` : text;
}

/** Lets the candidate add context to, or flag an error in, a released work sample report. */
export function AuthoredReportResponses({ attemptId, report }: { attemptId: string; report: AuthoredCandidateReport }) {
  const targets: ResponseTarget[] = [
    { kind: "report", id: "report", label: "the report as a whole" },
    ...report.acceptance.map((a): ResponseTarget => ({ kind: "criterion", id: a.id, label: `${a.id}: ${shorten(a.text)}` })),
    ...report.criteria.map((c): ResponseTarget => ({ kind: "criterion", id: c.id, label: c.label })),
  ];
  const [responses, setResponses] = useState(report.responses);
  const [choice, setChoice] = useState(targets[0].id);
  const [open, setOpen] = useState(false);
  const target = targets.find((t) => t.id === choice) ?? targets[0];
  const labelFor = (id: string) => targets.find((t) => t.id === id)?.label ?? id;

  return (
    <PanelSection
      title="Respond to this report"
      description="If something in this report is missing or wrong, tell the hiring team."
    >
      {open ? (
        <div className="grid gap-2">
          <Select aria-label="What you are responding to" value={choice} onChange={(e) => setChoice(e.target.value)} className="max-w-[520px]">
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          <RespondForm
            key={target.id}
            attemptId={attemptId}
            target={target}
            endpoint={`/api/eng/attempts/${attemptId}/authored/report`}
            onCancel={() => setOpen(false)}
            onDone={(created) => {
              setResponses((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
              setOpen(false);
            }}
          />
        </div>
      ) : (
        <div>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Add context or flag an error
          </Button>
        </div>
      )}
      {responses.length ? (
        <div className="mt-4 grid gap-3">
          {Array.from(new Set(responses.map((r) => r.targetId))).map((id) => (
            <div key={id}>
              <p className="text-app-meta text-[var(--text-tertiary)]">On {labelFor(id)}</p>
              <ResponseList items={responses.filter((r) => r.targetId === id)} />
            </div>
          ))}
        </div>
      ) : null}
    </PanelSection>
  );
}
