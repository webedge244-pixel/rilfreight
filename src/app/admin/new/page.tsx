"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { ArrowDown, PackagePlus, X } from "lucide-react";
import type {
  TransportMode,
  Shipment,
  RouteWaypoint,
  TrackingMilestone,
} from "@/shared/types";
import { createShipmentRecord, getShipmentRecord } from "@/shared/lib/firebase";
import AddressAutocomplete from "@/features/routing/components/AddressAutocomplete";
import CheckpointStepper from "@/features/routing/components/CheckpointStepper";
import {
  buildRouteOrder,
  detectMilestoneIssues,
  normalizeMilestones,
  reconcileLocationOrder,
  reassignTimestamps,
} from "@/features/routing/lib/milestoneGuards";
import {
  deriveShipmentStatus,
  synchronizeWaypoints,
  createDefaultSchedule,
  cascadeMilestoneGaps,
  swapMilestonesWithTimestampInheritance,
  toLocalDatetimeInput,
} from "@/shared/lib/shipmentLogic";
import { Select } from "@/shared/components/select";
import { Button } from "@/shared/components/button";
import { PrimaryActionButton } from "@/shared/components/primaryActionButton";
import { useToast } from "@/shared/components/toast";

// SSR-safe dynamic import for Vector RouteMiniMapLibre
const RouteMiniMap = dynamic(
  () => import("@/features/routing/components/RouteMiniMapLibre"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 text-xs font-mono">
        Loading Interactive Vector Route Map...
      </div>
    ),
  }
);

// Default schedule: departure tomorrow, delivery +15 days.
// Kept outside the component so the clock read is not evaluated during render.
const defaultSchedule = createDefaultSchedule;

export default function NewShipmentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto py-12 px-4 text-center text-slate-400 text-sm">
          Loading shipment studio...
        </div>
      }
    >
      <NewShipmentContent />
    </React.Suspense>
  );
}

function NewShipmentContent() {
  const searchParams = useSearchParams();
  const cloneFromId = searchParams.get("cloneFrom");
  const toast = useToast();
  const [isLoadingClone, setIsLoadingClone] = React.useState(false);

  const [mode, setMode] = React.useState<TransportMode>("ocean");
  const [isCalculatingRoute, setIsCalculatingRoute] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successShipment, setSuccessShipment] = React.useState<{
    id: string;
    trackingCode: string;
  } | null>(null);

  // Default dates: departure tomorrow, delivery +14 days
  const schedule = React.useMemo(() => defaultSchedule(), []);
  const defaultDep = schedule.departure;
  const defaultDel = schedule.delivery;

  // Form State
  const [formState, setFormState] = React.useState({
    originName: "Port of Shanghai (Yangshan Deepwater)",
    originCode: "CNSHA",
    originCountry: "China",
    originCountryCode: "CN",
    originCoordinates: [121.5, 31.0] as [number, number],

    destinationName: "PortMiami (Dante B. Fascell Port)",
    destinationCode: "USMIA",
    destinationCountry: "United States",
    destinationCountryCode: "US",
    destinationCoordinates: [-80.191, 25.761] as [number, number],

    departureDate: defaultDep,
    estimatedDeliveryDate: defaultDel,

    conveyanceName: "",
    conveyanceIdentifier: "",
    voyageNumber: "",
    consignmentReference: "",
    containerNumber: "",
    sealNumber: "",

    totalPieces: "",
    grossWeightKg: "",
    volumeCbm: "",
    goodsDescription: "",
    clientName: "",
  });

  // Routing State
  const [routeCoordinates, setRouteCoordinates] = React.useState<[number, number][]>([]);
  const [waypoints, setWaypoints] = React.useState<RouteWaypoint[]>([]);
  const [milestones, setMilestones] = React.useState<TrackingMilestone[]>([]);
  const [trackingCode, setTrackingCode] = React.useState<string>("");
  const [routeSummary, setRouteSummary] = React.useState<{
    distanceKm: number;
    durationHours?: number;
    passages?: string[];
  } | null>(null);

  // True only while the computed route matches the current route inputs.
  // Any edit that requires a new route flips this back to false.
  const [hasValidRoute, setHasValidRoute] = React.useState(false);

  interface PendingRouteChange {
    title: string;
    description: string;
    applyFormState: Partial<typeof formState>;
    applyMode?: TransportMode;
  }
  const [pendingChange, setPendingChange] = React.useState<PendingRouteChange | null>(null);

  // Active route snapshot used to revert when cancelling a change
  const activeRouteSnapshot = React.useRef({
    originName: formState.originName,
    originCode: formState.originCode,
    originCountry: formState.originCountry,
    originCountryCode: formState.originCountryCode,
    originCoordinates: formState.originCoordinates,
    destinationName: formState.destinationName,
    destinationCode: formState.destinationCode,
    destinationCountry: formState.destinationCountry,
    destinationCountryCode: formState.destinationCountryCode,
    destinationCoordinates: formState.destinationCoordinates,
    departureDate: formState.departureDate,
    estimatedDeliveryDate: formState.estimatedDeliveryDate,
    mode,
  });

  const hasCustomMilestones = React.useMemo(() => {
    return milestones.some((m) => m.isCustom || m.id.startsWith("ms-manual-"));
  }, [milestones]);

  // Effect to load source shipment if cloneFrom is present
  React.useEffect(() => {
    if (!cloneFromId) return;

    let isMounted = true;
    setIsLoadingClone(true);

    getShipmentRecord(cloneFromId)
      .then((cloned) => {
        if (!isMounted || !cloned) return;

        toast.success(
          `Cloned from ${cloned.trackingCode} — corridor, cargo, and timeline loaded.`
        );
        if (cloned.mode) setMode(cloned.mode);

        // Schedule dates: departure tomorrow, preserve original voyage duration
        const sched = defaultSchedule();
        const newDep = sched.departure;
        const oldDepMs = Date.parse(cloned.departureDate);
        const oldDelMs = Date.parse(cloned.estimatedDeliveryDate);
        const originalDurationMs =
          Number.isFinite(oldDepMs) && Number.isFinite(oldDelMs) && oldDelMs > oldDepMs
            ? oldDelMs - oldDepMs
            : 14 * 86400 * 1000;

        const newDepMs = Date.parse(newDep);
        const newDelMs = newDepMs + originalDurationMs;
        const newDel = toLocalDatetimeInput(new Date(newDelMs));

        setFormState((prev) => ({
          ...prev,
          originName: cloned.originName || prev.originName,
          originCode: cloned.originCode || prev.originCode,
          originCountry: cloned.originCountry || prev.originCountry,
          originCountryCode: prev.originCountryCode || "CN",
          originCoordinates: cloned.originCoordinates || prev.originCoordinates,

          destinationName: cloned.destinationName || prev.destinationName,
          destinationCode: cloned.destinationCode || prev.destinationCode,
          destinationCountry: cloned.destinationCountry || prev.destinationCountry,
          destinationCountryCode: prev.destinationCountryCode || "US",
          destinationCoordinates: cloned.destinationCoordinates || prev.destinationCoordinates,

          departureDate: newDep,
          estimatedDeliveryDate: newDel,

          conveyanceName: cloned.conveyanceName || "",
          conveyanceIdentifier: cloned.conveyanceIdentifier || "",
          voyageNumber: "",
          consignmentReference: "",
          containerNumber: "",
          sealNumber: "",

          totalPieces: cloned.totalPieces != null ? String(cloned.totalPieces) : "",
          grossWeightKg: cloned.grossWeightKg != null ? String(cloned.grossWeightKg) : "",
          volumeCbm: cloned.volumeCbm != null ? String(cloned.volumeCbm) : "",
          goodsDescription: cloned.goodsDescription || "",
          clientName: "", // Cleared per user requirement
        }));

        // Clone Milestones: retain all milestones, scale timestamps into new schedule, reset completion
        if (cloned.milestones && cloned.milestones.length > 0) {
          const scaledMilestones = cloned.milestones.map((m, idx) => {
            const mMs = Date.parse(m.timestamp);
            const fraction =
              Number.isFinite(mMs) && Number.isFinite(oldDepMs) && originalDurationMs > 0
                ? Math.min(Math.max((mMs - oldDepMs) / originalDurationMs, 0), 1)
                : idx / Math.max(cloned.milestones.length - 1, 1);

            const targetMs = newDepMs + fraction * originalDurationMs;
            return {
              ...m,
              id: `ms-cloned-${idx}-${Date.now()}`,
              timestamp: new Date(targetMs).toISOString(),
              isCompleted: false,
              status: "pending",
              isCustom: true,
            };
          });

          const normalized = normalizeMilestones(scaledMilestones, {
            departureMs: newDepMs,
            deliveryMs: newDelMs,
          });

          setMilestones(normalized);
        }

        // Corridor Map & Waypoints
        if (cloned.routeCoordinates && cloned.routeCoordinates.length > 0) {
          setRouteCoordinates(cloned.routeCoordinates);
        }
        if (cloned.waypoints && cloned.waypoints.length > 0) {
          setWaypoints(cloned.waypoints);
        }

        setRouteSummary({
          distanceKm: cloned.routeCoordinates?.length ? Math.round(cloned.routeCoordinates.length * 10) : 5000,
          durationHours: Math.round(originalDurationMs / 3600000),
        });

        setHasValidRoute(true);

        activeRouteSnapshot.current = {
          originName: cloned.originName,
          originCode: cloned.originCode,
          originCountry: cloned.originCountry,
          originCountryCode: "CN",
          originCoordinates: cloned.originCoordinates,
          destinationName: cloned.destinationName,
          destinationCode: cloned.destinationCode,
          destinationCountry: cloned.destinationCountry,
          destinationCountryCode: "US",
          destinationCoordinates: cloned.destinationCoordinates,
          departureDate: newDep,
          estimatedDeliveryDate: newDel,
          mode: cloned.mode || "ocean",
        };
      })
      .catch((err) => {
        console.error("Failed to load cloned shipment:", err);
        toast.destructive("Failed to load details from source shipment.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingClone(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cloneFromId]);

  /**
   * Fields whose change invalidates a previously computed route.
   * Cargo particulars (pieces, weight, volume, consignee, description)
   * are deliberately excluded — they do not affect the corridor.
   */
  const ROUTE_FIELDS = new Set([
    "originName",
    "originCode",
    "originCoordinates",
    "destinationName",
    "destinationCode",
    "destinationCoordinates",
    "departureDate",
    "estimatedDeliveryDate",
  ]);

  /**
   * Discards a stale computed route so the user must regenerate before
   * the downstream Conveyance & Documents stage is revealed again.
   */
  const invalidateRoute = React.useCallback(() => {
    setHasValidRoute(false);
    setRouteCoordinates([]);
    setWaypoints([]);
    setMilestones([]);
    setRouteSummary(null);
    setTrackingCode("");
  }, []);

  const requestRouteChange = React.useCallback(
    (change: {
      title: string;
      description: string;
      applyFormState: Partial<typeof formState>;
      applyMode?: TransportMode;
    }) => {
      if (hasCustomMilestones) {
        setPendingChange(change);
      } else {
        setFormState((prev) => ({ ...prev, ...change.applyFormState }));
        if (change.applyMode) setMode(change.applyMode);
        invalidateRoute();
      }
    },
    [hasCustomMilestones, invalidateRoute]
  );

  const handleCancelChange = React.useCallback(() => {
    if (!pendingChange) return;
    setFormState((prev) => ({
      ...prev,
      originName: activeRouteSnapshot.current.originName,
      originCode: activeRouteSnapshot.current.originCode,
      originCountry: activeRouteSnapshot.current.originCountry,
      originCountryCode: activeRouteSnapshot.current.originCountryCode,
      originCoordinates: activeRouteSnapshot.current.originCoordinates,
      destinationName: activeRouteSnapshot.current.destinationName,
      destinationCode: activeRouteSnapshot.current.destinationCode,
      destinationCountry: activeRouteSnapshot.current.destinationCountry,
      destinationCountryCode: activeRouteSnapshot.current.destinationCountryCode,
      destinationCoordinates: activeRouteSnapshot.current.destinationCoordinates,
      departureDate: activeRouteSnapshot.current.departureDate,
      estimatedDeliveryDate: activeRouteSnapshot.current.estimatedDeliveryDate,
    }));
    setMode(activeRouteSnapshot.current.mode);
    setPendingChange(null);
  }, [pendingChange]);

  const handleProceedClear = React.useCallback(() => {
    if (!pendingChange) return;
    setFormState((prev) => ({ ...prev, ...pendingChange.applyFormState }));
    if (pendingChange.applyMode) setMode(pendingChange.applyMode);
    invalidateRoute();
    setPendingChange(null);
  }, [pendingChange, invalidateRoute]);

  const handleRecalculateWithEdited = React.useCallback(async () => {
    if (!pendingChange) return;

    const nextFormState = { ...formState, ...pendingChange.applyFormState };
    const nextMode = pendingChange.applyMode || mode;

    setFormState(nextFormState);
    if (pendingChange.applyMode) setMode(pendingChange.applyMode);
    setPendingChange(null);

    setIsCalculatingRoute(true);
    setErrorMessage(null);

    // Keep existing custom milestones
    const existingCustomMilestones = milestones.filter(
      (m) => m.isCustom || m.id.startsWith("ms-manual-")
    );

    const oldDepMs = Date.parse(formState.departureDate) || Date.now();
    const oldDelMs = Date.parse(formState.estimatedDeliveryDate) || oldDepMs + 86400000 * 14;
    const oldDuration = Math.max(oldDelMs - oldDepMs, 3600000);

    const newDepMs = Date.parse(nextFormState.departureDate) || Date.now();
    const newDelMs = Date.parse(nextFormState.estimatedDeliveryDate) || newDepMs + 86400000 * 14;
    const newDuration = Math.max(newDelMs - newDepMs, 3600000);

    try {
      const res = await fetch("/api/route/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: nextMode,
          originQuery: nextFormState.originName,
          destQuery: nextFormState.destinationName,
          originCoords: nextFormState.originCoordinates,
          destCoords: nextFormState.destinationCoordinates,
          departureDate: new Date(nextFormState.departureDate).toISOString(),
          estimatedDeliveryDate: nextFormState.estimatedDeliveryDate
            ? new Date(nextFormState.estimatedDeliveryDate).toISOString()
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate realistic route");
      }

      setRouteCoordinates(data.coordinates || data.routeCoordinates || []);
      setWaypoints(data.waypoints || []);
      setTrackingCode(data.trackingCode || data.carrierTrackingCode || "");
      setRouteSummary({
        distanceKm: data.distanceKm,
        durationHours: data.durationHours,
        passages: data.passages,
      });

      if (data.logisticsDefaults || data.conveyanceDefaults) {
        const d = data.logisticsDefaults || data.conveyanceDefaults;
        setFormState((prev) => ({
          ...prev,
          conveyanceName: d.conveyanceName || prev.conveyanceName,
          conveyanceIdentifier: d.conveyanceIdentifier || prev.conveyanceIdentifier,
          voyageNumber: d.voyageCode || prev.voyageNumber,
          consignmentReference: d.consignmentReference || prev.consignmentReference,
          containerNumber: d.containerNumber || prev.containerNumber,
          sealNumber: d.sealNumber || prev.sealNumber,
        }));
      }

      if (data.originGateway) {
        setFormState((prev) => ({
          ...prev,
          originCode: data.originGateway.code || prev.originCode,
          originCountry: data.originGateway.country || prev.originCountry,
          originCountryCode: data.originGateway.countryCode || prev.originCountryCode,
        }));
      }
      if (data.destGateway) {
        setFormState((prev) => ({
          ...prev,
          destinationCode: data.destGateway.code || prev.destinationCode,
          destinationCountry: data.destGateway.country || prev.destinationCountry,
          destinationCountryCode: data.destGateway.countryCode || prev.destinationCountryCode,
        }));
      }

      const generatedMilestones: TrackingMilestone[] = data.milestones || [];

      // Scale custom milestones into the new timeline window
      const scaledCustom = existingCustomMilestones.map((m, cIdx) => {
        const mMs = Date.parse(m.timestamp);
        const fraction = Number.isFinite(mMs)
          ? Math.min(Math.max((mMs - oldDepMs) / oldDuration, 0.05), 0.95)
          : 0.5;
        const targetMs = newDepMs + fraction * newDuration;
        const uniqueId = m.id.startsWith("ms-manual-")
          ? m.id
          : `ms-custom-${cIdx}-${Date.now()}`;
        return {
          ...m,
          id: uniqueId,
          isCustom: true,
          timestamp: new Date(targetMs).toISOString(),
        };
      });

      const merged = [...generatedMilestones, ...scaledCustom];
      merged.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

      const normalized = normalizeMilestones(merged, {
        departureMs: newDepMs,
        deliveryMs: newDelMs,
      });

      setMilestones(normalized);
      setHasValidRoute(true);

      activeRouteSnapshot.current = {
        originName: nextFormState.originName,
        originCode: nextFormState.originCode,
        originCountry: nextFormState.originCountry,
        originCountryCode: nextFormState.originCountryCode,
        originCoordinates: nextFormState.originCoordinates,
        destinationName: nextFormState.destinationName,
        destinationCode: nextFormState.destinationCode,
        destinationCountry: nextFormState.destinationCountry,
        destinationCountryCode: nextFormState.destinationCountryCode,
        destinationCoordinates: nextFormState.destinationCoordinates,
        departureDate: nextFormState.departureDate,
        estimatedDeliveryDate: nextFormState.estimatedDeliveryDate,
        mode: nextMode,
      };
    } catch (err: unknown) {
      console.error("Route calculation error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Route calculation error"
      );
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [pendingChange, formState, mode, milestones]);

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (ROUTE_FIELDS.has(field)) {
      if (hasCustomMilestones) {
        requestRouteChange({
          title: `Changing ${field}`,
          description: `Changing this field will affect your edited timeline.`,
          applyFormState: { [field]: value },
        });
      } else {
        invalidateRoute();
      }
    }
  };

  const handleToggleHoldGate = (index: number) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, isHoldGate: !m.isHoldGate, isCustom: true } : m))
    );
  };

  /* ------------------------------------------------------------------ *
   * Milestone timeline guardrails
   * ------------------------------------------------------------------ */

  /**
   * The shipment window every checkpoint must live inside.
   * Clearing either date invalidates the route (and therefore the milestones),
   * so the fallbacks below only ever apply to an empty timeline.
   */
  const departureMs = React.useMemo(() => {
    const ms = Date.parse(formState.departureDate);
    return Number.isFinite(ms) ? ms : 0;
  }, [formState.departureDate]);

  const deliveryMs = React.useMemo(() => {
    const ms = Date.parse(formState.estimatedDeliveryDate);
    return Number.isFinite(ms) ? ms : departureMs + 24 * 3600 * 1000;
  }, [formState.estimatedDeliveryDate, departureMs]);

  /** Location codes in the order the corridor visits them. */
  const routeOrder = React.useMemo(
    () =>
      buildRouteOrder(
        formState.originCode,
        waypoints.map((w) => w.code).filter((c): c is string => Boolean(c)),
        formState.destinationCode
      ),
    [formState.originCode, waypoints, formState.destinationCode]
  );

  /** Live validation findings for the timeline. */
  const milestoneIssues = React.useMemo(
    () =>
      detectMilestoneIssues(
        milestones,
        { departureMs, deliveryMs },
        routeOrder,
        formState.originCode,
        formState.destinationCode
      ),
    [
      milestones,
      departureMs,
      deliveryMs,
      routeOrder,
      formState.originCode,
      formState.destinationCode,
    ]
  );

  /**
   * Appends a new checkpoint to the timeline and keeps the sequence valid.
   */
  const handleAddMilestone = (milestone: TrackingMilestone) => {
    setMilestones((prev) =>
      normalizeMilestones([...prev, { ...milestone, isCustom: true }], { departureMs, deliveryMs })
    );
  };

  /**
   * Removes a checkpoint from the timeline.
   */
  const handleDeleteMilestone = (index: number) => {
    setMilestones((prev) => {
      return prev.filter((_, idx) => idx !== index).map((m) => ({ ...m, isCustom: true }));
    });
  };

  /**
   * Restores a previously captured timeline — used to roll back an edit the
   * admin cancelled, including any reordering done while editing.
   */
  const handleRestoreMilestones = (list: TrackingMilestone[]) => {
    setMilestones(list);
  };

  /**
   * Applies an admin edit to a single checkpoint, then re-applies every
   * guardrail: timestamps are clamped into the shipment window, kept
   * chronological, and a location that would send the corridor back on
   * itself is automatically re-sequenced.
   */
  const handleUpdateMilestone = (
    index: number,
    patch: Partial<TrackingMilestone>
  ) => {
    setMilestones((prev) => {
      let next = prev.map((m, i) => (i === index ? { ...m, ...patch, isCustom: true } : m));

      // If timestamp changed, cascade adjacent gaps sequentially to all downstream milestones
      if (patch.timestamp && patch.timestamp !== prev[index]?.timestamp) {
        next = cascadeMilestoneGaps(prev, index, patch.timestamp, {
          outputFormat: "iso",
        });

        // Synchronize departureDate if milestone #0 timestamp changed
        if (index === 0) {
          setFormState((fs) => ({
            ...fs,
            departureDate: patch.timestamp!,
          }));
        }

        // Synchronize estimatedDeliveryDate to match the final milestone's new timestamp
        const finalMs = next[next.length - 1]?.timestamp;
        if (finalMs) {
          setFormState((fs) => ({
            ...fs,
            estimatedDeliveryDate: finalMs,
          }));
        }
      }

      if (patch.locationCode) {
        const { list, moved } = reconcileLocationOrder(
          next,
          index,
          routeOrder
        );
        next = moved ? reassignTimestamps(list) : list;
      }

      return next;
    });
  };

  /**
   * Moves a checkpoint up or down in the timeline. The milestone moving up inherits
   * the timestamp of the milestone going down, and the milestone going down inherits
   * the timestamp of the milestone going up (a pure timestamp swap).
   */
  const handleReorderMilestone = (fromIndex: number, toIndex: number) => {
    setMilestones((prev) => {
      return swapMilestonesWithTimestampInheritance(prev, fromIndex, toIndex).map((m) => ({
        ...m,
        isCustom: true,
      }));
    });
  };

  // Route Calculation Trigger
  const handleGenerateRoute = async () => {
    if (hasCustomMilestones) {
      setPendingChange({
        title: "Regenerating Route",
        description: "Recalculating route for the selected locations and dates.",
        applyFormState: {},
      });
      return;
    }

    setIsCalculatingRoute(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/route/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          originQuery: formState.originName,
          destQuery: formState.destinationName,
          originCoords: formState.originCoordinates,
          destCoords: formState.destinationCoordinates,
          departureDate: new Date(formState.departureDate).toISOString(),
          estimatedDeliveryDate: formState.estimatedDeliveryDate
            ? new Date(formState.estimatedDeliveryDate).toISOString()
            : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate realistic route");
      }

      setRouteCoordinates(data.coordinates || data.routeCoordinates || []);
      setWaypoints(data.waypoints || []);
      setMilestones(data.milestones || []);
      setTrackingCode(data.trackingCode || data.carrierTrackingCode || "");
      setRouteSummary({
        distanceKm: data.distanceKm,
        durationHours: data.durationHours,
        passages: data.passages,
      });

      // Populate logistics defaults
      if (data.logisticsDefaults || data.conveyanceDefaults) {
        const d = data.logisticsDefaults || data.conveyanceDefaults;
        setFormState((prev) => ({
          ...prev,
          conveyanceName: d.conveyanceName || prev.conveyanceName,
          conveyanceIdentifier: d.conveyanceIdentifier || prev.conveyanceIdentifier,
          voyageNumber: d.voyageCode || prev.voyageNumber,
          consignmentReference: d.consignmentReference || prev.consignmentReference,
          containerNumber: d.containerNumber || prev.containerNumber,
          sealNumber: d.sealNumber || prev.sealNumber,
        }));
      }

      // Update gateway codes if returned
      if (data.originGateway) {
        setFormState((prev) => ({
          ...prev,
          originCode: data.originGateway.code || prev.originCode,
          originCountry: data.originGateway.country || prev.originCountry,
          originCountryCode: data.originGateway.countryCode || prev.originCountryCode,
        }));
      }
      if (data.destGateway) {
        setFormState((prev) => ({
          ...prev,
          destinationCode: data.destGateway.code || prev.destinationCode,
          destinationCountry: data.destGateway.country || prev.destinationCountry,
          destinationCountryCode: data.destGateway.countryCode || prev.destinationCountryCode,
        }));
      }

      // Route is now in sync with the route inputs — downstream stage unlocked.
      setHasValidRoute(true);

      activeRouteSnapshot.current = {
        originName: formState.originName,
        originCode: data.originGateway?.code || formState.originCode,
        originCountry: data.originGateway?.country || formState.originCountry,
        originCountryCode: data.originGateway?.countryCode || formState.originCountryCode,
        originCoordinates: formState.originCoordinates,
        destinationName: formState.destinationName,
        destinationCode: data.destGateway?.code || formState.destinationCode,
        destinationCountry: data.destGateway?.country || formState.destinationCountry,
        destinationCountryCode: data.destGateway?.countryCode || formState.destinationCountryCode,
        destinationCoordinates: formState.destinationCoordinates,
        departureDate: formState.departureDate,
        estimatedDeliveryDate: formState.estimatedDeliveryDate,
        mode,
      };
    } catch (err: unknown) {
      console.error("Route calculation error:", err);
      toast.destructive(
        err instanceof Error ? err.message : "Route calculation error"
      );
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pieces = Number(formState.totalPieces);
    const weight = Number(formState.grossWeightKg);
    const goods = formState.goodsDescription.trim();
    const conveyance = formState.conveyanceName.trim();

    if (!Number.isFinite(pieces) || pieces <= 0) {
      toast.destructive("Total pieces must be a positive number.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.destructive("Gross weight must be a positive number.");
      return;
    }
    if (!goods) {
      toast.destructive("A goods description is required.");
      return;
    }
    if (!conveyance) {
      toast.destructive(
        "A conveyance is required. Generate the route to populate one, or enter it manually."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedCode =
        trackingCode || `RIL-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${formState.destinationCountryCode || "US"}`;

      const now = new Date();
      const depDate = new Date(formState.departureDate);
      const estDelDate = new Date(formState.estimatedDeliveryDate);

      // Determine initial status based on schedule
      const initialStatus = deriveShipmentStatus(
        formState.departureDate,
        formState.estimatedDeliveryDate,
        { now }
      );

      // Polyline coordinates fallback
      const finalCoords =
        routeCoordinates.length > 0
          ? routeCoordinates
          : [formState.originCoordinates, formState.destinationCoordinates];

      // Assemble complete strictly typed Shipment payload with ZERO undefined
      const shipmentPayload: Shipment = {
        id: generatedCode,
        trackingCode: generatedCode,
        mode,
        status: initialStatus,

        originName: formState.originName || "Origin Facility",
        originCode: formState.originCode || "ORIG",
        originCountry: formState.originCountry || "United States",
        originCoordinates: formState.originCoordinates,

        destinationName: formState.destinationName || "Destination Facility",
        destinationCode: formState.destinationCode || "DEST",
        destinationCountry: formState.destinationCountry || "United States",
        destinationCoordinates: formState.destinationCoordinates,

        departureDate: depDate.toISOString(),
        estimatedDeliveryDate: estDelDate.toISOString(),
        actualDeliveryDate: null,

        isPaused: false,
        pausedAtTimestamp: null,
        pausedLocationName: null,
        pausedCoordinates: null,
        pausedReason: null,

        conveyanceName: conveyance,
        conveyanceIdentifier: formState.conveyanceIdentifier.trim() || null,
        voyageNumber: formState.voyageNumber.trim() || null,
        consignmentReference:
          formState.consignmentReference.trim() ||
          `REF-${Date.now().toString().slice(-6)}`,
        containerNumber: formState.containerNumber.trim() || null,
        sealNumber: formState.sealNumber.trim() || null,

        totalPieces: pieces,
        grossWeightKg: weight,
        volumeCbm: formState.volumeCbm ? Number(formState.volumeCbm) : null,
        goodsDescription: goods,
        clientName: formState.clientName.trim() || null,

        routeCoordinates: finalCoords,
        waypoints: synchronizeWaypoints(
          waypoints,
          formState.departureDate,
          formState.estimatedDeliveryDate,
          { now }
        ),
        milestones: milestones.map((m) => {
          const mTime = new Date(m.timestamp).getTime();
          const hasPassed = !Number.isNaN(mTime) && mTime <= now.getTime();
          return {
            ...m,
            isCompleted: hasPassed,
            isHoldGate: hasPassed ? false : Boolean(m.isHoldGate),
          };
        }),

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // The data layer allocates a unique document id and guarantees it can
      // never collide with an existing shipment.
      const created = await createShipmentRecord(shipmentPayload);
      setSuccessShipment({
        id: created.id,
        trackingCode: created.trackingCode,
      });
    } catch (err) {
      console.error("Failed to create shipment:", err);
      toast.destructive(
        err instanceof Error
          ? err.message
          : "Failed to persist shipment record"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modes: { label: string; value: TransportMode }[] = [
    { label: "Ocean Freight", value: "ocean" },
    { label: "Air Cargo", value: "air" },
    { label: "Intermodal Rail", value: "rail" },
    { label: "Road Freight", value: "road" },
  ];

  const modeLabels = {
    ocean: { conveyance: "Vessel Name", identifier: "IMO Number", voyage: "Voyage Code", reference: "Bill of Lading (B/L)", container: "Container Number", seal: "Seal Number" },
    air: { conveyance: "Flight Number", identifier: "Aircraft Type", voyage: "Manifest ID", reference: "Air Waybill (AWB)", container: "ULD Number", seal: "Tamper Seal" },
    rail: { conveyance: "Train ID", identifier: "Locomotive ID", voyage: "Block ID", reference: "Consignment Note (CIM)", container: "Railcar Number", seal: "Seal Number" },
    road: { conveyance: "Truck / Fleet ID", identifier: "License Plate / VIN", voyage: "Route Run", reference: "CMR Consignment Note", container: "Trailer Number", seal: "Bolt Seal" },
  };
  const labels = modeLabels[mode];

  if (successShipment) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-3xl mb-4">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Shipment Created Successfully
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The shipment record has been persisted directly to Firestore.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-mono text-sm inline-block mb-8">
          <span className="text-slate-400 block text-xs uppercase mb-1">Public Tracking Code</span>
          <span className="text-lg font-bold text-[#0F313A] dark:text-emerald-400">
            {successShipment.trackingCode}
          </span>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/admin/shipments"
            className="px-6 py-3 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black text-sm font-bold uppercase tracking-wider transition-colors hover:opacity-90"
          >
            View Shipments List
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccessShipment(null);
              setRouteCoordinates([]);
              setMilestones([]);
              setWaypoints([]);
              setRouteSummary(null);
            }}
            className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Create Another Shipment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Main Studio Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Route Setup: Transport Mode, Facilities, Schedule & Cargo */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
            {/* Route & Schedule: Transport Mode, Facilities & Timing */}
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white mb-4">
                Route &amp; Schedule
              </h2>
              <label
                htmlFor="transport-mode"
                className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2"
              >
                Transport Mode
              </label>
              <Select
                id="transport-mode"
                value={mode}
                onChange={(e) => {
                  const newMode = e.target.value as TransportMode;
                  requestRouteChange({
                    title: "Changing Transport Mode",
                    description: `Switching to ${newMode} freight will affect your timeline corridor.`,
                    applyFormState: {},
                    applyMode: newMode,
                  });
                }}
                className="h-14 border-0 bg-[#0F313A] px-5 py-4 text-base font-semibold text-white focus:ring-2 focus:ring-white/30 dark:border-0 dark:bg-[#0F313A] dark:text-white dark:focus:ring-white/30"
                chevronClassName="text-white [&>svg]:h-5 [&>svg]:w-5"
              >
                {modes.map((m) => (
                  <option
                    key={m.value}
                    value={m.value}
                    className="bg-white text-base font-semibold text-[#0F313A] dark:bg-slate-900 dark:text-white"
                  >
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Origin & Destination Autocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AddressAutocomplete
                label="Origin Location"
                value={formState.originName}
                codeValue={formState.originCode}
                mode={mode}
                placeholder="Search origin port, airport, or hub..."
                onChangeText={(v) => {
                  setFormState((prev) => ({ ...prev, originName: v }));
                  if (!hasCustomMilestones) {
                    invalidateRoute();
                  }
                }}
                onSelect={(loc) => {
                  requestRouteChange({
                    title: "Changing Origin Location",
                    description: `Switching origin to ${loc.name} will recalculate the route corridor.`,
                    applyFormState: {
                      originName: loc.name,
                      originCode: loc.code || "",
                      originCountry: loc.country,
                      originCountryCode: loc.countryCode || "US",
                      originCoordinates: loc.coordinates,
                    },
                  });
                }}
              />

              <AddressAutocomplete
                label="Destination Location"
                value={formState.destinationName}
                codeValue={formState.destinationCode}
                mode={mode}
                placeholder="Search destination facility..."
                onChangeText={(v) => {
                  setFormState((prev) => ({ ...prev, destinationName: v }));
                  if (!hasCustomMilestones) {
                    invalidateRoute();
                  }
                }}
                onSelect={(loc) => {
                  requestRouteChange({
                    title: "Changing Destination Location",
                    description: `Switching destination to ${loc.name} will recalculate the route corridor.`,
                    applyFormState: {
                      destinationName: loc.name,
                      destinationCode: loc.code || "",
                      destinationCountry: loc.country,
                      destinationCountryCode: loc.countryCode || "US",
                      destinationCoordinates: loc.coordinates,
                    },
                  });
                }}
              />
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Departure Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={formState.departureDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    requestRouteChange({
                      title: "Changing Departure Date",
                      description: "Changing dates will affect your edited timeline.",
                      applyFormState: { departureDate: val },
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Estimated Delivery Date
                </label>
                <input
                  type="datetime-local"
                  value={formState.estimatedDeliveryDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    requestRouteChange({
                      title: "Changing Delivery Date",
                      description: "Changing dates will affect your edited timeline.",
                      applyFormState: { estimatedDeliveryDate: val },
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>
            </div>

            {/* Cargo Particulars */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                Cargo Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField
                  label="Total Pieces"
                  type="number"
                  required
                  value={formState.totalPieces}
                  onChange={(v) => handleChange("totalPieces", v)}
                  placeholder="500"
                />
                <InputField
                  label="Gross Weight (KG)"
                  type="number"
                  required
                  value={formState.grossWeightKg}
                  onChange={(v) => handleChange("grossWeightKg", v)}
                  placeholder="18450"
                />
                <InputField
                  label="Volume (CBM)"
                  type="number"
                  value={formState.volumeCbm}
                  onChange={(v) => handleChange("volumeCbm", v)}
                  placeholder="68.5"
                />
              </div>
              <InputField
                label="Client / Consignee Name"
                value={formState.clientName}
                onChange={(v) => handleChange("clientName", v)}
                placeholder="e.g. Global Tech Automation Ltd."
              />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Goods Description
                </label>
                <textarea
                  value={formState.goodsDescription}
                  required
                  onChange={(e) => handleChange("goodsDescription", e.target.value)}
                  placeholder="Describe cargo contents and packaging..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 resize-none"
                />
              </div>
            </div>

            {/* Generate Route Action — hidden once the route is computed */}
            {!hasValidRoute && (
              <div className="flex justify-end">
                <PrimaryActionButton
                  type="button"
                  label="Generate Route"
                  icon={<ArrowDown strokeWidth={2.5} />}
                  onClick={handleGenerateRoute}
                  loading={isCalculatingRoute}
                />
              </div>
            )}
          </div>

          {/* Conveyance & Logistics Identifiers — revealed after a route is generated */}
          {hasValidRoute && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                  Conveyance &amp; Documents
                </h2>
                {trackingCode && (
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Tracking: {trackingCode}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label={labels.conveyance}
                  value={formState.conveyanceName}
                  onChange={(v) => handleChange("conveyanceName", v)}
                  placeholder="e.g. M/V RIL PACIFIC"
                />
                <InputField
                  label={labels.identifier}
                  value={formState.conveyanceIdentifier}
                  onChange={(v) => handleChange("conveyanceIdentifier", v)}
                  placeholder="e.g. IMO 9811000"
                  mono
                />
                {labels.voyage && (
                  <InputField
                    label={labels.voyage}
                    value={formState.voyageNumber}
                    onChange={(v) => handleChange("voyageNumber", v)}
                    placeholder="e.g. 2611E"
                    mono
                  />
                )}
                <InputField
                  label={labels.reference}
                  value={formState.consignmentReference}
                  onChange={(v) => handleChange("consignmentReference", v)}
                  placeholder="e.g. RILU-8492019"
                  mono
                />
                {labels.container && (
                  <InputField
                    label={labels.container}
                    value={formState.containerNumber}
                    onChange={(v) => handleChange("containerNumber", v)}
                    placeholder="e.g. RILU 849201-9"
                    mono
                  />
                )}
                {labels.seal && (
                  <InputField
                    label={labels.seal}
                    value={formState.sealNumber}
                    onChange={(v) => handleChange("sealNumber", v)}
                    placeholder="e.g. RIL-99201"
                    mono
                  />
                )}
              </div>

              {/* Create Shipment Action */}
              <div className="flex justify-end mt-6">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  isLoading={isSubmitting}
                  className="gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider shadow-md shadow-red-900/20"
                >
                  {isSubmitting ? (
                    "Creating Shipment..."
                  ) : (
                    <>
                      <PackagePlus className="h-4 w-4" />
                      Create Shipment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Mini-Map Preview & Checkpoint Stepper (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Route Map Preview */}
          <div className="relative w-full rounded-3xl overflow-hidden">
            {/* Floating Header on top of map */}
            <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none">
              <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-sm">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Interactive Corridor Preview
                </h3>
              </div>
              {routeSummary && (
                <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-sm">
                  {routeSummary.distanceKm.toLocaleString()} km
                  {routeSummary.passages && routeSummary.passages.length > 0
                    ? ` (${routeSummary.passages.join(", ")})`
                    : ""}
                </div>
              )}
            </div>

            <RouteMiniMap
              routeCoordinates={
                routeCoordinates.length > 0
                  ? routeCoordinates
                  : [formState.originCoordinates, formState.destinationCoordinates]
              }
              origin={{
                name: formState.originName,
                coordinates: formState.originCoordinates,
              }}
              destination={{
                name: formState.destinationName,
                coordinates: formState.destinationCoordinates,
              }}
              waypoints={waypoints}
              mode={mode}
              height="380px"
            />
          </div>

          {/* Checkpoint Stepper */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
            <CheckpointStepper
              milestones={milestones}
              onToggleHoldGate={handleToggleHoldGate}
              onUpdateMilestone={handleUpdateMilestone}
              onReorder={handleReorderMilestone}
              onRestoreMilestones={handleRestoreMilestones}
              onAddMilestone={handleAddMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              mode={mode}
              issues={milestoneIssues}
            />
          </div>
        </div>
      </form>

      {/* Route Change Confirmation Modal for Edited Timeline */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Close / Cancel Button */}
            <button
              type="button"
              onClick={handleCancelChange}
              className="absolute top-5 right-5 p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 transition-colors"
              aria-label="Cancel and close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Information (2 lines) */}
            <div className="pr-8 space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Changing dates or location will affect your edited timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Do you want to clear and recreate, or create with your edited timeline?
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleProceedClear}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Clear &amp; Recreate
              </button>
              <button
                type="button"
                onClick={handleRecalculateWithEdited}
                className="flex-1 px-4 py-3 rounded-xl bg-[#0F313A] dark:bg-emerald-500 text-white dark:text-slate-950 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md"
              >
                Create with edited timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Input Field
function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30",
          mono && "font-mono"
        )}
      />
    </div>
  );
}
