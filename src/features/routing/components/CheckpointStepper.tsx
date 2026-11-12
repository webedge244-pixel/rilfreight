"use client";

import * as React from "react";
import type { TrackingMilestone } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

export interface CheckpointStepperProps {
  milestones: TrackingMilestone[];
  onToggleHoldGate: (index: number) => void;
  className?: string;
}

export default function CheckpointStepper({
  milestones,
  onToggleHoldGate,
  className = "",
}: CheckpointStepperProps) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl text-slate-400 text-sm">
        No milestones generated yet. Click &quot;Generate Route&quot; to compute chronological checkpoints.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Route Checkpoints &amp; Milestone Timeline ({milestones.length})
        </h3>
        <span className="text-[11px] text-slate-400">
          Pause Gate controls simulation dwell
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {milestones.map((m, idx) => {
          const isCustoms = m.code === "CUSR" || m.title.toLowerCase().includes("customs");
          const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) : "";

          return (
            <div key={m.id || `ms-${idx}`} className="relative group">
              {/* Node indicator */}
              <div
                className={cn(
                  "absolute -left-[30px] top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
                  m.isHoldGate
                    ? "bg-amber-500 border-amber-300 text-white shadow-sm shadow-amber-500/50"
                    : "bg-white dark:bg-slate-900 border-[#0F313A] dark:border-slate-400 text-[#0F313A] dark:text-slate-300"
                )}
              >
                {idx + 1}
              </div>

              {/* Milestone Card */}
              <div
                className={cn(
                  "p-4 rounded-2xl transition-all",
                  m.isHoldGate
                    ? "bg-amber-500/5"
                    : "bg-white dark:bg-slate-900/60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {m.code}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {m.title}
                      </h4>
                      {m.dwellHours && m.dwellHours > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          ⏳ {m.dwellHours}h dwell
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {m.locationName}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {m.description}
                    </p>
                  </div>

                  {/* Planned Timestamp */}
                  <div className="text-right whitespace-nowrap">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {dateStr}
                    </span>
                  </div>
                </div>

                {/* Pause Gate Toggle Section */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(m.isHoldGate)}
                      onClick={() => onToggleHoldGate(idx)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0F313A] focus:ring-offset-2",
                        m.isHoldGate
                          ? "bg-amber-500"
                          : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          m.isHoldGate ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Hold Gate (Customs Hold)
                    </span>
                  </div>

                  {m.isHoldGate ? (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      ⚠️ Customs Hold Gate Active — Simulation will pause here until released
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Continuous Transit
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
