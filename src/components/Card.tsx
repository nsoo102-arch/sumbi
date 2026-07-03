import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-sumbi border border-sumbi-border bg-white p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
