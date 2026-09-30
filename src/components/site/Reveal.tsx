"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Plays its children's entrance once, when the block is about 15% into the
 * viewport. Children opt in with data-r (rise), data-r="row" (short rise for
 * list rows) or data-r="visual" (product image), and set --i for their place
 * in the stagger. Illustrations use .fy-draw, bars .fy-bar; see
 * src/styles/site-motion.css.
 */
export default function Reveal({
  as: Tag = "div",
  children,
  className,
  style,
  id,
  self = false,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** Animate the wrapper itself instead of only its marked children. */
  self?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("fy-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("fy-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} style={style} id={id} data-r={self ? "" : undefined}>
      {children}
    </Tag>
  );
}
