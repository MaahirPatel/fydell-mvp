"use client";

import { useRef, type ReactNode } from "react";
import { useMonacoBoot, usePlainEditorChoice, type MonacoBootFailure } from "./monaco-boot";

const BUTTON =
  "inline-flex h-8 items-center rounded-[6px] px-3 text-[13px] font-medium outline-offset-2 disabled:opacity-45";
const PRIMARY = `${BUTTON} bg-[var(--control-solid)] text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]`;
const SECONDARY = `${BUTTON} border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]`;

export function EditorLoadingNotice({ label = "Loading the editor" }: { label?: string }) {
  return (
    <p className="p-5 text-[13px] text-[var(--text-secondary)]" role="status">
      {label}
    </p>
  );
}

function EditorLoadFailure({
  failure,
  onRetry,
  onUsePlain,
}: {
  failure: MonacoBootFailure;
  onRetry: () => void;
  onUsePlain?: () => void;
}) {
  return (
    <div role="alert" className="flex h-full flex-col justify-center gap-3 p-6">
      <p className="text-[14px] font-medium text-[var(--text-primary)]">The code editor did not load</p>
      <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">{failure.detail}</p>
      <p className="max-w-[60ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
        Your changes are kept.{" "}
        {onUsePlain ? "Try again, or keep working in the plain text editor, which edits the same files." : "Try again to load it."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onRetry} className={PRIMARY}>
          Try again
        </button>
        {onUsePlain ? (
          <button type="button" onClick={onUsePlain} className={SECONDARY}>
            Use the plain text editor
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A monospace textarea over the same buffer, for when Monaco cannot start. */
export function PlainCodeEditor({
  value,
  onChange,
  readOnly,
  label,
  onLoadFull,
}: {
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  label: string;
  /** Omitted when the editor code itself could not be downloaded, so there is nothing to retry in place. */
  onLoadFull?: () => void;
}) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-band)] px-3 py-1.5">
        <p className="text-[12.5px] text-[var(--text-secondary)]">
          {onLoadFull
            ? "Plain text editor. Syntax highlighting and find are off here."
            : "The full editor could not be downloaded, so this plain text editor is showing. Your changes are kept."}
        </p>
        {onLoadFull ? (
          <button type="button" onClick={onLoadFull} className="text-[12.5px] font-medium text-[var(--text-primary)] underline underline-offset-2">
            Load the full editor
          </button>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={gutter}
          aria-hidden
          className="select-none overflow-hidden border-r border-[var(--border-subtle)] px-2.5 py-3 text-right font-mono text-[13px] leading-[1.6] text-[var(--text-tertiary)]"
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
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
          className="h-full min-w-0 flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[13px] leading-[1.6] text-[var(--text-primary)] outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Renders `children` once Monaco is ready. Loading is bounded by the boot
 * deadline; a failure explains what broke and offers a retry. When `plain`
 * is given, the person can also keep editing in a textarea.
 */
export function EditorBootGate({
  children,
  plain,
  loadingLabel,
}: {
  children: ReactNode;
  plain?: { value: string; onChange: (value: string) => void; readOnly: boolean; label: string };
  loadingLabel?: string;
}) {
  const { state, retry } = useMonacoBoot();
  const [usePlain, setUsePlain] = usePlainEditorChoice();

  if (plain && usePlain) {
    return (
      <PlainCodeEditor
        {...plain}
        onLoadFull={() => {
          setUsePlain(false);
          retry();
        }}
      />
    );
  }
  if (state.status === "ready") return <>{children}</>;
  if (state.status === "loading") return <EditorLoadingNotice label={loadingLabel} />;
  return <EditorLoadFailure failure={state.failure} onRetry={retry} onUsePlain={plain ? () => setUsePlain(true) : undefined} />;
}
