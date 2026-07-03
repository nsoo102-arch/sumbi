import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-sumbi bg-sumbi-primary px-6 py-3 text-sm font-medium text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
