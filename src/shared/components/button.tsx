import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none rounded-lg";

  const variantStyles = {
    primary:
      "bg-[#0F313A] text-white hover:bg-[#0b252c] focus-visible:ring-[#0F313A] shadow-sm",
    secondary:
      "bg-[#BA1C20] text-white hover:bg-[#9c171a] focus-visible:ring-[#BA1C20] shadow-sm",
    accent:
      "bg-[#BA1C20] text-white hover:bg-[#9c171a] font-semibold active:scale-[0.98] transition-all focus-visible:ring-[#BA1C20] shadow-sm",
    outline:
      "border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-sm",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
