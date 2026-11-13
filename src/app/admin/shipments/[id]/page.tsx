"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipmentRecord,
  replaceShipmentRecord,
} from "@/shared/lib/firebase";
import {
  releaseShipmentGate,
  triggerShipmentException,
} from "@/features/tracking/services/trackingService";
import type { Shipment, ShipmentStatus } from "@/shared/types";

// SSR-safe dynamic import for the Leaflet map
const LiveTrackingMap = dynamic(
  () => import("@/features/tracking/components/LiveTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] sm:h-[360px] rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
        <span className="text-sm text-slate-400 font-semibold">
          Loading route map...
        </span>
      </div>
    ),
  }
);

/**
 * Preset operational reasons for a hold gate.
 */
const EXCEPTION_PRESETS = [
  "Customs Inspection Hold Gate",
  "Port Congestion Dwell Hold",
  "Severe Typhoon Warning — Vessel Anchored",
  "Mechanical Conveyance Inspection",
  "Border Transit Security Verification",
];

/**
 * Computes progress along the scheduled window.
 * Kept outside the component so the clock read is not evaluated during render.
 */
function computeProgressPercent(shipment: Shipment): number {
  const start = new Date(shipment.departureDate).getTime();
  const end = new Date(shipment.estimatedDeliveryDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

/**
 * Human readable label for where a shipment currently sits.
 */
function currentLocationLabel(shipment: Shipment): string {
  const completed = (shipment.waypoints || []).filter((w) => w.isCompleted);
  const last = completed[completed.length - 1];
  return last?.name || shipment.originName || "In transit";
}

export default function ShipmentDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading shipment...</div>}>
      <ShipmentDetailContent />
    </React.Suspense>
  );
}

function ShipmentDetailContent() {
  const params = useParams();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isActionPending, setIsActionPending] = React.useState<boolean>(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [showExceptionForm, setShowExceptionForm] = React.useState<boolean>(false);
  const [exceptionStatusType, setExceptionStatusType] =
    React.useState<ShipmentStatus>("customs_hold");
  const [exceptionReasonPreset, setExceptionReasonPreset] =
    React.useState<string>(EXCEPTION_PRESETS[0]);
  const [customExceptionReason, setCustomExceptionReason] = React.useState("");

  // Live listener — the record is pushed to the client whenever it changes.
  React.useEffect(() => {
    const unsubscribe = listenToShipmentRecord(
      shipmentId,
      (live) => {
        setShipment(live);
        setIsLoading(false);
        setLoadError(null);
      },
      (error) => {
        console.error(`Failed to subscribe to shipment ${shipmentId}:`, error);
        setLoadError(
          "Unable to reach the shipment database. Check the connection and try again."
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shipmentId]);

  const statusColor = (status: string) => {
    switch (status) {
      case "in_transit":
        return "text-[#0F313A] bg-[#0F313A]/10 dark:text-teal-300 dark:bg-teal-900/30";
      case "delivered":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
      case "customs_hold":
      case "weather_delay":
        return "text-[#BA1C20] bg-[#BA1C20]/10";
      default:
        return "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
    }
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const progressPercent = React.useMemo(
    () => (shipment ? computeProgressPercent(shipment) : 0),
    [shipment]
  );

  // ── Actions ────────────────────────────────────────────

  const handleResume = async () => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    try {
      const released = releaseShipmentGate(shipment);
      await replaceShipmentRecord(shipment.id, released);
      setShowExceptionForm(false);
    } catch (error) {
      console.error("Failed to release hold gate:", error);
      setActionError("Could not release the hold gate. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handlePause = async () => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    const reason = customExceptionReason.trim() || exceptionReasonPreset;

    try {
      const paused = triggerShipmentException(
        shipment,
        reason,
        exceptionStatusType
      );

      await replaceShipmentRecord(shipment.id, {
        ...paused,
        pausedLocationName: currentLocationLabel(shipment),
      });

      setShowExceptionForm(false);
      setCustomExceptionReason("");
    } catch (error) {
      console.error("Failed to trigger exception:", error);
      setActionError("Could not place the shipment on hold. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  // ── Render states ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-slate-400">
        Loading shipment record...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-[#BA1C20]">{loadError}</p>
        <Link
          href="/admin/shipments"
          className="inline-block mt-4 text-sm font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
        >
          Back to Shipments
        </Link>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
          Shipment Not Found
        </h1>
        <p className="text-sm text-slate-400">
          No shipment exists with ID: <span className="font-mono">{shipmentId}</span>
        </p>
        <Link
          href="/admin/shipments"
          className="text-sm font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
        >
          Back to Shipments
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/admin/shipments"
        className="inline-block text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors mb-4"
      >
        ← Back to Shipments
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-mono">
            {shipment.trackingCode}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn(
              "inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
              statusColor(shipment.status)
            )}>
              {formatStatus(shipment.status)}
            </span>
            <span className="text-sm text-slate-400 capitalize">{shipment.mode} freight</span>
          </div>
        </div>

        {/* Pause / Resume Controls */}
        {shipment.status !== "delivered" && (
          <div className="flex gap-2">
            {shipment.isPaused ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={isActionPending}
                className="px-5 py-2.5 rounded-2xl bg-[#0F313A] hover:bg-[#0b252c] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isActionPending ? "Working..." : "Resume Tracking"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowExceptionForm((open) => !open)}
                disabled={isActionPending}
                className="px-5 py-2.5 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Pause Shipment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Error */}
      {actionError && (
        <p role="alert" className="mb-6 text-sm font-semibold text-[#BA1C20]">
          {actionError}
        </p>
      )}

      {/* Hold Gate Form */}
      {showExceptionForm && !shipment.isPaused && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Place Shipment On Hold
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              The live position is frozen and the hold reason is published to the tracking timeline.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Exception Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExceptionStatusType("customs_hold")}
                className={cn(
                  "p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-colors",
                  exceptionStatusType === "customs_hold"
                    ? "bg-[#0F313A] text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                Customs Hold Gate
              </button>
              <button
                type="button"
                onClick={() => setExceptionStatusType("weather_delay")}
                className={cn(
                  "p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-colors",
                  exceptionStatusType === "weather_delay"
                    ? "bg-[#BA1C20] text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                Weather / Route Delay
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Preset Reason
            </label>
            <select
              value={exceptionReasonPreset}
              onChange={(e) => setExceptionReasonPreset(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
            >
              {EXCEPTION_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Custom Operational Note (Optional)
            </label>
            <textarea
              value={customExceptionReason}
              onChange={(e) => setCustomExceptionReason(e.target.value)}
              placeholder="Specify custom reason or operational instructions..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowExceptionForm(false)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePause}
              disabled={isActionPending}
              className="px-6 py-2.5 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isActionPending ? "Applying..." : "Confirm & Place On Hold"}
            </button>
          </div>
        </div>
      )}

      {/* Paused Banner */}
      {shipment.isPaused && shipment.pausedReason && (
        <div className="bg-[#F9BC15]/15 border border-[#F9BC15]/30 rounded-2xl px-5 py-4 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#BA1C20]">On Hold</span>
          <p className="text-sm text-black dark:text-white mt-1">
            {shipment.pausedReason}
          </p>
          {shipment.pausedLocationName && (
            <p className="text-xs text-slate-400 mt-1">
              Location: {shipment.pausedLocationName}
            </p>
          )}
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

        {/* Route Progress */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-4">
            Route Progress
          </h2>
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-mono text-sm text-slate-500">{shipment.originCode}</span>
            <span className="text-2xl font-black text-black dark:text-white">{progressPercent}%</span>
            <span className="font-mono text-sm text-slate-500">{shipment.destinationCode}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0F313A] dark:bg-white transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Live Route Map */}
          <div className="mt-6">
            <LiveTrackingMap shipment={shipment} height="360px" />
          </div>
        </div>

        {/* Cargo Manifest */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Cargo Manifest
          </h2>
          <div className="space-y-4">
            <ManifestRow label="Conveyance" value={shipment.conveyanceName} />
            {shipment.conveyanceIdentifier && (
              <ManifestRow label="Identifier" value={shipment.conveyanceIdentifier} mono />
            )}
            {shipment.voyageNumber && (
              <ManifestRow label="Voyage" value={shipment.voyageNumber} mono />
            )}
            <ManifestRow label="Reference" value={shipment.consignmentReference} mono />
            {shipment.containerNumber && (
              <ManifestRow label="Container" value={shipment.containerNumber} mono />
            )}
            {shipment.sealNumber && (
              <ManifestRow label="Seal" value={shipment.sealNumber} mono />
            )}
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <ManifestRow label="Pieces" value={`${shipment.totalPieces}`} />
            <ManifestRow label="Gross Weight" value={`${shipment.grossWeightKg.toLocaleString()} kg`} />
            {shipment.volumeCbm && (
              <ManifestRow label="Volume" value={`${shipment.volumeCbm} CBM`} />
            )}
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <span className="block text-xs text-slate-400 mb-1">Goods</span>
              <span className="text-sm text-black dark:text-white">{shipment.goodsDescription}</span>
            </div>
            {shipment.clientName && (
              <>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="block text-xs text-slate-400 mb-1">Consignee</span>
                  <span className="text-sm text-black dark:text-white">{shipment.clientName}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Milestones Timeline */}
        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Milestones
          </h2>
          <div className="space-y-0">
            {shipment.milestones.map((ms, i) => (
              <div key={ms.id} className="flex gap-4">
                {/* Timeline Indicator */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full shrink-0 mt-1",
                    ms.isCompleted ? "bg-[#0F313A] dark:bg-white" : "bg-slate-300 dark:bg-slate-600"
                  )} />
                  {i < shipment.milestones.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-5">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "font-mono text-xs font-bold uppercase tracking-wider",
                      ms.isCompleted ? "text-[#0F313A] dark:text-white" : "text-slate-400"
                    )}>
                      {ms.code}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      ms.isCompleted ? "text-black dark:text-white" : "text-slate-400"
                    )}>
                      {ms.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ms.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ms.locationName} · {new Date(ms.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waypoints */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Waypoints
          </h2>
          <div className="space-y-3">
            {shipment.waypoints.map((wp) => (
              <div
                key={wp.id}
                className={cn(
                  "flex items-center justify-between py-2",
                  wp.isCompleted ? "opacity-100" : "opacity-50"
                )}
              >
                <div>
                  <span className="text-sm font-semibold text-black dark:text-white block">{wp.name}</span>
                  <span className="text-xs text-slate-400">{wp.country}</span>
                </div>
                {wp.isCompleted && (
                  <span className="text-xs font-bold text-[#0F313A] dark:text-white uppercase tracking-wider">
                    Passed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Manifest Row
// ──────────────────────────────────────────────

function ManifestRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className={cn("text-sm text-black dark:text-white text-right", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}
