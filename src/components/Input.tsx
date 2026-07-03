import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id ?? label;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm text-primary/70">
        {label}
      </label>
      <input
        id={inputId}
        className={`
          w-full rounded-2xl border border-primary/15 bg-white/60
          px-5 py-4 text-base text-primary/90
          placeholder:text-primary/30
          outline-none transition-colors
          focus:border-primary/40 focus:bg-white
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
