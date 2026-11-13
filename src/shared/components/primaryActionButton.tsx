import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface PrimaryActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text shown inside the button */
  label: string;
  /** Optional text shown while loading; defaults to `label` if not provided */
  loadingText?: string;
  /** Icon rendered inside the circular badge on the trailing edge */
  icon?: React.ReactNode;
  /** Optional custom spinner/icon for the loading state */
  loadingIcon?: React.ReactNode;
  /** Puts the button in its running/loading state */
  loading?: boolean;
  /** If provided, renders as Next.js Link instead of button */
  href?: string;
}

/**
 * Primary call-to-action button.
 *
 * All text (default and loading), icons, and interactions are strictly
 * controlled by caller props rather than hardcoded.
 */
export function PrimaryActionButton({
  className,
  label,
  loadingText,
  icon,
  loadingIcon,
  loading = false,
  disabled,
  type = "button",
  href,
  ...props
}: PrimaryActionButtonProps) {
  const content = (
    <>
      <span>{loading && loadingText ? loadingText : label}</span>

      {/* White socket › red press-target › caller icon */}
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#BA1C20] text-white shadow-[0_3px_8px_-1px_rgba(186,28,32,0.55)] transition-[translate,box-shadow] duration-150 ease-out active:translate-y-[2px] active:shadow-[0_1px_2px_rgba(186,28,32,0.5)] [&>svg]:h-4 [&>svg]:w-4">
          {loading ? (loadingIcon || <Loader2 className="animate-spin" />) : icon}
        </span>
      </span>
    </>
  );

  const sharedClasses = cn(
    "inline-flex select-none items-center justify-center gap-3 pl-5 pr-3 py-1.5 rounded-xl bg-[#0F313A] text-white text-sm font-extrabold uppercase tracking-wider transition-all hover:opacity-90 active:opacity-100 disabled:opacity-50 shadow-sm",
    className
  );

  if (href) {
    return (
      <Link href={href} className={sharedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={sharedClasses}
      {...props}
    >
      {content}
    </button>
  );
}
