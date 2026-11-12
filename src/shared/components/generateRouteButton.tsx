import * as React from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface GenerateRouteButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button label shown in the idle state. */
  label?: string;
  /** Label shown while the route is being computed. */
  loadingLabel?: string;
  /** Puts the button in its computing state (spinner + loading label). */
  loading?: boolean;
}

/**
 * Primary call-to-action used to compute a multimodal freight route.
 *
 * Renders a white socket › red press-target › arrow stack so the button
 * reads as a physical control: pressing anywhere on it depresses the red
 * disc by 2px and flattens its shadow, then springs back on release.
 */
export function GenerateRouteButton({
  className,
  label = "Generate Route",
  loadingLabel = "Computing Route...",
  loading = false,
  disabled,
  ...props
}: GenerateRouteButtonProps) {
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
          {loadingLabel}
        </>
      ) : (
        <>
          <span>{label}</span>
          {/* White socket › red press-target › arrow */}
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#BA1C20] text-white shadow-[0_3px_8px_-1px_rgba(186,28,32,0.55)] transition-[translate,box-shadow] duration-150 ease-out active:translate-y-[2px] active:shadow-[0_1px_2px_rgba(186,28,32,0.5)]">
              <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </span>
        </>
      )}
    </button>
  );
}
