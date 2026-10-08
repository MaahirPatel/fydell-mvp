"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { LineList } from "../ui";
import { FileSetEditor } from "./FileSetEditor";
import { nextId, type Draft, type Edit } from "./model";

export function FilesEditor({ draft, edit, readOnly }: { draft: Draft; edit: Edit; readOnly: boolean }) {
  const { pkg, prot } = draft;
  const publicTestFiles = new Set(pkg.publicTests.map((t) => t.file));
  const fixtures = new Set(pkg.fixturePaths);
  const ext = pkg.environment.language === "python" ? "py" : pkg.environment.language === "typescript" ? "ts" : "js";

  return (
    <div className="grid gap-6">
      <Panel>
        <PanelSection title="Starter project" description="Candidates receive exactly these files, including the public tests.">
          <FileSetEditor
            label="Starter files"
            files={pkg.starterFiles}
            readOnly={readOnly}
            emptyText="No starter files yet."
            newFilePlaceholder={`src/module.${ext}`}
            tagFor={(p) => (publicTestFiles.has(p) ? "public test" : fixtures.has(p) ? "fixture" : null)}
            takenElsewhere={prot.protectedTests.map((f) => f.path)}
            onChange={(files) => edit("files", (d) => ({ ...d, pkg: { ...d.pkg, starterFiles: files } }))}
          />
        </PanelSection>
      </Panel>

      <Panel>
        <PanelSection title="Reference solution, evaluators only" description="Overlaid on the starter project. Every test must pass with it.">
          <FileSetEditor
            label="Reference solution files"
            files={prot.reference.files}
            readOnly={readOnly}
            emptyText="No reference files yet."
            newFilePlaceholder={`src/module.${ext}`}
            onChange={(files) => edit("files", (d) => ({ ...d, prot: { ...d.prot, reference: { ...d.prot.reference, files } } }))}
          />
          <Field className="mt-4" label="Valid approaches" htmlFor="ref-approaches" optional help="Other correct ways to solve it, for reviewers.">
            <LineList
              id="ref-approaches"
              label="Approach"
              values={prot.reference.approaches}
              max={6}
              maxLength={400}
              addLabel="Add approach"
              onChange={(approaches) => edit("files", (d) => ({ ...d, prot: { ...d.prot, reference: { ...d.prot.reference, approaches } } }))}
            />
          </Field>
        </PanelSection>
      </Panel>

      <Panel>
        <PanelSection
          title="Incorrect solutions, evaluators only"
          description="Plausible mistakes. Each must fail at least one test, which shows the tests catch real errors. A solution is saved once it has a description and at least one file."
        >
          <div className="grid gap-6">
            {prot.incorrectSolutions.map((s, i) => (
              <div key={s.id} className="grid gap-3">
                <div className="flex items-end gap-2">
                  <Field className="flex-1" label={`Incorrect solution ${i + 1}`} htmlFor={`inc-${s.id}`}>
                    <Input
                      id={`inc-${s.id}`}
                      maxLength={300}
                      placeholder="What mistake this represents"
                      value={s.description}
                      readOnly={readOnly}
                      onChange={(e) =>
                        edit("files", (d) => ({ ...d, prot: { ...d.prot, incorrectSolutions: d.prot.incorrectSolutions.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) } }))
                      }
                    />
                  </Field>
                  {readOnly ? null : (
                    <Button
                      variant="quiet"
                      icon
                      aria-label={`Remove incorrect solution ${i + 1}`}
                      onClick={() => edit("files", (d) => ({ ...d, prot: { ...d.prot, incorrectSolutions: d.prot.incorrectSolutions.filter((_, j) => j !== i) } }))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </div>
                <FileSetEditor
                  label={`Files for incorrect solution ${i + 1}`}
                  files={s.files}
                  readOnly={readOnly}
                  emptyText="Add the files this solution changes."
                  newFilePlaceholder={`src/module.${ext}`}
                  onChange={(files) => edit("files", (d) => ({ ...d, prot: { ...d.prot, incorrectSolutions: d.prot.incorrectSolutions.map((x, j) => (j === i ? { ...x, files } : x)) } }))}
                />
              </div>
            ))}
            {prot.incorrectSolutions.length === 0 ? <p className="text-[14px] text-[var(--text-secondary)]">No incorrect solutions yet.</p> : null}
          </div>
          {readOnly || prot.incorrectSolutions.length >= 5 ? null : (
            <Button
              className="mt-4"
              size="sm"
              variant="secondary"
              onClick={() =>
                edit("files", (d) => ({
                  ...d,
                  prot: { ...d.prot, incorrectSolutions: [...d.prot.incorrectSolutions, { id: nextId("inc-", d.prot.incorrectSolutions.map((x) => x.id)), description: "", files: [] }] },
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add incorrect solution
            </Button>
          )}
        </PanelSection>
      </Panel>
    </div>
  );
}

export default FilesEditor;
