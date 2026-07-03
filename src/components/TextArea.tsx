import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, id, className = "", ...props }: TextAreaProps) {
  const textareaId = id ?? label;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={textareaId} className="text-sm text-primary/70">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          min-h-[200px] w-full resize-none rounded-2xl border border-primary/15
          bg-white/60 px-5 py-4 text-base leading-relaxed text-primary/90
          placeholder:text-primary/30
          outline-none transition-colors
          focus:border-primary/40 focus:bg-white
          sm:min-h-[280px]
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
