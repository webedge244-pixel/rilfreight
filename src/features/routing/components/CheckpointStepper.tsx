"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Check, Pencil, X } from "lucide-react";
import type { TrackingMilestone, TransportMode } from "@/shared/types";
import { cn } from "@/shared/lib/utils";
import AddressAutocomplete from "@/features/routing/components/AddressAutocomplete";
import { AddMilestoneButton } from "@/shared/components/addMilestoneButton";
import type { MilestoneIssue } from "@/features/routing/lib/milestoneGuards";

export interface CheckpointStepperProps {
  milestones: TrackingMilestone[];
  onToggleHoldGate: (index: number) => void;
  /** Applies a patch to a single milestone (used by the inline editor). */
  onUpdateMilestone?: (index: number, patch: Partial<TrackingMilestone>) => void;
  /** Moves a milestone to a new position in the timeline. */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Restores the whole timeline — used to roll back a cancelled edit. */
  onRestoreMilestones?: (milestones: TrackingMilestone[]) => void;
  /** Appends a new milestone to the timeline. */
  onAddMilestone?: (milestone: TrackingMilestone) => void;
  /** Transport mode — scopes the location lookup to the right hub pool. */
  mode?: TransportMode;
  /** Validation findings raised by the parent. */
  issues?: MilestoneIssue[];
  className?: string;
}

const FIELD =
  "w-full rounded-lg bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A]/30 dark:focus:ring-white/30";
const FIELD_LABEL =
  "block text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1";
const ICON_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#0F313A]/10 hover:text-[#0F313A] disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white";

/** ISO timestamp → value for a `datetime-local` input (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

/** `datetime-local` value (local time) → ISO timestamp. */
function fromLocalInput(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

export default function CheckpointStepper({
  milestones,
  onToggleHoldGate,
  onUpdateMilestone,
  onReorder,
  onRestoreMilestones,
  onAddMilestone,
  mode = "ocean",
  issues = [],
  className = "",
}: CheckpointStepperProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<TrackingMilestone[] | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);

  if (!milestones || milestones.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl text-slate-400 text-sm">
        No milestones generated yet. Click &quot;Generate Route&quot; to compute chronological checkpoints.
      </div>
    );
  }

  const editable = Boolean(onUpdateMilestone);
  const reorderable = Boolean(onReorder);

  const startEdit = (m: TrackingMilestone) => {
    if (!editable) return;
    setSnapshot(milestones.map((item) => ({ ...item })));
    setEditError(null);
    setEditingId(m.id);
  };

  /** Appends an empty checkpoint and opens it for editing. */
  const addMilestone = () => {
    if (!onAddMilestone) return;

    const last = milestones[milestones.length - 1];
    const blank: TrackingMilestone = {
      id: `ms-manual-${milestones.length}-${Date.now()}`,
      code: "CUST",
      title: "",
      description: "",
      locationName: "",
      timestamp: last?.timestamp ?? new Date().toISOString(),
      isCompleted: false,
      dwellHours: 0,
      status: "pending",
    };

    // Snapshot is taken before the insert so cancelling removes the draft.
    setSnapshot(milestones.map((item) => ({ ...item })));
    setEditError(null);
    setEditingId(blank.id);
    onAddMilestone(blank);
  };

  const cancelEdit = () => {
    if (snapshot && onRestoreMilestones) {
      onRestoreMilestones(snapshot);
    }
    setEditingId(null);
    setSnapshot(null);
    setEditError(null);
  };

  const finishEdit = () => {
    const current = milestones.find((m) => m.id === editingId);
    if (current && !current.title.trim()) {
      setEditError("Give this checkpoint a title before adding it to the timeline.");
      return;
    }
    setEditingId(null);
    setSnapshot(null);
    setEditError(null);
  };

  const moveTo = (from: number, to: number) => {
    if (!onReorder) return;
    const target = Math.min(Math.max(to, 0), milestones.length - 1);
    if (target === from) return;
    onReorder(from, target);
  };

  const commitPosition = (from: number, raw: string) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 1) {
      moveTo(from, parsed - 1);
    }
  };

  const errorCount = issues.filter((i) => i.level === "error").length;
  const warningCount = issues.filter((i) => i.level === "warning").length;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Route Checkpoints &amp; Milestone Timeline ({milestones.length})
        </h3>
        <span className="text-[11px] text-slate-400">
          {errorCount + warningCount > 0
            ? `${errorCount} issue${errorCount === 1 ? "" : "s"} · ${warningCount} warning${warningCount === 1 ? "" : "s"}`
            : "Pause Gate controls simulation dwell"}
        </span>
      </div>

      <div className="relative pl-7 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
        {milestones.map((m, idx) => {
          const isEditing = editable && m.id === editingId;
          const rowIssues = issues.filter((i) => i.index === idx);
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
            <React.Fragment key={m.id || `ms-${idx}`}>
              {idx > 0 && (
                <div className="border-t border-slate-200/60 dark:border-slate-800/60" />
              )}

              <div className={cn("relative pt-6", last ? "pb-0" : "pb-6")}>
                {/* Edit-mode highlight sits behind the content without shifting layout */}
                {isEditing && (
                  <div className="pointer-events-none absolute -left-3 -right-3 top-4 bottom-4 rounded-xl bg-[#0F313A]/[0.06] dark:bg-white/[0.06]" />
                )}

                {/* Timeline node */}
                <div
                  className={cn(
                    "absolute -left-7 top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                    m.isHoldGate
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-[#0F313A] bg-white text-[#0F313A] dark:border-slate-400 dark:bg-slate-900 dark:text-slate-300"
                  )}
                >
                  {idx + 1}
                </div>

                <div className={cn("relative", isEditing && "px-3 py-1")}>
                  {isEditing ? (
                    /* ---------------- EDIT MODE ---------------- */
                    <div className="relative space-y-3">
                      {/* Cancel — pinned to the top of the editable bar */}
                      <button
                        type="button"
                        aria-label="Cancel editing checkpoint"
                        title="Cancel"
                        onClick={cancelEdit}
                        className="absolute right-0 top-0 inline-flex h-6 w-6 items-center justify-center rounded-lg text-[#BA1C20] transition-colors hover:bg-[#BA1C20]/10"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="pr-8">
                        <label className={FIELD_LABEL}>Checkpoint title</label>
                        <input
                          className={FIELD}
                          placeholder="e.g. Vessel Departed"
                          value={m.title}
                          onChange={(e) => {
                            setEditError(null);
                            onUpdateMilestone?.(idx, { title: e.target.value });
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-[4rem_4rem_1fr] gap-2">
                        <div className="min-w-0">
                          <label className={FIELD_LABEL}>Code</label>
                          <input
                            className={cn(FIELD, "font-mono uppercase")}
                            value={m.code}
                            onChange={(e) =>
                              onUpdateMilestone?.(idx, {
                                code: e.target.value.toUpperCase(),
                              })
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <label className={FIELD_LABEL}>Dwell (h)</label>
                          <input
                            type="number"
                            min={0}
                            className={cn(FIELD, "font-mono")}
                            value={m.dwellHours ?? ""}
                            onChange={(e) =>
                              onUpdateMilestone?.(idx, {
                                dwellHours:
                                  e.target.value === ""
                                    ? 0
                                    : Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <label className={FIELD_LABEL}>Scheduled at</label>
                          <input
                            type="datetime-local"
                            className={cn(FIELD, "font-mono")}
                            value={toLocalInput(m.timestamp)}
                            onChange={(e) =>
                              onUpdateMilestone?.(idx, {
                                timestamp: fromLocalInput(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>

                      <AddressAutocomplete
                        label="Location"
                        labelClassName="text-[9px]"
                        value={m.locationName}
                        codeValue={m.locationCode}
                        mode={mode}
                        placeholder="Search port, airport, terminal..."
                        codeBadgeClassName="bg-transparent p-0 rounded-none text-[11px] font-mono font-bold text-[#0F313A] dark:text-slate-300"
                        onChangeText={(v) =>
                          onUpdateMilestone?.(idx, { locationName: v })
                        }
                        onSelect={(loc) =>
                          onUpdateMilestone?.(idx, {
                            locationName: loc.name,
                            locationCode: loc.code,
                            coordinates: loc.coordinates,
                          })
                        }
                      />

                      <div>
                        <label className={FIELD_LABEL}>Description</label>
                        <textarea
                          rows={3}
                          className={cn(FIELD, "resize-none")}
                          value={m.description}
                          onChange={(e) =>
                            onUpdateMilestone?.(idx, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Reorder + commit */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {reorderable ? (
                          <div className="flex items-center gap-1.5">
                            <label className={cn(FIELD_LABEL, "mb-0 mr-1")}>
                              Order
                            </label>
                            <button
                              type="button"
                              aria-label="Move checkpoint up"
                              title="Move up"
                              disabled={idx === 0}
                              onClick={() => moveTo(idx, idx - 1)}
                              className={ICON_BTN}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Move checkpoint down"
                              title="Move down"
                              disabled={last}
                              onClick={() => moveTo(idx, idx + 1)}
                              className={ICON_BTN}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <input
                              key={`pos-${m.id}-${idx}`}
                              type="number"
                              min={1}
                              max={milestones.length}
                              defaultValue={idx + 1}
                              aria-label="Checkpoint position"
                              className={cn(FIELD, "w-14 text-center font-mono")}
                              onBlur={(e) => commitPosition(idx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitPosition(
                                    idx,
                                    (e.target as HTMLInputElement).value
                                  );
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <span />
                        )}

                        <button
                          type="button"
                          onClick={finishEdit}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F313A] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white transition-colors hover:opacity-90"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Done
                        </button>
                      </div>

                      {editError && (
                        <p className="text-[11px] leading-relaxed text-[#BA1C20] dark:text-red-400">
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* ---------------- VIEW MODE ---------------- */
                    <>
                      {/* Title + timestamp + edit affordance */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {m.title}
                        </h4>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="whitespace-nowrap font-mono text-[11px] text-slate-400 dark:text-slate-500">
                            {dateStr}
                          </span>
                          {editable && (
                            <button
                              type="button"
                              aria-label={`Edit ${m.title}`}
                              title="Edit checkpoint"
                              onClick={() => startEdit(m)}
                              className={cn(ICON_BTN, "ml-0.5")}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Technical metadata */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {m.code}
                        </span>
                        {m.dwellHours && m.dwellHours > 0 ? (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">
                              &middot;
                            </span>
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {m.dwellHours}h dwell
                            </span>
                          </>
                        ) : null}
                        {m.locationCode ? (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">
                              &middot;
                            </span>
                            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {m.locationCode}
                            </span>
                          </>
                        ) : null}
                      </div>

                      {/* Location + description */}
                      <p className="mt-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {m.locationName}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {m.description}
                      </p>

                      {/* Validation findings */}
                      {rowIssues.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rowIssues.map((issue, i) => (
                            <p
                              key={`${issue.code}-${i}`}
                              className={cn(
                                "text-[11px] leading-relaxed",
                                issue.level === "error"
                                  ? "text-[#BA1C20] dark:text-red-400"
                                  : "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {issue.message}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Pause gate control */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(m.isHoldGate)}
                            aria-label={`Hold Gate (Customs Hold) — ${m.title}`}
                            onClick={() => onToggleHoldGate(idx)}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0F313A] focus:ring-offset-2",
                              m.isHoldGate
                                ? "bg-amber-500"
                                : "bg-slate-200 dark:bg-slate-700"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ease-in-out",
                                m.isHoldGate ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                            Hold Gate (Customs Hold)
                          </span>
                        </span>

                        {m.isHoldGate ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            Simulation paused until released
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Continuous Transit
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Add a new checkpoint */}
      {onAddMilestone && (
        <div className="pl-7">
          <AddMilestoneButton onClick={addMilestone} />
        </div>
      )}
    </div>
  );
}
