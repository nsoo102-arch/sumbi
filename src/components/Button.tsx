import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  block?: boolean;
};

export function Button({
  className = "",
  children,
  type = "button",
  variant = "primary",
  block = false,
  ...props
}: ButtonProps) {
  const base =
    variant === "outline"
      ? "sumbi-btn-outline"
      : block
        ? "sumbi-btn-block"
        : "sumbi-btn";

  return (
    <button type={type} className={`${base} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
