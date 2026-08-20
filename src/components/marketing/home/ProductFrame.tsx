import type { ReactNode } from "react";
import styles from "./homepage.module.css";

export default function ProductFrame({
  title,
  context,
  className = "",
  variant = "frame",
  children,
}: {
  title: string;
  context: string;
  className?: string;
  variant?: "frame" | "open" | "band";
  children: ReactNode;
}) {
  return (
    <figure
      className={`${styles.sceneFrame} ${styles[`scene${variant[0].toUpperCase()}${variant.slice(1)}`]} ${className}`}
      aria-label={title}
    >
      <figcaption className={styles.sceneBar}>
        <strong>{title}</strong>
        <span>{context}</span>
      </figcaption>
      {children}
    </figure>
  );
}
