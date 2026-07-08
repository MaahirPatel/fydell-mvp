import FydellMark from "@/components/brand/FydellMark";

interface LogoProps {
  size?: number;
  variant?: "light" | "dark";
  markOnly?: boolean;
  className?: string;
}

export default function Logo({
  size = 22,
  variant = "dark",
  markOnly = false,
  className = ""
}: LogoProps) {
  const markWidth = Math.round(size * 1.72);

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Fydell">
      <FydellMark width={markWidth} />
      {!markOnly && (
        <span
          className="font-bold leading-none"
          style={{
            color: variant === "dark" ? "#fff" : "#0f172a",
            fontSize: size,
            fontWeight: 750,
            letterSpacing: "-0.045em"
          }}
        >
          fydell
        </span>
      )}
    </span>
  );
}
