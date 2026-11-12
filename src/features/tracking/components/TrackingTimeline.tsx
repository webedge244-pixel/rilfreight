"use client";

import * as React from "react";
import type { Shipment, TrackingMilestone } from "@/shared/types";
import { Check, AlertCircle, Clock, ShieldAlert, ShieldCheck } from "lucide-react";

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
    // If paused, find the hold gate milestone or the first uncompleted milestone
    if (shipment.isPaused) {
      const holdGateIdx = milestones.findIndex((m) => m.isHoldGate && !m.isCompleted);
      if (holdGateIdx !== -1) return holdGateIdx;
    }
    const firstUncompleted = milestones.findIndex((m) => !m.isCompleted);
    return firstUncompleted === -1 ? milestones.length - 1 : firstUncompleted;
  }, [milestones, shipment.isPaused]);

  if (milestones.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
        No tracking milestones recorded for this shipment.
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
            Transit Checkpoints & Milestones
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sequential route progression and customs dwell monitoring
          </p>
        </div>
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {milestones.filter((m) => m.isCompleted).length} / {milestones.length} Completed
        </span>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-[23px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {milestones.map((m: TrackingMilestone, idx: number) => {
          const isCompleted = m.isCompleted;
          const isActive = idx === activeMilestoneIndex && !isCompleted;
          const isFuture = !isCompleted && !isActive;
          const isCustoms = m.code === "CUSR" || m.title.toLowerCase().includes("customs") || Boolean(m.isHoldGate);

          return (
            <div key={m.id || `ms-${idx}`} className="relative group">
              {/* Node Indicator */}
              <div
                className={`absolute -left-[30px] top-0.5 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${
                  isCompleted
                    ? "bg-emerald-500 border-white text-white shadow-md shadow-emerald-500/20"
                    : isActive
                    ? shipment.isPaused
                      ? "bg-amber-500 border-white text-white ring-4 ring-amber-400/30 animate-pulse shadow-lg"
                      : "bg-[#0284c7] border-white text-white ring-4 ring-sky-400/30 animate-pulse shadow-lg"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isActive && shipment.isPaused ? (
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                )}
              </div>

              {/* Milestone Content Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? shipment.isPaused
                      ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-sm"
                      : "bg-sky-50/70 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800/60 shadow-sm"
                    : isCompleted
                    ? "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                    : "bg-transparent border-transparent opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.code}
                    </span>
                    <h4 className="text-sm font-bold text-black dark:text-white">
                      {m.title}
                    </h4>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isCustoms && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : isActive && shipment.isPaused
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <ShieldCheck className="w-3 h-3" /> Cleared (Green Lane)
                          </>
                        ) : isActive && shipment.isPaused ? (
                          <>
                            <ShieldAlert className="w-3 h-3" /> Hold Gate Active
                          </>
                        ) : (
                          "Customs Gate"
                        )}
                      </span>
                    )}

                    {m.dwellHours && m.dwellHours > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <Clock className="w-3 h-3" /> {m.dwellHours}h dwell
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
                  <span>
                    📍 <strong className="text-slate-700 dark:text-slate-300">{m.locationName}</strong>
                    {m.locationCode ? ` (${m.locationCode})` : ""}
                  </span>
                  <span>
                    🕒 {new Date(m.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </span>
                </div>

                {m.description && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {m.description}
                  </p>
                )}

                {/* Paused alert on active milestone */}
                {isActive && shipment.isPaused && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 text-xs text-amber-950 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Simulation On Hold at this Gate
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
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
