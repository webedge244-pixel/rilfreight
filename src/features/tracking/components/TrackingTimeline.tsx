"use client";

import * as React from "react";
import type { Shipment, TrackingMilestone } from "@/shared/types";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface TrackingTimelineProps {
  shipment: Shipment;
}

export default function TrackingTimeline({ shipment }: TrackingTimelineProps) {
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

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

  // Legacy paused shipments hold on an uncompleted gate; that gate must stay
  // visible. New-style pauses already show the gate as completed, so while
  // paused no later checkpoint is revealed until the hold is released.
  const legacyHoldGateId = React.useMemo(() => {
    if (!shipment.isPaused) return null;
    const firstUncompleted = milestones.find((m) => !m.isCompleted);
    return firstUncompleted?.isHoldGate ? firstUncompleted.id : null;
  }, [shipment.isPaused, milestones]);

  // Filter visible milestones:
  // 1. Completed checkpoints always display
  // 2. Currently active checkpoint (including held gates) shows once its scheduled time has arrived
  // 3. Next future timelines do not show at all until their time to show reaches
  const visibleMilestones = React.useMemo(() => {
    return milestones.filter((m, idx) => {
      if (m.isCompleted) return true;

      if (shipment.isPaused) return m.id === legacyHoldGateId;

      // If shipment has not departed yet, do not show uncompleted milestones
      if (new Date(shipment.departureDate).getTime() > nowMs) return false;

      // Currently active milestone shows once its scheduled time has arrived
      const firstUncompletedIndex = milestones.findIndex((item) => !item.isCompleted);
      if (idx === firstUncompletedIndex) {
        const mTime = new Date(m.timestamp).getTime();
        return !isNaN(mTime) && mTime <= nowMs;
      }

      // Future timelines remain hidden until their time arrives
      return false;
    });
  }, [milestones, shipment.departureDate, shipment.isPaused, legacyHoldGateId, nowMs]);

  const getMilestoneTitle = (m: TrackingMilestone) => {
    return m.title;
  };

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
          Sequential route progression and transit checkpoints
        </p>
      </div>

      {/* Pause notice: the cleared hold gate is visible above; the next
          checkpoint will not occur until the hold is released. */}
      {shipment.isPaused && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Shipment on hold
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-200/80">
            {shipment.pausedReason ||
              "Awaiting administrative release before the next checkpoint can occur."}
          </p>
        </div>
      )}

      {/* Vertical Stepper Timeline (Inspired by CheckpointStepper in New Shipments) */}
      <div className="relative pl-7 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {visibleMilestones.map((m: TrackingMilestone, idx: number) => {
          const isCompleted = m.isCompleted;
          const isActive = m.id === milestones[activeMilestoneIndex]?.id && !isCompleted;
          const last = idx === visibleMilestones.length - 1;
          const isWarningActive = last && Boolean(m.showAsWarning);

          const dateStr = m.timestamp
            ? new Date(m.timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
              })
            : "";

          return (
            <div
              key={m.id || `ms-${idx}`}
              className={cn(
                "relative pt-4 transition-colors",
                last ? "pb-0" : "pb-5",
                isWarningActive ? "bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl p-3 -ml-3" : ""
              )}
            >
              {/* Minimal Node Marker */}
              <div
                className={cn(
                  "absolute -left-7 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                  isWarningActive
                    ? "border-amber-500 bg-amber-500 text-white"
                    : isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isActive
                    ? "border-[#0F313A] bg-[#0F313A] text-white dark:border-white dark:bg-white dark:text-black ring-2 ring-sky-400/30"
                    : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                )}
              >
                {isCompleted && !isWarningActive ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>

              {/* Milestone Details */}
              <div className="relative transition-all">
                {/* Title and Date */}
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isWarningActive
                        ? "text-amber-900 dark:text-amber-200"
                        : isCompleted || isActive
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {getMilestoneTitle(m)}
                  </h4>
                  <span
                    className={cn(
                      "whitespace-nowrap font-mono text-[11px]",
                      isWarningActive
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {dateStr}
                  </span>
                </div>

                {/* Technical Metadata Row (Code, Location Code) */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] font-mono">
                  <span
                    className={cn(
                      "font-bold uppercase tracking-wider",
                      isWarningActive
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {m.code}
                  </span>

                  {m.locationCode ? (
                    <>
                      <span
                        className={cn(
                          isWarningActive
                            ? "text-amber-400 dark:text-amber-600"
                            : "text-slate-300 dark:text-slate-600"
                        )}
                      >
                        &middot;
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          isWarningActive
                            ? "text-amber-800 dark:text-amber-300"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {m.locationCode}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Location Name */}
                {m.locationName && (
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      isWarningActive
                        ? "text-amber-800/80 dark:text-amber-300/80"
                        : "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {m.locationName}
                  </p>
                )}

                {/* Description */}
                {m.description && (
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      isWarningActive
                        ? "text-amber-800/70 dark:text-amber-300/70"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {m.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
