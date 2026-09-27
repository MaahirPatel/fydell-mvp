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
