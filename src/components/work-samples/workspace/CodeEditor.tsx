"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/** A plain monospace textarea with a line-number gutter. */
export function CodeEditor({
  id,
  value,
  onChange,
  label,
  readOnly,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  className?: string;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  return (
    <div className={cn("flex h-[440px] overflow-hidden bg-[var(--surface-code)]", className)}>
      <div
        ref={gutter}
        aria-hidden
        className="select-none overflow-hidden border-r border-[var(--border-subtle)] px-2.5 py-3 text-right font-mono text-[12.5px] leading-[1.6] text-[var(--text-disabled)]"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        id={id}
        aria-label={label}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
        }}
        className="h-full min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[12.5px] leading-[1.6] text-[var(--text-primary)] outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(86,98,255,0.35)]"
      />
    </div>
  );
}

export default CodeEditor;
