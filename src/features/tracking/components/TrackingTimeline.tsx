"use client";

import * as React from "react";
import type { Shipment, TrackingMilestone } from "@/shared/types";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface TrackingTimelineProps {
  shipment: Shipment;
}

export default function TrackingTimeline({ shipment }: TrackingTimelineProps) {
  const milestones = React.useMemo(() => {
    const list = [...(shipment.milestones || [])];
    return list.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [shipment.milestones]);

  // Find the index of the currently active milestone
  const activeMilestoneIndex = React.useMemo(() => {
    if (shipment.isPaused) {
      const holdGateIdx = milestones.findIndex((m) => m.isHoldGate && !m.isCompleted);
      if (holdGateIdx !== -1) return holdGateIdx;
    }
    const firstUncompleted = milestones.findIndex((m) => !m.isCompleted);
    return firstUncompleted === -1 ? milestones.length - 1 : firstUncompleted;
  }, [milestones, shipment.isPaused]);

  if (milestones.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 text-center text-sm text-slate-400">
        No tracking milestones recorded for this shipment.
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 p-6 space-y-6">
      {/* Header */}
      <div className="pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
          Transit Checkpoints & Milestones
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Sequential route progression and customs dwell monitoring
        </p>
      </div>

      {/* Vertical Stepper Timeline (Inspired by CheckpointStepper in New Shipments) */}
      <div className="relative pl-7 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {milestones.map((m: TrackingMilestone, idx: number) => {
          const isCompleted = m.isCompleted;
          const isActive = idx === activeMilestoneIndex && !isCompleted;
          const isPausedHere = isActive && shipment.isPaused;
          const last = idx === milestones.length - 1;

          const dateStr = m.timestamp
            ? new Date(m.timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <div
              key={m.id || `ms-${idx}`}
              className={cn("relative pt-4", last ? "pb-0" : "pb-5")}
            >
              {/* Minimal Node Marker */}
              <div
                className={cn(
                  "absolute -left-7 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isPausedHere
                    ? "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-400/30"
                    : isActive
                    ? "border-[#0F313A] bg-[#0F313A] text-white dark:border-white dark:bg-white dark:text-black ring-2 ring-sky-400/30"
                    : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : isPausedHere ? (
                  <AlertCircle className="h-3 w-3 stroke-[2.5]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Milestone Details */}
              <div className="relative">
                {/* Title and Date */}
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isCompleted || isActive
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {m.title}
                  </h4>
                  <span className="whitespace-nowrap font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    {dateStr}
                  </span>
                </div>

                {/* Technical Metadata Row (Dwell, Code, Location Code) */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-mono">
                  <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {m.code}
                  </span>

                  {m.dwellHours && m.dwellHours > 0 ? (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {m.dwellHours}h dwell
                      </span>
                    </>
                  ) : null}

                  {m.locationCode ? (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {m.locationCode}
                      </span>
                    </>
                  ) : null}

                  {m.isHoldGate && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider",
                          isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isPausedHere
                            ? "text-amber-600 dark:text-amber-400 font-extrabold"
                            : "text-slate-400"
                        )}
                      >
                        {isCompleted
                          ? "Cleared"
                          : isPausedHere
                          ? "Held"
                          : "Hold Gate"}
                      </span>
                    </>
                  )}
                </div>

                {/* Location Name */}
                {m.locationName && (
                  <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {m.locationName}
                  </p>
                )}

                {/* Description */}
                {m.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {m.description}
                  </p>
                )}

                {/* Paused alert on active milestone */}
                {isPausedHere && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      Held at Customs / Checkpoint Hold
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                      {shipment.pausedReason || "Awaiting mandatory customs entry inspection and customs clearance release."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
