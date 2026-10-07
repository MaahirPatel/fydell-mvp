"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Code2, FileCode2, Play, Save, Terminal, AlertCircle } from 'lucide-react';
import type { SandboxSessionView } from '@/lib/sim-engine/proof/sandbox/view';
import { STARTER_CODE, type ExecutionResult } from '@/lib/code-execution/contract';

const PythonEditor = dynamic(() => import('./PythonEditor'), { ssr: false });

export function CodeWorkspace({ session, busy, onAction, onDirtyChange }: {
  session: SandboxSessionView; busy: boolean;
  onAction: (body: Record<string, unknown>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const saved = session.workspace.codeSource ?? STARTER_CODE;
  const [source, setSource] = useState(saved);
  const [tab, setTab] = useState<'brief' | 'code'>('code');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const cacheKey = `fydell:code-draft:${session.runId}`;
  const current = useRef(source);
  const dirty = source !== saved;
  const active = session.step === 'active';
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  useEffect(() => {
    try {
      const restored = sessionStorage.getItem(cacheKey);
      if (restored !== null) {
        current.current = restored;
        // sessionStorage only exists after hydration, so the draft is restored once on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSource(restored);
        if (restored !== saved) setMessage('Recovered your unsaved draft from this tab.');
      }
    } catch { /* Browser storage may be disabled; server saving still works. */ }
    // Restore once for this run; incoming polls do not own the editor buffer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function edit(value: string) {
    current.current = value;
    setSource(value);
    setMessage('');
    try { sessionStorage.setItem(cacheKey, value); } catch { setMessage('Local recovery is unavailable. Save your work before leaving.'); }
  }

  async function save(run: boolean) {
    if (pending || busy) return;
    const snapshot = current.current;
    setPending(true);
    setMessage(run ? 'Running your saved snapshot…' : 'Saving your code…');
    try {
      const ok = await onAction({ type: run ? 'run_code' : 'save_code', source: snapshot, idempotencyKey: crypto.randomUUID() });
      if (ok) {
        if (current.current === snapshot) {
          try { sessionStorage.removeItem(cacheKey); } catch {}
        }
        setMessage(current.current === snapshot ? (run ? 'Execution recorded.' : 'Code saved.') : 'Snapshot saved. You have newer edits.');
      } else setMessage('Could not save. Your draft is preserved; try again.');
    } finally { setPending(false); }
  }

  return <section className="mb-6 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)]" aria-label="Python engineering task">
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-default)] px-5 py-4">
      <Code2 className="h-5 w-5 text-[var(--color-evidence)]" aria-hidden />
      <div className="min-w-0 flex-1"><h2 className="text-app-section">Make the workflow safe to retry</h2><p className="mt-1 text-app-meta text-[var(--text-secondary)]">Python · request validation · idempotency</p></div>
      <button type="button" disabled={!active || busy || pending || !dirty} onClick={() => void save(false)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border-strong)] px-3 text-app-body disabled:opacity-40"><Save size={15} aria-hidden />Save code</button>
      <button type="button" disabled={!active || busy || pending || !session.executionAvailable} onClick={() => void save(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--control-solid)] px-3 text-app-body font-medium text-[var(--control-solid-ink)] disabled:opacity-40"><Play size={15} aria-hidden />{pending ? 'Working…' : 'Save & run tests'}</button>
    </div>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 lg:border-r border-[var(--border-default)]">
        <div className="flex gap-5 border-b border-[var(--border-subtle)] px-5" role="tablist" aria-label="Task files">
          {(['code', 'brief'] as const).map(value => <button key={value} id={`code-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls={`code-panel-${value}`} tabIndex={tab === value ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { const next = value === 'code' ? 'brief' : 'code'; setTab(next); document.getElementById(`code-tab-${next}`)?.focus(); } }} onClick={() => setTab(value)} className={`inline-flex items-center gap-2 border-b-2 py-3 text-app-body ${tab === value ? 'border-[var(--color-evidence)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'}`}><FileCode2 size={14} aria-hidden />{value === 'code' ? 'handler.py' : 'Task brief'}</button>)}
        </div>
        <div role="tabpanel" id={`code-panel-${tab}`} aria-labelledby={`code-tab-${tab}`}>
          {tab === 'code' ? <PythonEditor value={source} onChange={edit} readOnly={!active} /> : <div className="min-h-[350px] space-y-4 p-5 text-app-body text-[var(--text-secondary)]"><p>A provider can retry the same request after a timeout. Repair <code>handle_events(events)</code> so each valid request is accepted once per batch.</p><ul className="list-disc space-y-2 pl-5"><li>Return one object per input, in order: <code>id</code> and <code>status</code>.</li><li>Accept only requests where <code>authorized</code> is the boolean <code>True</code> and amount is a finite, positive number. Booleans are not amounts.</li><li>Reject invalid requests with status <code>rejected</code>.</li><li>After an ID is accepted, subsequent valid requests with that ID return <code>duplicate</code>. A rejected request must not reserve its ID.</li><li>IDs are provided as nonempty strings. Use only the Python standard library.</li></ul><p>Results measure this bounded task only. Explain your decisions in the architecture section below.</p></div>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] px-5 py-2 text-app-meta text-[var(--text-secondary)]" role="status"><span>{message || (dirty ? 'Unsaved changes · recovery copy in this tab' : 'Matches saved code')}</span><span className="ml-auto tabular-nums">{source.length.toLocaleString()} / 24,000</span></div>
      </div>
      <aside className="border-t border-[var(--border-default)] p-5 lg:border-t-0"><h3 className="flex items-center gap-2 text-app-body font-medium"><Terminal size={16} aria-hidden />Execution results</h3>
        {!session.executionAvailable && <p className="mt-3 text-app-meta text-[var(--text-secondary)]">Code execution is unavailable in this environment. You can continue editing and save your work.</p>}
        {dirty && session.workspace.codeExecution && <p className="mt-3 text-app-meta text-[var(--color-changed)]">These results belong to the saved snapshot. Run again after editing.</p>}
        <ExecutionResults result={session.workspace.codeExecution} />
      </aside>
    </div>
  </section>;
}

export function ExecutionResults({ result }: { result?: ExecutionResult | null }) {
  if (!result) return <p className="mt-5 text-app-body text-[var(--text-secondary)]">No code execution recorded yet.</p>;
  if (result.status !== 'completed') return <p className="mt-4 text-app-body text-[var(--color-changed)]" role="status">{({ infrastructure_error: 'The execution service failed. This is not a failed assessment.', timeout: 'The program exceeded its time limit.', output_limit: 'The program exceeded its output limit.', runtime_error: 'The program could not return valid results. Check syntax and the function contract.' })[result.status]}</p>;
  return <div className="mt-4"><p className="text-app-body font-medium">{result.tests.filter(t => t.passed).length} of {result.tests.length} checks passed</p><ul className="mt-3 divide-y divide-[var(--border-subtle)]">{result.tests.map(test => <li key={test.id} className="flex items-start gap-2 py-3 text-app-meta">{test.passed ? <Check size={15} className="shrink-0 text-[var(--color-good)]" aria-hidden /> : <AlertCircle size={15} className="shrink-0 text-[var(--color-changed)]" aria-hidden />}<span>{test.title}<span className="sr-only">: {test.passed ? 'passed' : 'failed'}</span></span></li>)}</ul><p className="mt-4 break-all font-mono text-[11px] text-[var(--text-secondary)]">Snapshot {result.sourceHash.slice(0, 12)} · {result.suiteVersion}</p></div>;
}
