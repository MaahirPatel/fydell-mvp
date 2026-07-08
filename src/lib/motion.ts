export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: EASE_OUT }
};

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } }
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, ease: EASE_OUT }
};

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -3, scale: 1.01, transition: { duration: 0.35, ease: EASE_OUT } }
};

export const glowPulse = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    scale: [1, 1.04, 1]
  },
  transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
};

export const smoothReveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.75, ease: EASE_OUT }
};
