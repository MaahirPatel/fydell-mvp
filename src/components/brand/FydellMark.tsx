"use client";

/**
 * Official Fydell interlocking-ring mark.
 * Uses the SVG asset (not a cropped PNG) so rings render fully at any size.
 */
export default function FydellMark({
  width = 38,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * (30 / 48));

  return (
    <img
      src="/brand/fydell-chain-mark.svg"
      alt=""
      width={width}
      height={height}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
      style={{ width, height }}
      aria-hidden="true"
      // #region agent log
      onLoad={(e) => {
        const img = e.currentTarget;
        fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
          body: JSON.stringify({
            sessionId: "dc0a6c",
            runId: "post-fix",
            hypothesisId: "A",
            location: "FydellMark.tsx:onLoad",
            message: "Logo mark image loaded",
            data: {
              src: img.currentSrc || img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              displayedW: img.clientWidth,
              displayedH: img.clientHeight,
              complete: img.complete,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }}
      onError={(e) => {
        const img = e.currentTarget;
        fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
          body: JSON.stringify({
            sessionId: "dc0a6c",
            runId: "post-fix",
            hypothesisId: "A",
            location: "FydellMark.tsx:onError",
            message: "Logo mark image FAILED",
            data: { src: img.currentSrc || img.src },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }}
      // #endregion
    />
  );
}
