/**
 * Quiet graphite canvas. No multi-blob brand fog.
 * Depth comes from surface layering in content, not atmospheric washes.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--surface-canvas,#050507)]" />
    </div>
  );
}
