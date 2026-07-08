export const colors = {
  bg: "#03050d",
  bg2: "#060914",
  bg3: "#0a0f1f",
  surface: "#070B1A",
  elevated: "#0B1020",
  panel: "rgba(12, 16, 30, 0.78)",
  accent: {
    violet: "#7C5CFF",
    violet2: "#9B5CFF",
    blue: "#5B8CFF",
    cyan: "#67E8F9",
    green: "#3DD68C"
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#CBD5E1",
    muted: "#94A3B8"
  },
  border: "rgba(255,255,255,0.06)"
} as const;

export const spacing = {
  section: "4rem",
  sectionLg: "5rem",
  container: "1520px"
} as const;

export const shadows = {
  glow: "0 0 80px rgba(124, 92, 255, 0.35)",
  card: "0 32px 80px rgba(0,0,0,0.5)",
  subtle: "0 8px 32px rgba(124, 92, 255, 0.08)"
} as const;
