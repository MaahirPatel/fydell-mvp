"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Renders in the viewer's timezone, with its label, once on the client. */
export function LocalTime({ iso, withWeekday }: { iso: string; withWeekday?: boolean }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const date = new Date(iso);
  const text = hydrated
    ? date.toLocaleString(undefined, {
        weekday: withWeekday ? "short" : undefined,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
  return <time dateTime={iso}>{text}</time>;
}

/** The calendar date in the viewer's timezone once on the client; UTC before hydration. */
export function LocalDate({ iso }: { iso: string | null | undefined }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return <time dateTime={iso}>{hydrated ? date.toLocaleDateString(undefined, opts) : date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" })}</time>;
}
