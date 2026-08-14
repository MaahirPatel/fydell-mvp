/**
 * Wave 1 visual contract. Values are mirrored in globals.css.
 * Do not invent a second palette in a page file.
 */

export const WAVE1_SURFACES = {
  canvas: "#08090A",
  deep: "#050607",
  surface1: "#0E1013",
  surface2: "#12151A",
  surface3: "#171B22",
  hover: "#1B2028",
  selected: "#202631",
} as const;

export const WAVE1_TEXT = {
  primary: "#F5F7F8",
  secondary: "#B6BBC4",
  tertiary: "#858B96",
  disabled: "#626874",
} as const;

export const WAVE1_BORDERS = {
  hairline: "rgba(255,255,255,0.075)",
  strong: "rgba(255,255,255,0.13)",
} as const;

export const WAVE1_TYPE = {
  display: "clamp(3.75rem, 6vw, 5.5rem)",
  page: "clamp(3.25rem, 5vw, 4.75rem)",
  section: "clamp(2.5rem, 4vw, 3.75rem)",
  lead: "1.25rem",
  body: "1.0625rem",
  trackingDisplay: "-0.04em",
} as const;

export const WAVE1_LAYOUT = {
  pageMaxWidth: 1360,
  heroCopyMax: 720,
  copyToScene: 56,
  sectionY: 144,
} as const;

export const WAVE1_RADIUS = {
  control: "6px",
  panel: "10px",
  frame: "14px",
} as const;

export const WAVE1_ELEVATION = {
  panel: "0 1px 2px rgba(0, 0, 0, 0.4)",
  pop: "0 8px 28px rgba(0, 0, 0, 0.5)",
} as const;

export const WAVE1_ICON = {
  family: "lucide",
  stroke: 1.5,
} as const;

export const WAVE1_CONTROL_STATES = [
  "default",
  "hover",
  "pressed",
  "selected",
  "focus-visible",
  "disabled",
  "loading",
  "error",
] as const;

export const WAVE1_CONTRAST = {
  standard: "WCAG 2.2 AA",
  primaryOnCanvas: 16.4,
  secondaryOnCanvas: 7.2,
  focusRingOnCanvas: 7.9,
} as const;
