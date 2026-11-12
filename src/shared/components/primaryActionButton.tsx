import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface PrimaryActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text shown inside the button. */
  label: string;
  /** Icon rendered inside the circular badge on the trailing edge. */
  icon: React.ReactNode;
  /** Text shown while the action is running. Defaults to `label`. */
  loadingLabel?: string;
  /** Puts the button in its running state (spinner replaces the badge). */
  loading?: boolean;
}

/**
 * Primary call-to-action button.
 *
 * The label sits on the leading edge and the caller-supplied icon is mounted
 * inside a white socket › red press-target stack on the trailing edge, so the
 * button reads as a physical control: pressing anywhere on it depresses the
 * red disc by 2px and flattens its shadow, then springs back on release.
 */
export function PrimaryActionButton({
  className,
  label,
  icon,
  loadingLabel,
  loading = false,
  disabled,
  ...props
}: PrimaryActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-3 pl-5 pr-3 py-1.5 rounded-xl bg-[#0F313A] text-white text-sm font-extrabold uppercase tracking-wider transition-all hover:opacity-90 active:opacity-100 disabled:opacity-50 shadow-sm",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel ?? label}
        </>
      ) : (
        <>
          <span>{label}</span>
          {/* White socket › red press-target › caller icon */}
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#BA1C20] text-white shadow-[0_3px_8px_-1px_rgba(186,28,32,0.55)] transition-[translate,box-shadow] duration-150 ease-out active:translate-y-[2px] active:shadow-[0_1px_2px_rgba(186,28,32,0.5)] [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          </span>
        </>
      )}
    </button>
  );
}
