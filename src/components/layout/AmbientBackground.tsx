"use client";

/**
 * Static ambient depth — no continuous Framer animations.
 * Animated blur blobs were repainting during scroll and fighting Lenis smoothness.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#050609]" />

      {/* Soft gradients only — no live blur filters / SVG turbulence (those jank Lenis). */}
      <div
        className="absolute left-[-10%] top-[4%] h-[480px] w-[600px] rounded-full opacity-80"
        style={{ background: "radial-gradient(circle, rgba(59,91,255,0.07), transparent 68%)" }}
      />

      <div
        className="absolute right-[-8%] top-[-2%] h-[560px] w-[620px] rounded-full opacity-70"
        style={{ background: "radial-gradient(circle, rgba(100,70,200,0.045), transparent 70%)" }}
      />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 32%, rgba(0,0,0,0.28) 86%), linear-gradient(180deg, rgba(5,6,9,0.04), rgba(5,6,9,0.55))",
        }}
      />
    </div>
  );
}
