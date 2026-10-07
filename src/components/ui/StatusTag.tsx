import { Status, type StatusKind } from "./report";

/** Legacy tone names, rendered through `Status`. New code should use `Status` directly. */
export type StatusTone = "neutral" | "active" | "changed" | "risk" | "good";

const KIND: Record<StatusTone, StatusKind> = {
  neutral: "neutral",
  active: "pending",
  changed: "attention",
  risk: "failed",
  good: "success",
};

export function StatusTag({ tone = "neutral", children, className }: { tone?: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <Status kind={KIND[tone]} className={className}>
      {children}
    </Status>
  );
}

export default StatusTag;
