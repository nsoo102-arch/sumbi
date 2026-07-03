import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

const variantStyles = {
  primary:
    "bg-primary text-white hover:bg-primary-dark active:bg-primary-dark",
  secondary:
    "bg-transparent text-primary border border-primary hover:bg-primary/5 active:bg-primary/10",
  ghost:
    "bg-transparent text-primary/80 hover:text-primary hover:bg-primary/5",
};

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        rounded-full px-8 py-3.5 text-base font-medium
        transition-colors duration-200
        disabled:cursor-not-allowed disabled:opacity-40
        ${variantStyles[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
