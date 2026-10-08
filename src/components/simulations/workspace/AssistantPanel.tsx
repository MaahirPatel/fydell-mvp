"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { engFetch } from "@/components/eng/api";
import type { AssistantInteractionView, AssistantPatchFile, AssistantRequest, AssistantStatus, CollaborationView } from "@/lib/eng/authored/collaboration-types";
import { newClientMsgId, splitFences } from "./lib";
import { Composer } from "./TeamPanel";
import type { CollaborationState } from "./useCollaboration";

const MAX_CONTEXT = 6;

export const ASSISTANT_STATUS_COPY: Record<Exclude<AssistantStatus, "answered">, string> = {
  running: "The assistant is still working on this. The reply will appear here when it is ready.",
  provider_unavailable: "The assistant is unavailable right now. This does not affect your time or how your work is reviewed.",
  limit_reached: "You have used all assistant requests for this task. You can keep working without it, and this does not affect how your work is reviewed.",
  policy_blocked: "The assistant cannot help with that request under this task's AI policy. Nothing was changed.",
  invalid_output: "The assistant's reply could not be used, so nothing was changed. You can ask again.",
};

type Pending = { clientMsgId: string; prompt: string; contextPaths: string[]; files: AssistantPatchFile[]; state: "sending" | "failed"; error: string | null };

function isInteraction(v: unknown): v is AssistantInteractionView {
  if (!v || typeof v !== "object") return false;
  const i = v as Partial<Record<keyof AssistantInteractionView, unknown>>;
  return typeof i.id === "string" && typeof i.seq === "number" && typeof i.status === "string" && typeof i.answer === "string" && typeof i.decision === "string";
}

export function upsertInteraction(view: CollaborationView, interaction: AssistantInteractionView, usage?: { used: number; limit: number }): CollaborationView {
  const others = view.assistant.interactions.filter((x) => x.id !== interaction.id);
  return {
    ...view,
    assistant: {
      ...view.assistant,
      used: usage?.used ?? view.assistant.used,
      limit: usage?.limit ?? view.assistant.limit,
      interactions: [...others, interaction].sort((a, b) => a.seq - b.seq),
    },
  };
}

export function readInteraction(data: unknown): AssistantInteractionView | null {
  if (!data || typeof data !== "object") return null;
  const i = (data as { interaction?: unknown }).interaction;
  return isInteraction(i) ? i : null;
}

function Answer({ text }: { text: string }) {
  return (
    <div className="grid gap-2">
      {splitFences(text).map((seg, i) =>
        seg.kind === "code" ? (
          <pre
            key={i}
            className="sim-scroll overflow-x-auto rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-[var(--text-body)]"
          >
            {seg.text}
          </pre>
        ) : (
          <p key={i} className="whitespace-pre-wrap text-[15px] leading-[1.6] text-[var(--text-body)]">
            {seg.text.trim()}
          </p>
        ),
      )}
    </div>
  );
}

function InteractionItem({
  interaction,
  reviewing,
  readOnly,
  onReview,
}: {
  interaction: AssistantInteractionView;
  reviewing: boolean;
  readOnly: boolean;
  onReview: (interaction: AssistantInteractionView) => void;
}) {
  const patchCount = interaction.patch?.length ?? 0;
  return (
    <li className="grid gap-2">
      <div className="grid gap-1">
        <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">You asked</p>
        <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)]">{interaction.prompt}</p>
        {interaction.contextPaths.length ? <p className="text-[12px] text-[var(--text-tertiary)]">Shared: {interaction.contextPaths.join(", ")}</p> : null}
      </div>
      <div className="grid gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--sim-assistant-bg)] px-3 py-2.5">
        <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">Coding assistant</p>
        {interaction.status === "answered" ? (
          <Answer text={interaction.answer} />
        ) : (
          <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">{ASSISTANT_STATUS_COPY[interaction.status]}</p>
        )}
        {interaction.status === "answered" && patchCount ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-2">
            <span className="text-[13px] text-[var(--text-secondary)]">
              Proposed changes to {patchCount} {patchCount === 1 ? "file" : "files"}
            </span>
            {interaction.decision === "pending" && !readOnly ? (
              <button
                type="button"
                onClick={() => onReview(interaction)}
                aria-pressed={reviewing}
                className="ml-auto h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-2.5 text-[12.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                {reviewing ? "Reviewing" : "Review changes"}
              </button>
            ) : null}
            {interaction.decision === "accepted" ? (
              <span className="ml-auto text-[12.5px] text-[var(--text-secondary)]">
                Accepted{interaction.appliedRevision ? `, saved as revision ${interaction.appliedRevision}` : ""}
              </span>
            ) : null}
            {interaction.decision === "rejected" ? <span className="ml-auto text-[12.5px] text-[var(--text-secondary)]">Rejected, nothing was changed</span> : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The optional coding assistant. It only proposes changes; the candidate
 * reviews a diff and accepts or rejects. Nothing is applied automatically, and
 * a reply never counts as a test result.
 */
export function AssistantPanel({
  base,
  state,
  contextOptions,
  activePath,
  readOnly,
  reviewingId,
  getBuffers,
  onInteraction,
  onReview,
}: {
  base: string;
  state: CollaborationState;
  contextOptions: string[];
  activePath: string | null;
  readOnly: boolean;
  reviewingId: string | null;
  getBuffers: (paths: string[]) => AssistantPatchFile[];
  onInteraction: (interaction: AssistantInteractionView, usage?: { used: number; limit: number }) => void;
  onReview: (interaction: AssistantInteractionView) => void;
}) {
  const view = state.view;
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const interactions = useMemo(() => [...(view?.assistant.interactions ?? [])].sort((a, b) => a.seq - b.seq), [view?.assistant.interactions]);
  const options = useMemo(() => {
    const set = new Set(contextOptions);
    if (activePath) set.add(activePath);
    return [...set];
  }, [contextOptions, activePath]);
  const chosen = (picked ?? (activePath ? [activePath] : [])).filter((p) => options.includes(p));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [interactions.length, pending]);

  if (!view) return null;
  const { assistant } = view;
  const atLimit = assistant.used >= assistant.limit;
  const closed = readOnly || !view.open;

  const deliver = async (item: Pending) => {
    setPending({ ...item, state: "sending", error: null });
    const body: AssistantRequest = { prompt: item.prompt, clientMsgId: item.clientMsgId, contextPaths: item.contextPaths, files: item.files };
    const res = await engFetch<unknown>(`${base}/assistant`, { body });
    if (res.ok === false) {
      setPending({ ...item, state: "failed", error: res.status === 0 ? "Not sent. Check your connection, then retry." : res.error });
      return;
    }
    const interaction = readInteraction(res.data);
    const data = res.data as { used?: unknown; limit?: unknown };
    if (!interaction) {
      setPending({ ...item, state: "failed", error: "The reply could not be read. Retry to fetch it again." });
      return;
    }
    onInteraction(interaction, typeof data.used === "number" && typeof data.limit === "number" ? { used: data.used, limit: data.limit } : undefined);
    setPending(null);
  };

  const send = () => {
    const prompt = draft.trim();
    if (!prompt || pending) return;
    const item: Pending = { clientMsgId: newClientMsgId(), prompt, contextPaths: chosen, files: getBuffers(chosen), state: "sending", error: null };
    setDraft("");
    setPicked(null);
    void deliver(item);
  };

  const toggle = (path: string) => {
    const set = new Set(chosen);
    if (set.has(path)) set.delete(path);
    else if (set.size < MAX_CONTEXT) set.add(path);
    setPicked([...set]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-4 grid gap-1.5">
          <p className="text-[12.5px] tabular-nums text-[var(--text-secondary)]">
            {assistant.used} of {assistant.limit} requests used
          </p>
          <details>
            <summary className="cursor-pointer text-[12.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">AI policy for this task</summary>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--text-tertiary)]">{assistant.policyText}</p>
          </details>
          <p className="text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
            The assistant can only propose changes. You review each one before anything changes in your files. Only the public test results show whether tests pass.
          </p>
        </div>
        {interactions.length || pending ? (
          <ol aria-label="Assistant conversation" className="grid gap-5">
            {interactions.map((i) => (
              <InteractionItem key={i.id} interaction={i} reviewing={reviewingId === i.id} readOnly={closed} onReview={onReview} />
            ))}
            {pending ? (
              <li className="grid gap-1">
                <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">You asked</p>
                <p className="whitespace-pre-wrap rounded-[10px] bg-[var(--surface-raised)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)] opacity-80">{pending.prompt}</p>
                {pending.state === "sending" ? (
                  <p className="text-[12.5px] text-[var(--text-tertiary)]">Waiting for the assistant</p>
                ) : (
                  <p role="alert" className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--sim-error)]">
                    {pending.error}
                    <button type="button" onClick={() => void deliver(pending)} className="font-medium text-[var(--text-primary)] underline underline-offset-2">
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(pending.prompt);
                        setPending(null);
                      }}
                      className="text-[var(--text-secondary)] underline underline-offset-2"
                    >
                      Edit and resend
                    </button>
                  </p>
                )}
              </li>
            ) : null}
          </ol>
        ) : (
          <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">Ask about the code you are working on. Choose which open files to share with each question.</p>
        )}
        <div ref={endRef} />
      </div>

      {closed ? (
        <p className="shrink-0 border-t border-[var(--border-default)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">The assistant is closed for this attempt. You can still read the conversation.</p>
      ) : atLimit ? (
        <p className="shrink-0 border-t border-[var(--border-default)] px-4 py-3 text-[13px] leading-[1.55] text-[var(--text-secondary)]">{ASSISTANT_STATUS_COPY.limit_reached}</p>
      ) : (
        <Composer
          id="sim-assistant-composer"
          label="Question for the coding assistant"
          placeholder="Ask the coding assistant"
          value={draft}
          disabled={false}
          busy={pending !== null}
          sendLabel="Ask"
          onChange={setDraft}
          onSend={send}
        >
          <fieldset className="grid gap-1">
            <legend className="mb-1 text-[12.5px] text-[var(--text-secondary)]">
              Files to share ({chosen.length} of up to {MAX_CONTEXT}, including unsaved edits)
            </legend>
            {options.length ? (
              <div className="sim-scroll grid max-h-[104px] gap-0.5 overflow-y-auto">
                {options.map((p) => {
                  const checked = chosen.includes(p);
                  return (
                    <label key={p} className="flex items-center gap-2 text-[12.5px] text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && chosen.length >= MAX_CONTEXT}
                        onChange={() => toggle(p)}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      <span className="truncate font-mono" title={p}>
                        {p}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--text-tertiary)]">Open a file to share it.</p>
            )}
          </fieldset>
        </Composer>
      )}
    </div>
  );
}
