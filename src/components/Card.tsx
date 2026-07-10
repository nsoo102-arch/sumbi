import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  compact?: boolean;
};

export function Card({
  className = "",
  children,
  compact = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`${compact ? "sumbi-card-compact" : "sumbi-card"} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
