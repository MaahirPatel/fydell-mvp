"use client";

import { useState } from "react";
import { computeUnifiedDiff, diffStats } from "@/lib/relay/diff";
import { proposePatch, type PatchProposal } from "@/lib/relay/ai-patch";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export default function AiWorkspacePanel({
  activeFile,
  activeFileContent,
  onApply,
}: {
  activeFile: string;
  activeFileContent: string;
  onApply: (proposal: PatchProposal) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<PatchProposal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function suggest() {
    setNotice(null);
    if (!activeFile) {
      setNotice("Open a file first, then ask for a suggestion.");
      return;
    }
    const next = proposePatch(activeFile, activeFileContent, instruction);
    if (!next) {
      setNotice(
        instruction.trim()
          ? "Could not build a safe suggestion for this file type — try a source (.py) file."
          : "Nothing to suggest for this file. Try router.py, or type an instruction above."
      );
      setProposal(null);
      return;
    }
    setProposal(next);
  }

  function apply() {
    if (!proposal) return;
    onApply(proposal);
    setProposal(null);
    setInstruction("");
    setNotice(`Applied — patched ${proposal.file}.`);
  }

  function discard() {
    setProposal(null);
    setNotice(null);
  }

  const diff = proposal ? computeUnifiedDiff(proposal.before, proposal.after) : [];
  const stats = diffStats(diff);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">AI workspace</p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">
        Fully offline and deterministic — no live model calls. It either applies the known router
        approval-policy fix, or appends a labeled note from your instruction.
      </p>

      <div className="mt-3 rounded-[8px] border border-white/10 bg-black/20 px-3 py-2">
        <p className="text-[11px] text-white/40" style={{ fontFamily: MONO }}>
          Target: {activeFile || "no file selected"}
        </p>
      </div>

      <label className="mt-3 block">
        <span className="text-[11px] text-white/40">Instruction (optional)</span>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. note that this endpoint needs rate limiting"
          rows={3}
          className="mt-1 w-full resize-none rounded-[7px] border border-white/10 bg-black/30 px-2.5 py-2 text-[12px] text-white/80 placeholder:text-white/25"
        />
      </label>

      <button
        type="button"
        onClick={suggest}
        className="mt-2 inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05]"
      >
        Suggest patch
      </button>

      {notice && <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">{notice}</p>}

      {proposal && (
        <div className="mt-3 space-y-2 rounded-[10px] border border-white/10 bg-[#0A0C11] p-3">
          <p className="text-[11.5px] leading-relaxed text-white/60">{proposal.summary}</p>
          <p className="text-[10.5px] text-white/35" style={{ fontFamily: MONO }}>
            +{stats.additions} / -{stats.removals}
          </p>
          <pre
            className="max-h-[280px] overflow-auto rounded-[6px] bg-black/40 px-2.5 py-2 text-[11px] leading-relaxed"
            style={{ fontFamily: MONO }}
          >
            {diff.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "add"
                    ? "text-[#8EE4B8]"
                    : line.type === "remove"
                      ? "text-[#F26B82]"
                      : "text-white/40"
                }
              >
                {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
                {line.line}
              </div>
            ))}
          </pre>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={apply}
              className="inline-flex h-8 items-center rounded-[7px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={discard}
              className="inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/70 hover:bg-white/[0.05]"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
