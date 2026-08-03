"use client";

/**
 * Linear-like atmosphere: deep black canvas, soft radial light leaks, no neon fog.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#050507]" />
      <div
        className="absolute left-1/2 top-[-20%] h-[70vh] w-[110vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 40%, rgba(91,140,255,0.14), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-1/2 h-[50vh] w-[80vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 60%, rgba(242,107,130,0.08), transparent 72%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
