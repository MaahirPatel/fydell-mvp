"use client";

import { Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover } from "./Popover";
import { FONT_MAX, FONT_MIN, setSimPrefs, useSimPrefs, type SimTheme } from "./prefs";

const segment = "h-8 flex-1 rounded-[6px] text-[13px] font-medium";

/** Theme and editor text size. Both persist in this browser. */
export function SettingsMenu({ showFontSize }: { showFontSize: boolean }) {
  const prefs = useSimPrefs();
  const themes: { value: SimTheme; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];
  return (
    <Popover label="Display settings" button={<Settings2 aria-hidden size={16} />}>
      {() => (
        <div className="grid gap-3 p-2">
          <div className="grid gap-1.5">
            <p id="sim-theme-label" className="text-app-meta text-[var(--text-secondary)]">
              Theme
            </p>
            <div role="radiogroup" aria-labelledby="sim-theme-label" className="flex gap-1 rounded-[8px] bg-[var(--surface-panel)] p-1">
              {themes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.theme === t.value}
                  onClick={() => setSimPrefs({ theme: t.value })}
                  className={cn(
                    segment,
                    prefs.theme === t.value ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {showFontSize ? (
            <div className="grid gap-1.5">
              <p id="sim-font-label" className="text-app-meta text-[var(--text-secondary)]">
                Editor text size
              </p>
              <div className="flex items-center gap-1 rounded-[8px] bg-[var(--surface-panel)] p-1" role="group" aria-labelledby="sim-font-label">
                <button
                  type="button"
                  aria-label="Smaller editor text"
                  disabled={prefs.fontSize <= FONT_MIN}
                  onClick={() => setSimPrefs({ fontSize: prefs.fontSize - 1 })}
                  className={cn(segment, "text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40")}
                >
                  A-
                </button>
                <span className="w-14 text-center font-mono text-[13px] tabular-nums text-[var(--text-primary)]" aria-live="polite">
                  {prefs.fontSize}px
                </span>
                <button
                  type="button"
                  aria-label="Larger editor text"
                  disabled={prefs.fontSize >= FONT_MAX}
                  onClick={() => setSimPrefs({ fontSize: prefs.fontSize + 1 })}
                  className={cn(segment, "text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40")}
                >
                  A+
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Popover>
  );
}
