import markUrl from "../assets/fydell-chain-mark.svg";
import lockupUrl from "../assets/fydell-lockup.png";

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

/* The same lockup image the website uses (public/brand/fydell-lockup.png),
   so the wordmark is identical across web and desktop. */
const LOCKUP_RATIO = 952 / 248;

export function BrandLockup({ size = 28 }: { size?: number }) {
  const height = Math.round(size * 0.85);
  return (
    <img
      src={lockupUrl}
      alt="Fydell"
      width={Math.round(height * LOCKUP_RATIO)}
      height={height}
      className="brand-lockup-img"
      draggable={false}
    />
  );
}
