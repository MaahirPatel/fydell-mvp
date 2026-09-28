import markUrl from "../assets/fydell-chain-mark.svg";

/* ============================================================================
   Fydell brand mark — the real chain-link mark from public/brand, rendered
   in the sign-in screen, sidebar, and inbox. The SVG carries its own
   colorful ring artwork (teal→blue, violet→pink→red) on transparency, so it
   sits natively on the light surfaces.
   ========================================================================== */

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={markUrl}
      alt="Fydell"
      width={size}
      height={Math.round(size * 0.625)}
      className="brand-mark"
      draggable={false}
    />
  );
}

export function BrandLockup({ size = 28 }: { size?: number }) {
  return (
    <span className="brand-lockup">
      <BrandMark size={size} />
      <span className="brand-word">Fydell</span>
    </span>
  );
}
