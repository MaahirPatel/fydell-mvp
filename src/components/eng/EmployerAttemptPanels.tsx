"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Textarea } from "@/components/ui/Field";
import { engFetch, formatDateTime } from "./api";
import { ReportView, type ThreadMessage } from "./EvidenceViews";
import type { Finding, ProbeResult, ReportBrief } from "@/lib/eng/types";

const DECISIONS = [
  { key: "advance", label: "Advance" },
  { key: "hold", label: "Hold" },
  { key: "decline", label: "Decline" },
] as const;

type DecisionKey = (typeof DECISIONS)[number]["key"];

function asDecisionKey(value: string | null | undefined): DecisionKey | null {
  return DECISIONS.find((d) => d.key === value)?.key ?? null;
}

export function DecisionForm({ attemptId, reportVersion, current = null }: { attemptId: string; reportVersion: number; current?: string | null }) {
  const router = useRouter();
  const recorded = asDecisionKey(current);
  const [decision, setDecision] = useState<DecisionKey | null>(recorded);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!decision) {
      setError("Choose Advance, Hold or Decline.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await engFetch(`/api/eng/org/attempts/${attemptId}/decision`, { body: { decision, notes } });
    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <FormError>{error}</FormError>
      <div role="radiogroup" aria-label="Decision" className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <Button key={d.key} type="button" variant={decision === d.key ? "primary" : "secondary"} role="radio" aria-checked={decision === d.key} onClick={() => setDecision(d.key)}>
            {d.label}
          </Button>
        ))}
      </div>
      {recorded && !saved ? (
        <p className="text-app-meta text-[var(--text-secondary)]">
          Current decision: {DECISIONS.find((d) => d.key === recorded)?.label}. Recording again adds a new entry to the decision history.
        </p>
      ) : null}
      <Field label="Reasoning" htmlFor="decision-notes" optional help={`Recorded against report version ${reportVersion}. The candidate is not notified; telling them is a separate step.`}>
        <Textarea id="decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} rows={3} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          {recorded ? "Update decision" : "Record decision"}
        </Button>
        {saved ? <span className="text-app-meta text-[var(--text-secondary)]">Recorded.</span> : null}
      </div>
    </form>
  );
}

export function NoteForm({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="grid gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const res = await engFetch(`/api/eng/org/attempts/${attemptId}/notes`, { body: { body } });
        setBusy(false);
        if (res.ok === false) setError(res.error);
        else {
          setBody("");
          router.refresh();
        }
      }}
    >
      <FormError>{error}</FormError>
      <Textarea aria-label="Add a note" value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={4000} placeholder="Visible to your team only" />
      <div>
        <Button type="submit" size="sm" variant="secondary" loading={busy} disabled={!body.trim()}>
          Add note
        </Button>
      </div>
    </form>
  );
}

function FlagButton({ attemptId, findingId }: { attemptId: string; findingId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");
  return (
    <span className="flex items-center gap-2">
      {state !== "idle" && state !== "busy" && state !== "done" ? <span className="text-app-meta text-[var(--fydell-risk)]">{state}</span> : null}
      <Button
        size="sm"
        variant="quiet"
        disabled={state === "busy" || state === "done"}
        onClick={async () => {
          const reason = window.prompt("What is wrong with this finding? Fydell's reviewer will look at it and correct the report if needed.");
          if (!reason) return;
          setState("busy");
          const res = await engFetch(`/api/eng/org/attempts/${attemptId}/flags`, { body: { findingId, reason } });
          if (res.ok === false) setState(res.error);
          else {
            setState("done");
            router.refresh();
          }
        }}
      >
        {state === "done" ? "Flagged" : "Flag"}
      </Button>
    </span>
  );
}

export function EmployerReport(props: {
  attemptId: string;
  canFlag: boolean;
  brief: ReportBrief;
  findings: Finding[];
  results: ProbeResult[];
  messages: ThreadMessage[];
  handoff: Record<string, string>;
  aiDisclosure: string;
  teammates: Record<string, string>;
}) {
  return (
    <ReportView
      brief={props.brief}
      findings={props.findings}
      results={props.results}
      messages={props.messages}
      handoff={props.handoff}
      aiDisclosure={props.aiDisclosure}
      teammates={props.teammates}
      fileEndpoint={`/api/eng/org/attempts/${props.attemptId}/file`}
      renderFindingAction={props.canFlag ? (f) => <FlagButton attemptId={props.attemptId} findingId={f.id} /> : undefined}
    />
  );
}

export function When({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDateTime(iso)}</time>;
}
