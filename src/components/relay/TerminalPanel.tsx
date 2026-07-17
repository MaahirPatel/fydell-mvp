"use client";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const COMMANDS = ["test", "evals", "preview"] as const;

/** Pulls FAIL / error lines out of raw command output for a quick-scan problems list. */
function extractProblems(output: string): string[] {
  return output
    .split("\n")
    .filter((line) => /^FAIL\b|^\[error\]|^\[stderr\]|^WARN\b/.test(line.trim()))
    .slice(0, 12);
}

export default function TerminalPanel({
  onRun,
  running,
  output,
}: {
  onRun: (command: (typeof COMMANDS)[number]) => void;
  running: boolean;
  output: string;
}) {
  const problems = extractProblems(output);

  return (
    <div className="flex max-h-[38vh] min-h-[160px] flex-col border-t border-white/[0.06]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        {COMMANDS.map((cmd) => (
          <button
            key={cmd}
            type="button"
            disabled={running}
            onClick={() => onRun(cmd)}
            className="inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
          >
            Run {cmd}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-white/30" style={{ fontFamily: MONO }}>
          allowlisted only — test · evals · preview
        </span>
      </div>
      <div className="flex min-h-0 flex-1 divide-x divide-white/[0.06]">
        <pre
          className="min-h-0 flex-[2] overflow-auto whitespace-pre-wrap px-4 py-3 text-[11.5px] leading-relaxed text-[#9CE5B0]"
          style={{ fontFamily: MONO }}
        >
          {output}
        </pre>
        <div className="hidden min-h-0 flex-1 overflow-auto px-3 py-3 sm:block">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/35">Problems &amp; logs</p>
          {problems.length === 0 ? (
            <p className="mt-2 text-[12px] text-white/35">No failures detected in the last run.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {problems.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 24)}`}
                  className="rounded-[6px] bg-[#F26B82]/[0.08] px-2 py-1 text-[11.5px] leading-snug text-[#fda4b0]"
                  style={{ fontFamily: MONO }}
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
