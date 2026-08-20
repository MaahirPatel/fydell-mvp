/**
 * The warm ground the public site sits on.
 *
 * Two things make this read as atmosphere rather than as decoration. It spans
 * the whole document rather than the viewport, so the colour moves as you read
 * instead of following you down the page; and every wash is an ellipse far
 * wider than the screen with its centre pushed off-canvas, so what reaches the
 * page is the soft shoulder of a gradient rather than a legible circle. A
 * blurred saturated blob sitting in open space is the thing we are avoiding.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--surface-canvas)]" />

      {/* Sage, behind the hero. Anchored above the fold and off to the left so
          the visible part is one long diagonal falloff. */}
      <div
        className="absolute inset-x-0 top-0 h-[1400px]"
        style={{
          background:
            "radial-gradient(120% 70% at 22% 0%, rgba(150, 178, 152, 0.42) 0%, rgba(163, 187, 164, 0.2) 34%, rgba(251, 249, 245, 0) 68%)",
        }}
      />

      {/* Apricot, entering as the product chapters begin. */}
      <div
        className="absolute inset-x-0 top-[900px] h-[1600px]"
        style={{
          background:
            "radial-gradient(110% 60% at 82% 30%, rgba(238, 194, 152, 0.4) 0%, rgba(240, 206, 172, 0.17) 36%, rgba(251, 249, 245, 0) 70%)",
        }}
      />

      {/* A second sage pass lower down keeps the long middle of the page from
          flattening out into plain paper. */}
      <div
        className="absolute inset-x-0 top-[2300px] h-[1800px]"
        style={{
          background:
            "radial-gradient(100% 55% at 12% 40%, rgba(156, 182, 160, 0.3) 0%, rgba(251, 249, 245, 0) 62%)",
        }}
      />

      {/* Warm close, under the final call to action and footer. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[1200px]"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 100%, rgba(236, 199, 163, 0.38) 0%, rgba(243, 216, 188, 0.14) 40%, rgba(251, 249, 245, 0) 72%)",
        }}
      />
    </div>
  );
}
