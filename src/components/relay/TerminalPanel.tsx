"use client";

import { useState } from "react";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const QUICK = ["test", "evals", "preview", "reconcile", "help"] as const;

function extractProblems(output: string): string[] {
  return output
    .split("\n")
    .filter((line) => /^FAIL\b|^\[error\]|^\[stderr\]|^WARN\b|Command not allowed/i.test(line.trim()))
    .slice(0, 12);
}

export default function TerminalPanel({
  onRun,
  running,
  output,
}: {
  onRun: (command: string) => void;
  running: boolean;
  output: string;
}) {
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const problems = extractProblems(output);

  function submit(command: string) {
    const trimmed = command.trim();
    if (!trimmed || running) return;
    setHistory((h) => [...h.filter((x) => x !== trimmed), trimmed].slice(-40));
    setHistIdx(-1);
    setCmd("");
    onRun(trimmed);
  }

  return (
    <div className="flex max-h-[34vh] min-h-[150px] shrink-0 flex-col border-t border-white/[0.08] bg-[#080A0F]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-3 py-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={running}
            onClick={() => submit(q)}
            className="inline-flex h-7 items-center rounded-[6px] border border-white/12 px-2.5 text-[11.5px] text-[#9AA3B2] hover:bg-white/[0.05] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-[#687182]" style={{ fontFamily: MONO }}>
          allowlisted runtime
        </span>
      </div>
      <div className="flex min-h-0 flex-1 divide-x divide-white/[0.06]">
        <pre
          className="min-h-0 flex-[2] overflow-auto whitespace-pre-wrap px-3 py-2 text-[11.5px] leading-relaxed text-[#9CE5B0]"
          style={{ fontFamily: MONO }}
        >
          {output}
        </pre>
        <div className="hidden min-h-0 w-[200px] shrink-0 overflow-auto px-2.5 py-2 sm:block">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#687182]">
            Problems
          </p>
          {problems.length === 0 ? (
            <p className="mt-2 text-[11.5px] text-[#687182]">No failures in last output.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {problems.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 20)}`}
                  className="rounded-[5px] bg-[#F26B82]/[0.1] px-1.5 py-1 text-[11px] text-[#fda4b0]"
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <form
        className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(cmd);
        }}
      >
        <span className="text-[12px] text-[#6470FF]" style={{ fontFamily: MONO }}>
          $
        </span>
        <input
          value={cmd}
          disabled={running}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!history.length) return;
              const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
              setHistIdx(next);
              setCmd(history[next] || "");
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (histIdx < 0) return;
              const next = histIdx + 1;
              if (next >= history.length) {
                setHistIdx(-1);
                setCmd("");
              } else {
                setHistIdx(next);
                setCmd(history[next] || "");
              }
            }
          }}
          placeholder="Type a command (e.g. test, preview, reconcile)"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#F4F5F7] outline-none placeholder:text-[#687182]"
          style={{ fontFamily: MONO }}
          aria-label="Terminal command"
        />
        <button
          type="submit"
          disabled={running || !cmd.trim()}
          className="inline-flex h-8 items-center rounded-[7px] bg-[#6470FF] px-3 text-[12px] font-medium text-white disabled:opacity-50"
        >
          Run
        </button>
      </form>
    </div>
  );
}
