import type { ReactNode } from "react";

interface PageTitleProps {
  children: ReactNode;
  className?: string;
}

export function PageTitle({ children, className = "" }: PageTitleProps) {
  return (
    <h1
      className={`text-2xl font-light leading-relaxed tracking-tight text-primary sm:text-3xl ${className}`}
    >
      {children}
    </h1>
  );
}

interface PageTextProps {
  children: ReactNode;
  className?: string;
}

export function PageText({ children, className = "" }: PageTextProps) {
  return (
    <p
      className={`text-base leading-loose text-primary/70 sm:text-lg sm:leading-loose ${className}`}
    >
      {children}
    </p>
  );
}

interface PoemTextProps {
  lines: string[];
  className?: string;
}

export function PoemText({ lines, className = "" }: PoemTextProps) {
  return (
    <div className={`space-y-1 sm:space-y-2 ${className}`}>
      {lines.map((line) => (
        <p
          key={line}
          className="text-lg leading-relaxed text-primary/80 sm:text-xl sm:leading-relaxed"
        >
          {line}
        </p>
      ))}
    </div>
  );
}
