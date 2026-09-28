import markUrl from "../assets/fydell-chain-mark.svg";

/* ============================================================================
   Fydell brand mark — the real chain-link mark from public/brand, rendered
   in the sign-in screen, sidebar, and inbox. The dark lockup variant is the
   SVG (crisp at any size); it carries its own artwork.
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
