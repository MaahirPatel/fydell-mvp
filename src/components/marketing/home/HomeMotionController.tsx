"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FOCAL_LAYER = "[data-focal-layer]";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HomeMotionController() {
  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const mm = gsap.matchMedia();

    gsap
      .timeline({ defaults: { ease: "power4.out" } })
      .from("[data-hero-copy] > *", {
        y: 18,
        opacity: 0,
        duration: 0.75,
        stagger: 0.1,
      })
      .from(
        "[data-hero-stage]",
        { y: 32, scale: 0.965, opacity: 0.35, duration: 1.05 },
        "-=0.38",
      )
      .from(
        '[data-motion-zone="shortlist"] [data-motion-item="candidate"]',
        { y: 9, opacity: 0.25, duration: 0.46, stagger: 0.055 },
        "-=0.62",
      )
      .from(
        '[data-motion-zone="shortlist"] [data-motion-item="inspector"]',
        { x: 28, y: 10, opacity: 0, duration: 0.62 },
        "-=0.3",
      );

    document.querySelectorAll<HTMLElement>("[data-product-chapter]").forEach((chapter) => {
      const heading = chapter.querySelector("[data-chapter-heading]");
      const copy = chapter.querySelector("[data-chapter-copy]");
      const stage = chapter.querySelector("[data-product-stage]");
      if (!stage) return;

      gsap.from([heading, copy], {
        y: 24,
        opacity: 0.18,
        stagger: 0.08,
        scrollTrigger: {
          trigger: chapter,
          start: "top 82%",
          end: "top 52%",
          scrub: 0.7,
        },
      });

      gsap.fromTo(
        stage,
        { y: 72, scale: 0.935, opacity: 0.38 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "top 94%",
            end: "top 55%",
            scrub: 0.85,
          },
        },
      );

      const focal = stage.querySelector(FOCAL_LAYER);
      if (focal) {
        gsap.fromTo(
          focal,
          { x: 34, y: 12, opacity: 0.28 },
          {
            x: 0,
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top 70%",
              end: "top 36%",
              scrub: 0.65,
            },
          },
        );
      }
    });

    document
      .querySelectorAll<SVGGeometryElement>("[data-motion-line]")
      .forEach((line) => {
        const length = line.getTotalLength();
        gsap.fromTo(
          line,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: line.closest("[data-product-stage]"),
              start: "top 66%",
              end: "top 34%",
              scrub: 0.7,
            },
          },
        );
      });

    mm.add("(min-width: 961px)", () => {
      const chapters = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-chapter]"),
      );
      [2, 4].forEach((index) => {
        const chapter = chapters[index];
        const heading = chapter?.querySelector<HTMLElement>("[data-chapter-head]");
        const stage = chapter?.querySelector<HTMLElement>("[data-product-stage]");
        if (!chapter || !heading || !stage) return;
        ScrollTrigger.create({
          trigger: heading,
          start: "top 88px",
          endTrigger: stage,
          end: "top 180px",
          pin: heading,
          pinSpacing: false,
        });
      });
    });

    return () => mm.revert();
  });

  return null;
}
