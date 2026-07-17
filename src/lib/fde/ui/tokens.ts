/**
 * Minimal design tokens for the Project Relay workspace UI.
 * Intentionally plain — no motion/animation tokens yet. Later checkpoints can
 * extend this file; keep it the single source of truth for raw values so
 * components stop hand-rolling hex codes.
 */

export const relayColors = {
  bg: "#07080B",
  surface: "#0A0C11",
  surfaceRaised: "#11151D",
  border: "rgba(255,255,255,0.10)",
  borderSubtle: "rgba(255,255,255,0.06)",
  text: "#F4F5F7",
  textMuted: "rgba(244,245,247,0.62)",
  textFaint: "rgba(244,245,247,0.4)",
  accent: "#5662FF",
  accentAlt: "#8657F4",
  success: "#8EE4B8",
  successBorder: "rgba(103,217,160,0.22)",
  danger: "#F26B82",
  dangerBorder: "rgba(242,107,130,0.28)",
  warning: "#F2C36B",
} as const;

export const relayRadii = {
  sm: 7,
  md: 9,
  lg: 15,
  xl: 18,
  full: 9999,
} as const;

export const relaySpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type RelayColorToken = keyof typeof relayColors;
export type RelayRadiusToken = keyof typeof relayRadii;
export type RelaySpacingToken = keyof typeof relaySpacing;
