"use client";
import Editor from '@monaco-editor/react';
import { EditorBootGate } from '@/components/simulations/workspace/EditorFallback';

export default function PythonEditor({ value, onChange, readOnly }: { value: string; onChange: (value: string) => void; readOnly: boolean }) {
  const edit = (next: string) => onChange(next.slice(0, 24000));
  return (
    <div className="h-[360px]">
      <EditorBootGate loadingLabel="Loading Python editor" plain={{ value, onChange: edit, readOnly, label: 'Python source code' }}>
        <Editor height="360px" language="python" theme="vs-dark" value={value}
          onChange={next => edit(next ?? '')}
          loading={<p className="p-5 text-app-body text-[var(--text-secondary)]" role="status">Loading Python editor</p>}
          options={{ readOnly, ariaLabel: 'Python source code', fontSize: 13, lineHeight: 24,
            minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false,
            wordWrap: 'on', tabSize: 4, padding: { top: 16, bottom: 16 },
            quickSuggestions: false, renderLineHighlight: 'line', accessibilitySupport: 'on' }} />
      </EditorBootGate>
    </div>
  );
}
