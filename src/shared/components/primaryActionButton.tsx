import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface PrimaryActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text shown inside the button the same text is kept while loading. */
  label: string;
  /** Icon rendered inside the circular badge on the trailing edge. */
  icon: React.ReactNode;
  /** Puts the button in its running state (the badge becomes a spinner). */
  loading?: boolean;
}

/**
 * Primary call-to-action button.
 *
 * The label sits on the leading edge and the caller-supplied icon is mounted
 * inside a white socket › red press-target stack on the trailing edge, so the
 * button reads as a physical control: pressing anywhere on it depresses the
 * red disc by 2px and flattens its shadow, then springs back on release.
 *
 * The caller owns the text, the icon, the button type and the action — this
 * component only owns the visual treatment.
 */
export function PrimaryActionButton({
  className,
  label,
  icon,
  loading = false,
  disabled,
  type = "button",
  ...props
}: PrimaryActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center gap-3 pl-5 pr-3 py-1.5 rounded-xl bg-[#0F313A] text-white text-sm font-extrabold uppercase tracking-wider transition-all hover:opacity-90 active:opacity-100 disabled:opacity-50 shadow-sm",
        className,
      )}
      {...props}
    >
      <span>{label}</span>

      {/* White socket › red press-target › caller icon */}
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#BA1C20] text-white shadow-[0_3px_8px_-1px_rgba(186,28,32,0.55)] transition-[translate,box-shadow] duration-150 ease-out active:translate-y-[2px] active:shadow-[0_1px_2px_rgba(186,28,32,0.5)] [&>svg]:h-4 [&>svg]:w-4">
          {loading ? <Loader2 className="animate-spin" /> : icon}
        </span>
      </span>
    </button>
  );
}
