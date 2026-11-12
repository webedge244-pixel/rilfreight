import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || (label ? generatedId : undefined);

    return (
      <div className="relative w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "flex w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] focus:ring-2 focus:ring-[#0F313A]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400/20 resize-y",
            error && "border-[#BA1C20] focus:border-[#BA1C20] focus:ring-[#BA1C20]/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-[#BA1C20] font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
