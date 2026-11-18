"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type ToastVariant = "success" | "warning" | "destructive" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastContextType {
  toast: (options: ToastOptions | string) => void;
  success: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
  destructive: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions =
      typeof options === "string" ? { description: options, variant: "success" } : options;
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue: ToastContextType = React.useMemo(
    () => ({
      toast: addToast,
      success: (description, title) => addToast({ description, title, variant: "success" }),
      warning: (description, title) => addToast({ description, title, variant: "warning" }),
      destructive: (description, title) => addToast({ description, title, variant: "destructive" }),
      info: (description, title) => addToast({ description, title, variant: "info" }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <RadixToast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => {
          const variant = t.variant || "success";

          const bgClass =
            variant === "success"
              ? "bg-[#0D5C46] text-white"
              : variant === "warning"
                ? "bg-amber-600 text-white"
                : variant === "destructive"
                  ? "bg-[#BA1C20] text-white"
                  : "bg-[#0F313A] text-white";

          const IconComponent =
            variant === "success"
              ? CheckCircle2
              : variant === "warning"
                ? AlertTriangle
                : variant === "destructive"
                  ? AlertCircle
                  : Info;

          return (
            <RadixToast.Root
              key={t.id}
              duration={t.duration || 4000}
              onOpenChange={(open) => {
                if (!open) removeToast(t.id);
              }}
              className={cn(
                "relative flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border-0 shadow-none select-none",
                "transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
                "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
                bgClass
              )}
            >
              <div className="flex items-center gap-3">
                <IconComponent className="w-5 h-5 shrink-0" />
                <div className="space-y-0.5">
                  {t.title && (
                    <RadixToast.Title className="text-sm font-bold leading-tight">
                      {t.title}
                    </RadixToast.Title>
                  )}
                  {t.description && (
                    <RadixToast.Description className="text-xs font-semibold leading-relaxed">
                      {t.description}
                    </RadixToast.Description>
                  )}
                </div>
              </div>

              <RadixToast.Close
                aria-label="Close"
                className="ml-3 p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport className="fixed top-6 right-6 z-[99999] flex flex-col gap-2.5 max-w-md w-full p-0 pointer-events-none [&>*]:pointer-events-auto" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
