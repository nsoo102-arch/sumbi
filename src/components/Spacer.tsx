import type { ReactNode } from "react";

interface SpacerProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-6",
  md: "h-10",
  lg: "h-16",
  xl: "h-24",
};

export function Spacer({ size = "md" }: SpacerProps) {
  return <div className={sizeMap[size]} aria-hidden="true" />;
}

interface StackProps {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const gapMap = {
  sm: "gap-4",
  md: "gap-8",
  lg: "gap-12",
};

export function Stack({ children, gap = "md", className = "" }: StackProps) {
  return (
    <div className={`flex flex-col ${gapMap[gap]} ${className}`}>{children}</div>
  );
}
