import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface AddMilestoneButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button label. */
  label?: string;
}

/**
 * Secondary action used to append a new, empty milestone to a timeline.
 *
 * Rendered below the existing entries so it reads as "add another one" rather
 * than competing with the primary Generate Route call-to-action.
 */
export function AddMilestoneButton({
  className,
  label = "Add Milestone",
  children,
  ...props
}: AddMilestoneButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:border-[#0F313A] hover:text-[#0F313A] dark:hover:border-white dark:hover:text-white disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <Plus className="h-4 w-4" />
      {children ?? label}
    </button>
  );
}
