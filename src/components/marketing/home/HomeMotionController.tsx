"use client";

import { useEffect } from "react";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function playEntrance(
  elements: Element[],
  options: { axis?: "x" | "y"; distance?: number; duration?: number; stagger?: number },
) {
  const {
    axis = "y",
    distance = 8,
    duration = 460,
    stagger = 80,
  } = options;

  elements.forEach((element, index) => {
    const transform =
      axis === "x" ? `translateX(${distance}px)` : `translateY(${distance}px)`;
    element.animate(
      [
        { opacity: 0.56, transform },
        { opacity: 1, transform: "translate(0, 0)" },
      ],
      {
        duration,
        delay: index * stagger,
        easing: EASE,
        fill: "both",
      },
    );
  });
}

export default function HomeMotionController() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const hero = document.querySelector('[data-motion-zone="shortlist"]');
    if (hero) {
      playEntrance(
        Array.from(hero.querySelectorAll('[data-motion-item="candidate"]')),
        { duration: 440, stagger: 65 },
      );
      const brief = hero.querySelector('[data-motion-item="brief"]');
      if (brief) {
        brief.animate(
          [
            { opacity: 0.66, transform: "translateX(12px)" },
            { opacity: 1, transform: "translateX(0)" },
          ],
          { duration: 560, delay: 240, easing: EASE, fill: "both" },
        );
      }
    }

    const zones = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-observe]"),
    );
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const zone = entry.target as HTMLElement;
          observer.unobserve(zone);

          if (zone.dataset.motionObserve === "adapt") {
            playEntrance(
              Array.from(zone.querySelectorAll('[data-motion-item="adapt-event"]')),
              { duration: 520, stagger: 520, distance: 9 },
            );
          }

          if (zone.dataset.motionObserve === "evidence") {
            playEntrance(
              Array.from(zone.querySelectorAll('[data-motion-item="evidence-node"]')),
              { duration: 420, stagger: 90, distance: 7 },
            );
            Array.from(
              zone.querySelectorAll<SVGGeometryElement>("[data-motion-line]"),
            ).forEach((line, index) => {
              const length = line.getTotalLength();
              line.animate(
                [
                  { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
                  { strokeDasharray: `${length}`, strokeDashoffset: "0" },
                ],
                {
                  duration: 520,
                  delay: 140 + index * 110,
                  easing: EASE,
                  fill: "both",
                },
              );
            });
          }

          if (zone.dataset.motionObserve === "principles") {
            Array.from(
              zone.querySelectorAll<SVGGeometryElement>(
                ".principle-figure :is(path, line, polygon)",
              ),
            ).forEach((shape, index) => {
              const length = shape.getTotalLength();
              shape.animate(
                [
                  { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
                  { strokeDasharray: `${length}`, strokeDashoffset: "0" },
                ],
                {
                  duration: 620,
                  delay: Math.min(index * 24, 360),
                  easing: EASE,
                  fill: "both",
                },
              );
            });
          }
        });
      },
      { threshold: 0.28 },
    );

    zones.forEach((zone) => observer.observe(zone));
    return () => observer.disconnect();
  }, []);

  return null;
}
