"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";

/** Free-form tags with suggestions. Enter or comma adds a tag. */
export default function TagInput({
  id,
  tags,
  onChange,
  suggestions,
  maxTags,
  maxLength,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: readonly string[];
  maxTags: number;
  maxLength: number;
}) {
  const [value, setValue] = useState("");
  const add = (raw: string) => {
    const v = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
    if (!v || tags.length >= maxTags || tags.some((t) => t.toLowerCase() === v.toLowerCase())) return;
    onChange([...tags, v]);
    setValue("");
  };
  const remaining = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));
  return (
    <div className="grid gap-2">
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected">
          {tags.map((t) => (
            <li key={t}>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-selected)] pl-2.5 pr-1 text-app-meta text-[var(--text-primary)]">
                {t}
                <button
                  type="button"
                  onClick={() => onChange(tags.filter((x) => x !== t))}
                  aria-label={`Remove ${t}`}
                  className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {tags.length < maxTags ? (
        <>
          <Input
            id={id}
            list={`${id}-suggestions`}
            value={value}
            maxLength={maxLength}
            placeholder="Type a language or technology and press Enter"
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) add(v);
              else setValue(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(value);
              } else if (e.key === "Backspace" && !value && tags.length > 0) {
                onChange(tags.slice(0, -1));
              }
            }}
            onBlur={() => add(value)}
          />
          <datalist id={`${id}-suggestions`}>
            {remaining.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5">
            {remaining.slice(0, 12).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="h-7 rounded-[6px] border border-dashed border-[var(--border-default)] px-2.5 text-app-meta text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                + {s}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
