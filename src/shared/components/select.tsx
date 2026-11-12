import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options?: SelectOption[];
  icon?: React.ReactNode;
  chevronClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, error, label, options, icon, chevronClassName, id, children, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || (label ? generatedId : undefined);

    return (
      <div className="relative w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-colors focus:outline-none focus:border-[#0F313A] focus:ring-2 focus:ring-[#0F313A]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-400 dark:focus:ring-slate-400/20 cursor-pointer",
              icon && "pl-10",
              error && "border-[#BA1C20] focus:border-[#BA1C20] focus:ring-[#BA1C20]/20",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400",
              chevronClassName
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-[#BA1C20] font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
