"use client";
import Editor, { loader } from '@monaco-editor/react';
loader.config({ paths: { vs: '/monaco/vs' } });

export default function PythonEditor({ value, onChange, readOnly }: { value: string; onChange: (value: string) => void; readOnly: boolean }) {
  return <Editor height="360px" language="python" theme="vs-dark" value={value}
    onChange={next => onChange((next ?? '').slice(0, 24000))}
    loading={<p className="p-5 text-app-body text-[var(--text-secondary)]" role="status">Loading Python editor…</p>}
    options={{ readOnly, ariaLabel: 'Python source code', fontSize: 13, lineHeight: 24,
      minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false,
      wordWrap: 'on', tabSize: 4, padding: { top: 16, bottom: 16 },
      quickSuggestions: false, renderLineHighlight: 'line', accessibilitySupport: 'on' }} />;
}
