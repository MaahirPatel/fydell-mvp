"use client";

/**
 * Official Fydell interlocking-chain mark (transparent PNG).
 * Aspect ratio matches the cropped brand asset (~1300×901).
 */
export default function FydellMark({
  width = 38,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * (901 / 1300));

  return (
    <img
      src="/brand/fydell-mark.png"
      alt=""
      width={width}
      height={height}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
      style={{ width, height, objectFit: "contain" }}
      aria-hidden="true"
      draggable={false}
      // #region agent log
      onLoad={(e) => {
        const img = e.currentTarget;
        fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
          body: JSON.stringify({
            sessionId: "dc0a6c",
            runId: "post-fix",
            hypothesisId: "F",
            location: "FydellMark.tsx:onLoad",
            message: "Transparent mark loaded with correct aspect",
            data: {
              src: img.currentSrc || img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              displayW: img.clientWidth,
              displayH: img.clientHeight,
              aspect: img.naturalWidth && img.naturalHeight ? Number((img.naturalWidth / img.naturalHeight).toFixed(3)) : null,
              displayAspect: img.clientHeight ? Number((img.clientWidth / img.clientHeight).toFixed(3)) : null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }}
      // #endregion
    />
  );
}
