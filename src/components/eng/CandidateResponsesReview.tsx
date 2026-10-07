"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { StatusTag } from "@/components/ui/StatusTag";
import type { CandidateResponse } from "@/lib/eng/candidate-report";
import { engFetch } from "./api";

function target(r: CandidateResponse): string {
  if (r.targetKind === "report") return "the report as a whole";
  return r.targetKind === "finding" ? `finding ${r.targetId}` : `criterion ${r.targetId.replace(/_/g, " ")}`;
}

function Resolve({ attemptId, response, onDone }: { attemptId: string; response: CandidateResponse; onDone: (r: CandidateResponse) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Reply and resolve
      </Button>
    );
  return (
    <div className="grid gap-2">
      <FormError>{error}</FormError>
      <Textarea
        aria-label="Reply to the candidate"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Shown to the candidate. If the finding was wrong, release a corrected version as well."
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={busy}
          disabled={!text.trim()}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await engFetch<{ response: CandidateResponse }>(`/api/eng/org/attempts/${attemptId}/responses`, { body: { responseId: response.id, resolution: text } });
            setBusy(false);
            if (res.ok === false) setError(res.error);
            else onDone(res.data.response);
          }}
        >
          Resolve
        </Button>
        <Button size="sm" variant="quiet" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function CandidateResponsesReview({ attemptId, initial, canResolve }: { attemptId: string; initial: CandidateResponse[]; canResolve: boolean }) {
  const [items, setItems] = useState(initial);
  const open = items.filter((r) => r.status === "open").length;
  return (
    <Panel>
      <PanelSection
        title="Candidate responses"
        description={`${open ? `${open} open. ` : ""}The candidate can read the released report and add context or flag an error. Responses never change the report; release a correction if a finding was wrong.`}
      >
        <ul className="grid gap-3">
          {items.map((r) => (
            <li key={r.id} className="grid gap-1.5 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag tone={r.status === "open" ? "changed" : "neutral"}>{r.status === "open" ? "Open" : "Resolved"}</StatusTag>
                <span className="text-app-meta text-[var(--text-tertiary)]">
                  {r.kind === "inaccurate" ? "Flagged as inaccurate" : "Added context"} on {target(r)}, report v{r.reportVersion}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-app-body text-[var(--text-primary)]">{r.body}</p>
              {r.resolution ? <p className="text-app-meta text-[var(--text-secondary)]">Your team replied: {r.resolution}</p> : null}
              {r.status === "open" && canResolve ? <Resolve attemptId={attemptId} response={r} onDone={(next) => setItems((prev) => prev.map((p) => (p.id === next.id ? next : p)))} /> : null}
            </li>
          ))}
        </ul>
      </PanelSection>
    </Panel>
  );
}
