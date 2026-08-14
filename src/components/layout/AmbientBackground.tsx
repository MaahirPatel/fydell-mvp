/**
 * Quiet graphite canvas. No multi-blob brand fog.
 * Depth comes from surface layering in content, not atmospheric washes.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--surface-canvas,#08090a)]" />
      {/* Subtle, Linear-inspired high-quality radial gradient that fits Fydell's logo */}
      <div 
        className="absolute inset-0 opacity-[0.15]" 
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(86, 98, 255, 0.4) 0%, transparent 50%, transparent 100%)'
        }} 
      />
    </div>
  );
}
