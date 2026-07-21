"use client";

import { useState } from "react";
import EvidenceTrailPanel from "@/components/relay/EvidenceTrailPanel";
import AiWorkspacePanel from "@/components/relay/AiWorkspacePanel";
import type { WorkingNotesState, ChecklistItem } from "@/components/relay/WorkingNotes";
import { DEFAULT_CHECKLIST } from "@/components/relay/WorkingNotes";
import type { PatchProposal } from "@/lib/relay/ai-patch";
import { cn } from "@/lib/cn";

export type MissionNavTarget = "data" | "code" | "preview" | "tests" | "chat" | "handoff";

const OBJECTIVE =
  "Find why the delay report understates late shipments, fix the pipeline, and give Dana a reliable daily view.";

type EventRow = {
  id: string;
  actor: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  source_surface?: string | null;
};

export default function MissionPanel({
  notes,
  onToggleChecklistItem,
  onAddNote,
  events,
  activeFile,
  activeFileContent,
  onApplyAi,
  onNavigate,
  doneCount,
  totalCount,
}: {
  notes: WorkingNotesState;
  onToggleChecklistItem: (id: string) => void;
  onAddNote: (text: string) => void;
  events: EventRow[];
  activeFile: string;
  activeFileContent: string;
  onApplyAi: (proposal: PatchProposal) => void;
  onNavigate: (target: MissionNavTarget) => void;
  doneCount: number;
  totalCount: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const checklist: ChecklistItem[] =
    notes.checklist.length > 0 ? notes.checklist : DEFAULT_CHECKLIST;

  const navForItem = (id: string): MissionNavTarget | null => {
    if (id === "inspect" || id === "sources") return "data";
    if (id === "stakeholder" || id === "priority") return "chat";
    if (id === "normalize" || id === "fix") return "code";
    if (id === "verify" || id === "tests" || id === "evals") return "tests";
    if (id === "handoff") return "handoff";
    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#10141D]">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">Mission</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#F4F5F7]">{OBJECTIVE}</p>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-2 text-[12px] text-[#6470FF] hover:underline"
        >
          {detailsOpen ? "Hide details" : "Primary user · deliverable · deadline"}
        </button>
        {detailsOpen && (
          <dl className="mt-2 space-y-1.5 text-[12px] text-[#9AA3B2]">
            <div>
              <dt className="inline font-medium text-[#F4F5F7]">Primary user: </dt>
              <dd className="inline">Dana Whitfield, Operations Manager</dd>
            </div>
            <div>
              <dt className="inline font-medium text-[#F4F5F7]">Deliverable: </dt>
              <dd className="inline">Corrected daily delay view + honest handoff</dd>
            </div>
            <div>
              <dt className="inline font-medium text-[#F4F5F7]">Deadline: </dt>
              <dd className="inline">Session timer (board review may move)</dd>
            </div>
            <div>
              <dt className="inline font-medium text-[#F4F5F7]">Non-negotiable: </dt>
              <dd className="inline">Do not invent customer facts; verify before claiming fixed</dd>
            </div>
          </dl>
        )}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-[#687182]">
            <span>Progress</span>
            <span>
              {doneCount} / {totalCount}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-[#6470FF] transition-[width] duration-200"
              style={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <section>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
            Checklist
          </p>
          <ul className="mt-2 space-y-1.5">
            {checklist.map((item) => {
              const target = navForItem(item.id);
              return (
                <li key={item.id} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleChecklistItem(item.id)}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                      item.done
                        ? "border-[#67d9a0]/50 bg-[#67d9a0]/20 text-[#67d9a0]"
                        : "border-white/20 text-transparent"
                    )}
                    aria-pressed={item.done}
                    aria-label={item.done ? `Unmark ${item.label}` : `Mark ${item.label}`}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => target && onNavigate(target)}
                    className={cn(
                      "text-left text-[12.5px] leading-snug",
                      item.done ? "text-[#687182] line-through" : "text-[#F4F5F7] hover:text-[#B8C4FF]"
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
              Evidence journal
            </p>
            <span className="rounded-[5px] border border-white/10 px-1.5 py-0.5 text-[10px] text-[#687182]">
              Auto-captured
            </span>
          </div>
          <div className="mt-2 max-h-[180px] overflow-y-auto rounded-[8px] border border-white/[0.08]">
            <EvidenceTrailPanel events={events} />
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteDraft.trim()) return;
              onAddNote(noteDraft.trim());
              setNoteDraft("");
            }}
          >
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add reasoning note…"
              className="min-w-0 flex-1 rounded-[7px] border border-white/10 bg-[#0B0F16] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-[#687182]"
            />
            <button
              type="submit"
              className="rounded-[7px] border border-white/12 px-2.5 text-[12px] text-[#9AA3B2] hover:bg-white/[0.05]"
            >
              Add
            </button>
          </form>
        </section>

        <section className="rounded-[10px] border border-white/[0.08] bg-[#0B0F16]/80">
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span>
              <span className="text-[12.5px] font-medium text-[#F4F5F7]">AI copilot</span>
              <span className="ml-2 text-[11px] text-[#687182]">Allowed · activity recorded</span>
            </span>
            <span className="text-[11px] text-[#687182]">{aiOpen ? "Collapse" : "Expand"}</span>
          </button>
          {aiOpen && (
            <div className="max-h-[280px] border-t border-white/[0.06]">
              <AiWorkspacePanel
                activeFile={activeFile}
                activeFileContent={activeFileContent}
                onApply={onApplyAi}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
