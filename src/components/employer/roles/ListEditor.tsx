"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

/** An ordered list of short lines with add and remove. */
export default function ListEditor({
  id,
  items,
  onChange,
  maxItems,
  maxLength,
  placeholder,
  addLabel,
}: {
  id: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems: number;
  maxLength: number;
  placeholder: string;
  addLabel: string;
}) {
  const [next, setNext] = useState("");
  const add = () => {
    const v = next.replace(/\s+/g, " ").trim();
    if (!v || items.length >= maxItems || items.some((i) => i.toLowerCase() === v.toLowerCase())) return;
    onChange([...items, v.slice(0, maxLength)]);
    setNext("");
  };
  return (
    <div className="grid gap-2">
      {items.length > 0 ? (
        <ol className="grid gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-app-meta tabular-nums text-[var(--text-tertiary)]">{i + 1}.</span>
              <Input
                aria-label={`Item ${i + 1}`}
                value={item}
                maxLength={maxLength}
                onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
                onBlur={(e) => {
                  if (!e.target.value.trim()) onChange(items.filter((_, j) => j !== i));
                }}
              />
              <Button size="sm" variant="quiet" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>
                Remove
              </Button>
            </li>
          ))}
        </ol>
      ) : null}
      {items.length < maxItems ? (
        <div className="flex items-center gap-2">
          <span className="w-5 shrink-0" aria-hidden />
          <Input
            id={id}
            value={next}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setNext(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button size="sm" onClick={add} disabled={!next.trim()}>
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
