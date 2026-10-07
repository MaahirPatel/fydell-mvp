"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { HOW_I_BUILD_MAX } from "@/lib/profile/how-i-build";
import type { HowIBuild } from "@/lib/profile/types";

/** Owner control for the "How I build" statement. Private unless the engineer ticks the share option. */
export default function HowIBuildEditor({ initial }: { initial: HowIBuild | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial?.text ?? "");
  const [include, setInclude] = useState(initial?.includeInShares ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setText(initial?.text ?? "");
    setInclude(initial?.includeInShares ?? false);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/how-i-build", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, includeInShares: include }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save. Your text is kept; try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Your text is kept; try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={start}>
        {initial ? "Edit" : "Add"}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="How I build"
        description="Your own statement about how you work. Fydell does not check it, and recipients see it labelled as yours."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" loading={busy} onClick={save}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {error ? <FormError>{error}</FormError> : null}
          <Field
            label="How you work"
            htmlFor="how-i-build-text"
            help={`Your working style, how you test, and how you use AI tools. ${text.length.toLocaleString("en-US")} of ${HOW_I_BUILD_MAX.toLocaleString("en-US")} characters. Leave empty to remove it.`}
          >
            <Textarea
              id="how-i-build-text"
              rows={8}
              maxLength={HOW_I_BUILD_MAX}
              value={text}
              placeholder="I start with a failing test for the bug, keep changes small, and review every AI suggestion line by line before it ships."
              onChange={(e) => {
                setText(e.target.value);
                if (!e.target.value.trim()) setInclude(false);
              }}
            />
          </Field>
          <label className="flex items-start gap-2.5 text-[14px] text-[var(--text-body)]">
            <input
              type="checkbox"
              className="mt-[3px] accent-[var(--control-solid)]"
              checked={include}
              disabled={!text.trim()}
              onChange={(e) => setInclude(e.target.checked)}
            />
            <span>
              Include in share links I create
              <span className="block text-[13px] text-[var(--text-secondary)]">Off by default. While off, only you see this section.</span>
            </span>
          </label>
        </div>
      </Sheet>
    </>
  );
}
