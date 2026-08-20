"use client";

import { useCallback, useEffect, useState } from "react";
import type { ArtifactContent } from "@/lib/sim-engine/proof/types";

const empty: ArtifactContent = {
  diagnosis: "",
  recommendation: "",
  customer_message: "",
  internal_note: "",
  assumptions: "",
  limitations: "",
};

type Message = { id: string; agent_id: string; direction: string; body: string };

type RunView = {
  stage?: string;
  artifact?: ArtifactContent;
  messages?: Message[];
  defense?: Array<{ id: string; prompt: string; body: string }>;
  done?: boolean;
};

export default function ProofWorkbench({ runId, token }: { runId: string; token: string }) {
  const [stage, setStage] = useState("DISCOVERY");
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifact, setArtifact] = useState<ArtifactContent>(empty);
  const [saveState, setSaveState] = useState("Saved");
  const [agent, setAgent] = useState<"customer" | "engineering" | "sales">("customer");
  const [draft, setDraft] = useState("");
  const [defense, setDefense] = useState<Array<{ id: string; prompt: string; body: string }>>([]);
  const [done, setDone] = useState(false);
  const remaining = "server timer";

  const readRun = useCallback(async (): Promise<RunView> => {
    const res = await fetch(`/api/proof/runs/${runId}`);
    const json = (await res.json()) as {
      run?: { stage: string; status: string };
      snapshot?: { artifact: ArtifactContent | null };
      messages?: Message[];
    };
    const status = json.run?.status;
    const view: RunView = {
      stage: json.run?.stage,
      artifact: json.snapshot?.artifact ?? undefined,
      messages: json.messages,
      done: status === "awaiting_review" || status === "ready",
    };
    if (status === "awaiting_defense" || status === "awaiting_review" || status === "ready") {
      const def = await fetch(`/api/proof/runs/${runId}/defense`);
      const defJson = (await def.json()) as {
        questions?: Array<{ id: string; prompt: string; proof_defense_responses?: { body: string } | Array<{ body: string }> }>;
      };
      view.defense = (defJson.questions ?? []).map((q) => {
        const responses = q.proof_defense_responses;
        const body = Array.isArray(responses) ? responses[0]?.body : responses?.body;
        return { id: q.id, prompt: q.prompt, body: body ?? "" };
      });
    }
    return view;
  }, [runId]);

  const applyRun = useCallback((view: RunView) => {
    if (view.stage) setStage(view.stage);
    if (view.artifact) setArtifact(view.artifact);
    if (view.messages) setMessages(view.messages);
    if (view.defense) setDefense(view.defense);
    if (view.done) setDone(true);
  }, []);

  const refresh = useCallback(async () => {
    applyRun(await readRun());
  }, [readRun, applyRun]);

  // A run that is replaced or unmounted mid-flight must not write its answer
  // into the run that took its place.
  useEffect(() => {
    let active = true;
    void readRun().then((view) => {
      if (active) applyRun(view);
    });
    return () => {
      active = false;
    };
  }, [readRun, applyRun]);

  useEffect(() => {
    const onBlur = () => {
      void fetch(`/api/proof/runs/${runId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "telemetry", eventType: "TAB_BLUR" }),
      });
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [runId]);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setSaveState("Saving");
    await fetch(`/api/proof/runs/${runId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    setSaveState("Saved");
    await refresh();
  }

  async function persistArtifact(next: ArtifactContent) {
    setArtifact(next);
    setSaveState("Saving");
    await fetch(`/api/proof/runs/${runId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save_artifact", artifact: next }),
    });
    setSaveState("Saved");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <p className="text-[15px] font-medium tracking-[-0.02em]">Fydell · Northstar integration</p>
        <p className="text-[13px] text-[var(--text-secondary)]">
          {stage} · {saveState} · {remaining}
        </p>
      </header>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="border-r border-[var(--border-subtle)] p-4">
          <p className="text-[12px] text-[var(--text-tertiary)]">Objective</p>
          <p className="mt-2 text-[14px] leading-5 text-[var(--text-secondary)]">
            Diagnose the CRM sync failure. Propose a plan. When information changes, update what must change and preserve what still holds.
          </p>
          <button type="button" className="mt-4 text-left text-[13px] text-[var(--action-ink)]" onClick={() => void post("open_resource", { resourceId: "api-docs" })}>
            Open API docs
          </button>
          <p className="mt-6 text-[12px] text-[var(--text-tertiary)]">Resources</p>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">Accounts API · Auth notes · Error sample</p>
        </aside>
        <main className="p-4">
          {(Object.keys(empty) as Array<keyof ArtifactContent>).map((field) => (
            <label key={field} className="mb-3 block">
              <span className="text-[12px] text-[var(--text-tertiary)]">{field.replace("_", " ")}</span>
              <textarea
                className="mt-1 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 text-[14px]"
                rows={field === "recommendation" ? 4 : 2}
                value={artifact[field]}
                onChange={(e) => {
                  const next = { ...artifact, [field]: e.target.value };
                  setArtifact(next);
                }}
                onBlur={() => void persistArtifact(artifact)}
              />
            </label>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]" onClick={() => void post("commit_preliminary")}>
              Commit recommendation
            </button>
            <button type="button" className="rounded-full border border-[var(--border-default)] px-4 py-2 text-[13px]" onClick={() => void post("acknowledge_auth")}>
              Acknowledge engineering note
            </button>
            <button type="button" className="rounded-full border border-[var(--border-default)] px-4 py-2 text-[13px]" onClick={() => void post("submit_final", { artifact })}>
              Submit work
            </button>
          </div>
          {defense.length > 0 && !done ? (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void fetch(`/api/proof/runs/${runId}/defense`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ answers: defense.map((q) => ({ questionId: q.id, body: q.body })) }),
                }).then(() => refresh());
              }}
            >
              <h2 className="text-[16px] font-medium">Defend your decisions</h2>
              {defense.map((q, i) => (
                <label key={q.id} className="block">
                  <span className="text-[14px] text-[var(--text-secondary)]">{q.prompt}</span>
                  <textarea className="mt-1 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2" rows={3} value={q.body} onChange={(e) => setDefense((prev) => prev.map((p, idx) => (idx === i ? { ...p, body: e.target.value } : p)))} />
                </label>
              ))}
              <button type="submit" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]">
                Submit defense
              </button>
            </form>
          ) : null}
          {done ? <p className="mt-6 text-[14px] text-[var(--text-secondary)]">Submitted. Fydell is reviewing evidence.</p> : null}
        </main>
        <aside className="border-l border-[var(--border-subtle)] p-4">
          <div className="flex gap-2">
            {(["customer", "engineering", "sales"] as const).map((id) => (
              <button key={id} type="button" className={`rounded-full px-3 py-1 text-[12px] ${agent === id ? "bg-[var(--surface-selected)]" : "text-[var(--text-tertiary)]"}`} onClick={() => setAgent(id)}>
                {id}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-3">
            {messages.filter((m) => m.agent_id === agent).map((m) => (
              <p key={m.id} className="text-[13px] leading-5 text-[var(--text-secondary)]">
                <span className="text-[var(--text-tertiary)]">{m.direction === "inbound" ? m.agent_id : "you"} · </span>
                {m.body}
              </p>
            ))}
          </div>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void post("message", { agentId: agent, message: draft });
              setDraft("");
            }}
          >
            <textarea className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2 text-[13px]" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" />
            <button type="submit" className="mt-2 text-[13px] text-[var(--action-ink)]">
              Send
            </button>
          </form>
        </aside>
      </div>
      <p className="sr-only">{token}</p>
    </div>
  );
}
