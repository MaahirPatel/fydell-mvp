"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { RoleState, RoleTransition } from "@/lib/hiring/role-contract";
import { send } from "./send";

const ACTIONS: Record<RoleState, { action: RoleTransition; label: string; variant: "primary" | "secondary" | "quiet" }[]> = {
  draft: [{ action: "close", label: "Discard draft", variant: "quiet" }],
  open: [
    { action: "pause", label: "Pause applications", variant: "secondary" },
    { action: "fill", label: "Mark filled", variant: "secondary" },
    { action: "close", label: "Close role", variant: "quiet" },
  ],
  paused: [
    { action: "reopen", label: "Reopen applications", variant: "primary" },
    { action: "fill", label: "Mark filled", variant: "secondary" },
    { action: "close", label: "Close role", variant: "quiet" },
  ],
  filled: [],
  closed: [],
};

const CONFIRM: Partial<Record<RoleTransition, string>> = {
  close: "Close this role? The page stops taking applications. Applications already received stay in your workspace.",
  fill: "Mark this role filled? The page tells applicants it's filled and stops taking applications.",
};

/** Publish (with the genuine-opening confirmation), pause, reopen, fill or close. */
export default function RoleStatusControls({
  roleId,
  state,
  publicUrl,
  problems,
}: {
  roleId: string;
  state: RoleState;
  publicUrl: string | null;
  problems: string[];
}) {
  const router = useRouter();
  const [genuine, setGenuine] = useState(false);
  const [busy, setBusy] = useState<RoleTransition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(action: RoleTransition) {
    const question = CONFIRM[action];
    if (question && !window.confirm(question)) return;
    setBusy(action);
    setError(null);
    const result = await send<{ role: { id: string } }>(`/api/hiring/roles/${roleId}`, "POST", { action, confirmGenuine: action === "publish" ? genuine : false });
    setBusy(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  async function copy() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  return (
    <div className="grid gap-4">
      {state === "draft" ? (
        <div className="grid gap-3">
          {problems.filter((p) => !p.startsWith("Confirm")).length > 0 ? (
            <ul className="grid gap-1.5 text-app-meta text-[var(--text-secondary)]">
              {problems
                .filter((p) => !p.startsWith("Confirm"))
                .map((p) => (
                  <li key={p}>{p}</li>
                ))}
            </ul>
          ) : null}
          <label className="flex items-start gap-2.5 text-app-meta leading-[1.5] text-[var(--text-body)]">
            <input type="checkbox" checked={genuine} onChange={(e) => setGenuine(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--control-solid)]" />
            <span>This is a genuine open position we intend to hire for, and the page describes it accurately.</span>
          </label>
          <Button variant="primary" onClick={() => run("publish")} loading={busy === "publish"} disabled={!genuine || busy !== null}>
            Publish role page
          </Button>
        </div>
      ) : null}

      {publicUrl && state !== "draft" ? (
        <div className="grid gap-2">
          <p className="text-app-meta font-medium text-[var(--text-primary)]">Role page link</p>
          <div className="flex items-center gap-2">
            <input readOnly value={publicUrl} aria-label="Role page link" onFocus={(e) => e.currentTarget.select()} className="platform-input min-w-0 flex-1 font-mono text-app-meta" />
            <Button size="sm" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-app-meta text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">
            Open as an applicant sees it
          </a>
        </div>
      ) : null}

      {ACTIONS[state].length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {ACTIONS[state].map((a) => (
            <Button key={a.action} size="sm" variant={a.variant} onClick={() => run(a.action)} loading={busy === a.action} disabled={busy !== null}>
              {a.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-app-meta text-[var(--text-secondary)]">
          {state === "filled" ? "This role is filled. Its page and applications are kept for your records." : "This role is closed. Its applications are kept for your records."}
        </p>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
