"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { Combobox, type ComboOption } from "../Combobox";
import type { PackageFile, TestRef } from "../types";
import { FileSetEditor } from "./FileSetEditor";
import type { Draft, Edit } from "./model";

const TEST_FILE = /(^|\/)(test_[^/]*\.py|[^/]*_test\.py|[^/]*\.test\.(js|ts|mjs))$/;

function renamed(before: PackageFile[], after: PackageFile[]): { from: string; to: string } | null {
  const a = new Set(after.map((f) => f.path));
  const b = new Set(before.map((f) => f.path));
  const removed = before.filter((f) => !a.has(f.path));
  const added = after.filter((f) => !b.has(f.path));
  return removed.length === 1 && added.length === 1 ? { from: removed[0].path, to: added[0].path } : null;
}

function moveRefs(refs: TestRef[], r: { from: string; to: string } | null): TestRef[] {
  return r ? refs.map((t) => (t.file === r.from ? { ...t, file: r.to } : t)) : refs;
}

export function TestsEditor({ draft, edit, readOnly }: { draft: Draft; edit: Edit; readOnly: boolean }) {
  const { pkg, prot } = draft;
  const [added, setAdded] = useState<string[]>([]);
  const refFiles = new Set(pkg.publicTests.map((t) => t.file));
  const publicFiles = pkg.starterFiles.filter((f) => refFiles.has(f.path) || TEST_FILE.test(f.path) || added.includes(f.path));
  const acOptions: ComboOption[] = pkg.acceptanceCriteria.map((a) => ({ value: a.id, label: `${a.id}: ${a.text.slice(0, 80)}` }));

  function setPublicFiles(next: PackageFile[]) {
    const before = new Set(publicFiles.map((f) => f.path));
    const fresh = next.filter((f) => !pkg.starterFiles.some((s) => s.path === f.path)).map((f) => f.path);
    if (fresh.length) setAdded((prev) => [...prev, ...fresh]);
    const r = renamed(publicFiles, next);
    edit("tests", (d) => ({
      ...d,
      pkg: { ...d.pkg, starterFiles: [...d.pkg.starterFiles.filter((f) => !before.has(f.path)), ...next], publicTests: moveRefs(d.pkg.publicTests, r) },
    }));
  }

  function setProtectedFiles(next: PackageFile[]) {
    const r = renamed(prot.protectedTests, next);
    edit("tests", (d) => ({ ...d, prot: { ...d.prot, protectedTests: next, protectedTestRefs: moveRefs(d.prot.protectedTestRefs, r) } }));
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <PanelSection title="Public tests" description="Part of the starter project. Candidates can read and run them.">
          <FileSetEditor
            label="Public test files"
            files={publicFiles}
            readOnly={readOnly}
            emptyText="No public test files."
            newFilePlaceholder={pkg.environment.language === "python" ? "tests/test_public.py" : "tests/public.test.js"}
            takenElsewhere={[...pkg.starterFiles.filter((f) => !publicFiles.includes(f)).map((f) => f.path), ...prot.protectedTests.map((f) => f.path)]}
            onChange={setPublicFiles}
          />
          <h3 className="mt-5 text-[14px] font-medium text-[var(--text-primary)]">Test list</h3>
          <TestRefTable
            idPrefix="pub"
            refs={pkg.publicTests}
            files={publicFiles.map((f) => f.path)}
            acOptions={acOptions}
            readOnly={readOnly}
            onChange={(refs) => edit("tests", (d) => ({ ...d, pkg: { ...d.pkg, publicTests: refs } }))}
          />
        </PanelSection>
      </Panel>

      <Panel>
        <PanelSection title="Evaluation tests" description="Evaluators only, never shown to candidates. They run against the submission together with the public tests.">
          <FileSetEditor
            label="Evaluation test files"
            files={prot.protectedTests}
            readOnly={readOnly}
            emptyText="No evaluation test files."
            newFilePlaceholder={pkg.environment.language === "python" ? "tests/test_evaluation.py" : "tests/evaluation.test.js"}
            takenElsewhere={pkg.starterFiles.map((f) => f.path)}
            onChange={setProtectedFiles}
          />
          <h3 className="mt-5 text-[14px] font-medium text-[var(--text-primary)]">Test list</h3>
          <TestRefTable
            idPrefix="eval"
            refs={prot.protectedTestRefs}
            files={prot.protectedTests.map((f) => f.path)}
            acOptions={acOptions}
            readOnly={readOnly}
            onChange={(refs) => edit("tests", (d) => ({ ...d, prot: { ...d.prot, protectedTestRefs: refs } }))}
          />
        </PanelSection>
      </Panel>
    </div>
  );
}

function TestRefTable({
  idPrefix,
  refs,
  files,
  acOptions,
  readOnly,
  onChange,
}: {
  idPrefix: string;
  refs: TestRef[];
  files: string[];
  acOptions: ComboOption[];
  readOnly: boolean;
  onChange: (refs: TestRef[]) => void;
}) {
  const fileOptions: ComboOption[] = files.map((f) => ({ value: f, label: f }));
  const set = (i: number, patch: Partial<TestRef>) => onChange(refs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-2">
      <p className="text-[13px] leading-[1.5] text-[var(--text-secondary)]">
        Names must match what the runner reports, for example <code className="font-mono">test_module.TestCase.test_name</code>. Map each test to the acceptance criteria it checks.
      </p>
      {refs.length === 0 ? <p className="mt-3 text-[14px] text-[var(--text-secondary)]">No tests listed.</p> : null}
      <ul className="mt-3 grid gap-3">
        {refs.map((r, i) => (
          <li key={i} className="grid gap-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
            <Input aria-label={`Test ${i + 1} name`} className="font-mono text-[12.5px]" maxLength={200} value={r.name} readOnly={readOnly} onChange={(e) => set(i, { name: e.target.value })} />
            <Combobox id={`${idPrefix}-file-${i}`} options={fileOptions} value={r.file} placeholder="Test file" disabled={readOnly} onChange={(v) => set(i, { file: v })} />
            <Combobox
              id={`${idPrefix}-ac-${i}`}
              multiple
              options={acOptions}
              value={r.criterionIds}
              placeholder="Not mapped"
              disabled={readOnly}
              onChange={(v) => set(i, { criterionIds: v.slice(0, 10) })}
            />
            {readOnly ? null : (
              <Button variant="quiet" icon aria-label={`Remove test ${i + 1}`} onClick={() => onChange(refs.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {readOnly ? null : (
        <Button className="mt-3" size="sm" variant="quiet" disabled={files.length === 0} onClick={() => onChange([...refs, { name: "", file: files[0] ?? "", criterionIds: [] }])}>
          <Plus className="h-4 w-4" aria-hidden />
          Add test
        </Button>
      )}
    </div>
  );
}

export default TestsEditor;
