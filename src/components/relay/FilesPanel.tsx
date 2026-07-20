"use client";

import { useMemo, useState } from "react";
import MonacoEditor from "@/components/relay/MonacoEditor";
import DataTableView from "@/components/relay/DataTableView";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type TreeNode = { name: string; path: string; isFile: boolean; children: TreeNode[] };

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };
  for (const fullPath of paths) {
    const parts = fullPath.split("/");
    let node = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let child = node.children.find((c) => c.name === part && c.isFile === isFile);
      if (!child) {
        child = { name: part, path: acc, isFile, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root.children);
  return root.children;
}

function FileTree({
  nodes,
  activeFile,
  onSelectFile,
  depth = 0,
}: {
  nodes: TreeNode[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? "" : "ml-3 border-l border-white/[0.06]"}>
      {nodes.map((node) =>
        node.isFile ? (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onSelectFile(node.path)}
              className={`flex w-full items-center gap-1.5 rounded-[5px] px-2 py-1 text-left text-[12px] transition-colors ${
                activeFile === node.path ? "bg-white/[0.1] text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
              }`}
              style={{ fontFamily: MONO }}
            >
              {node.name}
            </button>
          </li>
        ) : (
          <li key={node.path}>
            <details open className="group">
              <summary className="cursor-pointer list-none rounded-[5px] px-2 py-1 text-[11.5px] font-medium text-white/40 hover:text-white/65">
                {node.name}/
              </summary>
              <FileTree nodes={node.children} activeFile={activeFile} onSelectFile={onSelectFile} depth={depth + 1} />
            </details>
          </li>
        )
      )}
    </ul>
  );
}

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
  const tree = useMemo(() => buildTree(filePaths), [filePaths]);
  const isCsv = activeFile.toLowerCase().endsWith(".csv");
  const [viewMode, setViewMode] = useState<"table" | "code">("table");
  const effectiveMode = isCsv ? viewMode : "code";

  return (
    <div className="flex h-full min-h-0">
      <div className="w-[190px] shrink-0 overflow-y-auto border-r border-white/[0.06] py-2 pr-1">
        <p className="px-2 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-white/35">Files</p>
        <FileTree nodes={tree} activeFile={activeFile} onSelectFile={onSelectFile} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2"
          style={{ fontFamily: MONO }}
        >
          <span className="truncate text-[12px] text-white/60">{activeFile || "no file selected"}</span>
          {isCsv && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-[5px] px-2 py-0.5 text-[11px] ${
                  viewMode === "table" ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={`rounded-[5px] px-2 py-0.5 text-[11px] ${
                  viewMode === "code" ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                Raw
              </button>
            </div>
          )}
        </div>
        <div className="relative min-h-[220px] flex-1 bg-[#08090C]">
          {!activeFile ? (
            <div className="flex h-full items-center justify-center text-[13px] text-white/35">
              Select a file to edit
            </div>
          ) : effectiveMode === "table" ? (
            <DataTableView content={content} path={activeFile} />
          ) : (
            <MonacoEditor path={activeFile} value={content} onChange={onChange} height="100%" onMount={onMount} />
          )}
        </div>
      </div>
    </div>
  );
}
