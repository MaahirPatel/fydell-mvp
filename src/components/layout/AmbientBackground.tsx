/**
 * Graphite canvas with a cool-gray bloom. No purple fog.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--surface-canvas,#08090a)]" />
      <div className="fydell-canvas-light" />
    </div>
  );
}
