import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { ShipmentStatus } from "@/shared/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ShipmentStatus;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}

export function Badge({ className, status, variant, children, ...props }: BadgeProps) {
  // Map specific shipment statuses to appropriate badge styles
  let computedVariant: "default" | "success" | "warning" | "danger" | "info" | "neutral" =
    variant || "default";

  if (status) {
    switch (status) {
      case "delivered":
        computedVariant = "success";
        break;
      case "in_transit":
      case "docked":
      case "out_for_delivery":
        computedVariant = "info";
        break;
      case "customs_hold":
      case "weather_delay":
        computedVariant = "warning";
        break;
      case "cancelled":
        computedVariant = "danger";
        break;
      default:
        computedVariant = "neutral";
    }
  }

  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase",
        variantStyles[computedVariant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
