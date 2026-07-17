"use client";

import MonacoEditor from "@/components/relay/MonacoEditor";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export default function FilesPanel({
  filePaths,
  activeFile,
  content,
  onSelectFile,
  onChange,
  onMount,
}: {
  filePaths: string[];
  activeFile: string;
  content: string;
  onSelectFile: (path: string) => void;
  onChange: (value: string) => void;
  onMount?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2"
        style={{ fontFamily: MONO }}
      >
        {filePaths.map((path) => (
          <button
            key={path}
            type="button"
            onClick={() => onSelectFile(path)}
            className={`shrink-0 rounded-[6px] px-2.5 py-1 text-[12px] ${
              activeFile === path
                ? "bg-white/[0.1] text-white"
                : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
            }`}
          >
            {path}
          </button>
        ))}
      </div>
      <div className="relative min-h-[260px] flex-1 bg-[#08090C]">
        {activeFile ? (
          <MonacoEditor path={activeFile} value={content} onChange={onChange} height="100%" onMount={onMount} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-white/35">
            Select a file to edit
          </div>
        )}
      </div>
    </div>
  );
}
