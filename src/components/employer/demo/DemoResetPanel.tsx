"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { clearScopedDrafts } from "@/components/sandbox/demo/useDemoState";

type State = { kind: "idle" } | { kind: "confirm" } | { kind: "working" } | { kind: "done" } | { kind: "error"; message: string };

/** Reset demo, with exactly what it removes stated before anything happens. */
export default function DemoResetPanel({ storageScope, resetAt }: { storageScope: string; resetAt: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  const reset = async () => {
    setState({ kind: "working" });
    try {
      const res = await fetch("/api/employer/demo/reset", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? "The demo could not be reset. Nothing was changed." });
        return;
      }
      clearScopedDrafts(storageScope);
      setState({ kind: "done" });
      router.refresh();
    } catch {
      setState({ kind: "error", message: "The reset could not reach the server. Nothing was changed." });
    }
  };

  return (
    <Panel>
      <PanelSection
        title="Reset demo"
        description="Removes your sandbox decisions, private notes, follow-up questions, your sample submission and the task drafts kept in this browser, then restores the three fictional applicants and their seeded thread. Your live workspace and other people's demos are not affected."
        action={
          state.kind === "confirm" || state.kind === "working" ? null : (
            <Button variant="secondary" size="sm" onClick={() => setState({ kind: "confirm" })}>
              Reset demo
            </Button>
          )
        }
      >
        {state.kind === "confirm" || state.kind === "working" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-app-body text-[var(--text-primary)]">Reset everything listed above?</p>
            <Button variant="primary" size="sm" onClick={() => void reset()} loading={state.kind === "working"}>
              Reset demo
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setState({ kind: "idle" })} disabled={state.kind === "working"}>
              Cancel
            </Button>
          </div>
        ) : null}
        {state.kind === "done" ? (
          <p role="status" className="text-app-body text-[var(--text-secondary)]">
            The demo is back to its starting state.
          </p>
        ) : null}
        {state.kind === "error" ? (
          <p role="alert" className="text-app-body text-[var(--fydell-risk)]">
            {state.message}
          </p>
        ) : null}
        {state.kind === "idle" && resetAt ? (
          <p className="text-app-meta text-[var(--text-tertiary)]">Last reset {new Date(resetAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.</p>
        ) : null}
      </PanelSection>
    </Panel>
  );
}
