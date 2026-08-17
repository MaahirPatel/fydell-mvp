import type { TelemetryEvent, TelemetryEventType } from "../types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Framework-agnostic telemetry buffer.
 * High-frequency events stay in an array; consumers snapshot when needed.
 */
export class TelemetryRuntime {
  private events: TelemetryEvent[] = [];
  private startedAt: number | null = null;
  private lastBlurAt = 0;

  start(now = Date.now()): void {
    this.startedAt = now;
  }

  getElapsedMs(now = Date.now()): number {
    if (this.startedAt == null) return 0;
    return Math.max(0, now - this.startedAt);
  }

  record<E extends TelemetryEvent>(
    partial: Omit<E, "id" | "timestamp" | "elapsedMs"> & { type: TelemetryEventType },
    now = Date.now()
  ): TelemetryEvent {
    // Dedupe blur storms within 400ms
    if (partial.type === "WINDOW_BLUR" || partial.type === "TAB_BLUR") {
      if (now - this.lastBlurAt < 400) {
        return this.events[this.events.length - 1]!;
      }
      this.lastBlurAt = now;
    }

    const event = {
      ...partial,
      id: newId("tel"),
      timestamp: now,
      elapsedMs: this.getElapsedMs(now),
    } as TelemetryEvent;

    this.events.push(event);
    return event;
  }

  /** Replace buffer (e.g. after restore). */
  load(events: TelemetryEvent[], startedAt: number | null): void {
    this.events = [...events];
    this.startedAt = startedAt;
  }

  getSnapshot(): TelemetryEvent[] {
    return [...this.events];
  }

  count(): number {
    return this.events.length;
  }

  flush(): TelemetryEvent[] {
    return this.getSnapshot();
  }
}
