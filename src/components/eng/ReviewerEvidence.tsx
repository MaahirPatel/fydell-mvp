"use client";

import { useState } from "react";
import { PanelLabel } from "@/components/ui/Panel";
import { formatBytes } from "./api";
import { FileViewer, ProbeTable, type FileTarget, type ThreadMessage } from "./EvidenceViews";
import type { ProbeResult } from "@/lib/eng/types";

/** How a teammate message was produced, in words a reviewer can use. */
function replySource(ruleId: string): string {
  if (ruleId === "kickoff") return "Kickoff brief";
  if (ruleId.startsWith("update:")) return "Requirement update";
  if (ruleId === "gen:conversation") return "Conversational reply, no policy stated";
  if (ruleId.startsWith("gen:")) return "Written for this message, using the team's decided wording";
  if (ruleId === "fallback") return "Not covered by the team's decisions";
  return "The team's decided wording";
}

export default function ReviewerEvidence({
  apiBase,
  results,
  files,
  messages,
  handoff,
  aiDisclosure,
  teammates,
}: {
  apiBase: string;
  results: ProbeResult[];
  files: { path: string; size: number }[];
  messages: (ThreadMessage & { rule_id?: string | null })[];
  handoff: Record<string, string>;
  aiDisclosure: string;
  teammates: Record<string, string>;
}) {
  const [file, setFile] = useState<FileTarget | null>(null);
  return (
    <div className="grid gap-6">
      <section>
        <PanelLabel>Trusted checks</PanelLabel>
        <div className="mt-2">
          <ProbeTable results={results} />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <PanelLabel>Submitted files</PanelLabel>
          <ul className="mt-2 grid gap-0.5">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setFile({ path: f.path })}
                  className={`w-full truncate rounded-[var(--radius-control)] px-2 py-1 text-left font-mono text-[13px] ${
                    file?.path === f.path ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                  title={`${f.path} (${formatBytes(f.size)})`}
                >
                  {f.path}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          {file ? (
            <FileViewer endpoint={`${apiBase}/file`} target={file} onClose={() => setFile(null)} />
          ) : (
            <p className="text-app-meta text-[var(--text-tertiary)]">Choose a file to read it with line numbers. Line numbers are what file citations refer to.</p>
          )}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <PanelLabel>Handoff</PanelLabel>
          <dl className="mt-2 grid gap-3">
            {Object.entries(handoff).map(([key, value]) => (
              <div key={key}>
                <dt className="text-app-meta capitalize text-[var(--text-tertiary)]">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{value || "Empty"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-app-meta text-[var(--text-tertiary)]">AI assistance (candidate&apos;s statement)</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{aiDisclosure || "Nothing stated."}</dd>
            </div>
          </dl>
        </div>
        <div>
          <PanelLabel>Team thread</PanelLabel>
          <ol className="mt-2 grid max-h-[480px] gap-2 overflow-auto pr-1">
            {messages.map((m) => (
              <li key={m.id} className={`rounded-[var(--radius-control)] px-2.5 py-2 text-app-meta leading-[1.55] ${m.sender === "candidate" ? "bg-[var(--surface-hover)]" : ""}`}>
                <span className="font-medium text-[var(--text-primary)]">{m.sender === "candidate" ? "Candidate" : teammates[m.teammate_id ?? ""] ?? "Teammate"}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                {m.sender === "teammate" && m.rule_id ? (
                  <span className="ml-2 text-[var(--text-tertiary)]" title={m.rule_id}>
                    {replySource(m.rule_id)}
                  </span>
                ) : null}
                <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-secondary)]">{m.body}</p>
              </li>
            ))}
            {messages.length === 0 ? <li className="text-app-meta text-[var(--text-tertiary)]">No messages.</li> : null}
          </ol>
        </div>
      </section>
    </div>
  );
}
