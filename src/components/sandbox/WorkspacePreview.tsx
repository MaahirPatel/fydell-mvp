"use client";
import { useEffect, useState } from 'react';
import type { SandboxSessionView } from '@/lib/sim-engine/proof/sandbox/view';
import { SandboxWorkbench } from './SandboxWorkbench';

/** Development-only host. The server route refuses to render it in production. */
export function WorkspacePreview({ initial }: { initial: SandboxSessionView }) {
  const [session, setSession] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setSession(value => ({ ...value })), 2000);
    return () => clearInterval(timer);
  }, []);
  return <div className="min-h-screen bg-[var(--surface-canvas)] p-4 text-[var(--text-primary)] sm:p-8">
    <p className="mb-6 text-app-meta text-[var(--color-changed)]">Development preview · fictional session · saves last only until refresh · no execution results generated</p>
    <SandboxWorkbench session={session} busy={false} onEnsure={() => {}} onAction={async action => {
      if (action.type === 'save_code') setSession(value => ({ ...value, revision: value.revision + 1, workspace: { ...value.workspace, codeSource: String(action.source), codeExecution: null } }));
      else if (action.type === 'edit_config') setSession(value => ({ ...value, revision: value.revision + 1, workspace: { ...value.workspace, config: action.config as typeof value.workspace.config } }));
      else return false;
      return true;
    }} />
  </div>;
}
