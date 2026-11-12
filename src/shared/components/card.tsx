import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
}

export function Card({ className, variant = "default", ...props }: CardProps) {
  const variantStyles = {
    default: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm",
    elevated: "bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800",
    bordered: "bg-transparent border-2 border-slate-200 dark:border-slate-800",
  };

  return (
    <div
      className={cn("rounded-xl p-6 transition-all", variantStyles[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-slate-500 dark:text-slate-400 mt-1", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("pt-0", className)} {...props} />;
}
