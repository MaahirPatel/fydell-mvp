"use client";

import { useMemo, useState } from "react";
import FilesPanel from "@/components/relay/FilesPanel";
import DataTableView from "@/components/relay/DataTableView";
import EvaluationLab from "@/components/relay/EvaluationLab";
import TerminalPanel from "@/components/relay/TerminalPanel";
import type { EvalMetrics } from "@/lib/relay/eval-summary";
import { cn } from "@/lib/cn";

export type WorkbenchTab = "data" | "code" | "preview" | "tests";

const TABS: { id: WorkbenchTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "code", label: "Code" },
  { id: "preview", label: "Preview" },
  { id: "tests", label: "Tests" },
];

export default function WorkbenchPanel({
  tab,
  onTabChange,
  filePaths,
  files,
  activeFile,
  onSelectFile,
  onChangeFile,
  onEditorMount,
  previewOutput,
  onRunPreview,
  evalMetrics,
  evalLastRunAt,
  evalLastRunOk,
  onRunTests,
  onRunEvals,
  running,
  terminalOutput,
  onRunCommand,
}: {
  tab: WorkbenchTab;
  onTabChange: (tab: WorkbenchTab) => void;
  filePaths: string[];
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  onChangeFile: (path: string, value: string) => void;
  onEditorMount?: () => void;
  previewOutput: string | null;
  onRunPreview: () => void;
  evalMetrics: EvalMetrics | null;
  evalLastRunAt: string | null;
  evalLastRunOk: boolean | null;
  onRunTests: () => void;
  onRunEvals: () => void;
  running: boolean;
  terminalOutput: string;
  onRunCommand: (command: string) => void;
}) {
  const csvPaths = useMemo(
    () => filePaths.filter((p) => p.toLowerCase().endsWith(".csv")),
    [filePaths]
  );
  const [dataFile, setDataFile] = useState<string>("");
  const [compareFile, setCompareFile] = useState<string>("");

  const effectiveData = dataFile || csvPaths[0] || activeFile;
  const dataContent = files[effectiveData] || "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0B0F16]">
      <div className="flex items-center gap-1 border-b border-white/[0.08] px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={cn(
              "rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === t.id
                ? "bg-white/[0.08] text-[#F4F5F7]"
                : "text-[#687182] hover:bg-white/[0.04] hover:text-[#9AA3B2]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "data" && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              {csvPaths.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setDataFile(p);
                    onSelectFile(p);
                  }}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[12px]",
                    effectiveData === p
                      ? "bg-[#6470FF]/20 text-[#F4F5F7]"
                      : "text-[#687182] hover:bg-white/[0.04]"
                  )}
                >
                  {p.split("/").pop()}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1.5 text-[11.5px] text-[#687182]">
                Compare
                <select
                  value={compareFile}
                  onChange={(e) => setCompareFile(e.target.value)}
                  className="h-7 rounded-[6px] border border-white/10 bg-[#10141D] px-1.5 text-[11.5px] text-[#9AA3B2]"
                >
                  <option value="">—</option>
                  {csvPaths
                    .filter((p) => p !== effectiveData)
                    .map((p) => (
                      <option key={p} value={p}>
                        {p.split("/").pop()}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  onSelectFile(effectiveData);
                  onTabChange("code");
                }}
                className="h-7 rounded-[6px] border border-white/12 px-2 text-[11.5px] text-[#9AA3B2] hover:bg-white/[0.04]"
              >
                Open in code
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <DataTableView
                content={dataContent}
                path={effectiveData}
                compareContent={compareFile ? files[compareFile] : null}
                comparePath={compareFile || null}
              />
            </div>
          </div>
        )}

        {tab === "code" && (
          <FilesPanel
            filePaths={filePaths}
            activeFile={activeFile}
            content={files[activeFile] || ""}
            onSelectFile={onSelectFile}
            onChange={(value) => onChangeFile(activeFile, value)}
            onMount={onEditorMount}
          />
        )}

        {tab === "preview" && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
              <div>
                <p className="text-[13px] font-medium text-[#F4F5F7]">Daily delay operational view</p>
                <p className="text-[11.5px] text-[#687182]">
                  Refreshes from your current pipeline — not a hardcoded dashboard.
                </p>
              </div>
              <button
                type="button"
                disabled={running}
                onClick={onRunPreview}
                className="inline-flex h-8 items-center rounded-[7px] bg-[#6470FF] px-3 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {running ? "Refreshing…" : "Refresh preview"}
              </button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 text-[12.5px] leading-relaxed text-[#9AA3B2]">
              {previewOutput ||
                "No preview yet. Click Refresh preview (runs the allowlisted preview command against your files)."}
            </pre>
          </div>
        )}

        {tab === "tests" && (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto">
            <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-4 py-3">
              <button
                type="button"
                disabled={running}
                onClick={onRunTests}
                className="inline-flex h-8 items-center rounded-[7px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C] disabled:opacity-50"
              >
                Run visible tests
              </button>
              <button
                type="button"
                disabled={running}
                onClick={onRunEvals}
                className="inline-flex h-8 items-center rounded-[7px] border border-white/12 px-3 text-[12px] text-[#9AA3B2] disabled:opacity-50"
              >
                Run scenario checks
              </button>
            </div>
            <div className="px-4 py-3 text-[12.5px] leading-relaxed text-[#9AA3B2]">
              <p className="font-medium text-[#F4F5F7]">Candidate-visible checks</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Preserves already-normalized shipment IDs</li>
                <li>Normalizes supported ID variations without merging unrelated records</li>
                <li>Reconciles unmatched delayed shipments</li>
                <li>Late-rate calculation uses the corrected set</li>
              </ul>
              <p className="mt-3 text-[11.5px] text-[#687182]">
                Hidden robustness checks run only after submission. Failure output appears in the
                terminal below.
              </p>
            </div>
            <EvaluationLab
              metrics={evalMetrics}
              lastRunAt={evalLastRunAt}
              lastRunOk={evalLastRunOk}
              onRunEvals={onRunEvals}
              running={running}
            />
          </div>
        )}
      </div>

      <TerminalPanel onRun={onRunCommand} running={running} output={terminalOutput} />
    </div>
  );
}
