"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { ArrowDown, PackagePlus } from "lucide-react";
import type {
  TransportMode,
  Shipment,
  RouteWaypoint,
  TrackingMilestone,
} from "@/shared/types";
import { createShipmentRecord } from "@/shared/lib/firebase";
import AddressAutocomplete from "@/features/routing/components/AddressAutocomplete";
import CheckpointStepper from "@/features/routing/components/CheckpointStepper";
import {
  buildRouteOrder,
  detectMilestoneIssues,
  normalizeMilestones,
  reconcileLocationOrder,
  reassignTimestamps,
} from "@/features/routing/lib/milestoneGuards";
import { Select } from "@/shared/components/select";
import { Button } from "@/shared/components/button";
import { PrimaryActionButton } from "@/shared/components/primaryActionButton";

// SSR-safe dynamic import for Leaflet RouteMiniMap
const RouteMiniMap = dynamic(
  () => import("@/features/routing/components/RouteMiniMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 text-xs font-mono">
        Loading Interactive Route Map...
      </div>
    ),
  }
);

export default function NewShipmentPage() {
  const [mode, setMode] = React.useState<TransportMode>("ocean");
  const [isCalculatingRoute, setIsCalculatingRoute] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successShipment, setSuccessShipment] = React.useState<{
    id: string;
    trackingCode: string;
  } | null>(null);

  // Default dates: departure tomorrow, delivery +14 days
  const defaultDep = React.useMemo(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }, []);

  const defaultDel = React.useMemo(() => {
    const d = new Date(Date.now() + 15 * 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  }, []);

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

    totalPieces: "500",
    grossWeightKg: "18450",
    volumeCbm: "68.5",
    goodsDescription: "Industrial automation robotics & precision sensors",
    clientName: "Pacific Rim Logistics Corp",
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

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (ROUTE_FIELDS.has(field)) {
      invalidateRoute();
    }
  };

  const handleToggleHoldGate = (index: number) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, isHoldGate: !m.isHoldGate } : m))
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
      normalizeMilestones([...prev, milestone], { departureMs, deliveryMs })
    );
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
      let next = prev.map((m, i) => (i === index ? { ...m, ...patch } : m));

      if (patch.locationCode) {
        const { list, moved } = reconcileLocationOrder(
          next,
          index,
          routeOrder
        );
        next = moved ? reassignTimestamps(list) : list;
      }

      return normalizeMilestones(next, { departureMs, deliveryMs });
    });
  };

  /**
   * Moves a checkpoint to a new slot in the timeline. The existing time slots
   * are re-assigned in order so the sequence always stays chronological.
   */
  const handleReorderMilestone = (fromIndex: number, toIndex: number) => {
    setMilestones((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return normalizeMilestones(reassignTimestamps(next), { departureMs, deliveryMs });
    });
  };

  // Route Calculation Trigger
  const handleGenerateRoute = async () => {
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
    } catch (err: any) {
      console.error("Route calculation error:", err);
      setErrorMessage(err.message || "Route calculation error");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const generatedCode =
        trackingCode || `RIL-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${formState.destinationCountryCode || "US"}`;

      const now = new Date();
      const depDate = new Date(formState.departureDate);
      const estDelDate = new Date(formState.estimatedDeliveryDate);

      // Determine initial status based on departure date
      const initialStatus = depDate <= now ? "in_transit" : "pending";

      // Polyline coordinates fallback
      const finalCoords =
        routeCoordinates.length > 0
          ? routeCoordinates
          : [formState.originCoordinates, formState.destinationCoordinates];

      // Assemble complete strictly typed Shipment payload with ZERO undefined
      const shipmentPayload: Shipment = {
        id: `shipment-${Date.now()}`,
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

        isPaused: false,

        conveyanceName: formState.conveyanceName || "RIL Scheduled Logistics",
        conveyanceIdentifier: formState.conveyanceIdentifier || "",
        voyageNumber: formState.voyageNumber || "",
        consignmentReference: formState.consignmentReference || `REF-${Date.now().toString().slice(-6)}`,
        containerNumber: formState.containerNumber || "",
        sealNumber: formState.sealNumber || "",

        totalPieces: Number(formState.totalPieces) || 1,
        grossWeightKg: Number(formState.grossWeightKg) || 100,
        volumeCbm: Number(formState.volumeCbm) || 1,
        goodsDescription: formState.goodsDescription || "Standard commercial cargo",
        clientName: formState.clientName || "Corporate Consignee",

        routeCoordinates: finalCoords,
        waypoints: waypoints,
        milestones: milestones,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docId = await createShipmentRecord(shipmentPayload);
      setSuccessShipment({ id: docId, trackingCode: generatedCode });
    } catch (err: any) {
      console.error("Failed to create shipment:", err);
      setErrorMessage(err.message || "Failed to persist shipment record");
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
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

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
                  setMode(e.target.value as TransportMode);
                  invalidateRoute();
                }}
                className="h-14 border-white bg-[#0F313A] px-5 py-4 text-base font-semibold text-white focus:border-white focus:ring-white/30 dark:border-white dark:bg-[#0F313A] dark:text-white dark:focus:border-white dark:focus:ring-white/30"
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
                onChangeText={(v) => handleChange("originName", v)}
                onSelect={(loc) => {
                  setFormState((prev) => ({
                    ...prev,
                    originName: loc.name,
                    originCode: loc.code || "",
                    originCountry: loc.country,
                    originCountryCode: loc.countryCode || "US",
                    originCoordinates: loc.coordinates,
                  }));
                  invalidateRoute();
                }}
              />

              <AddressAutocomplete
                label="Destination Location"
                value={formState.destinationName}
                codeValue={formState.destinationCode}
                mode={mode}
                placeholder="Search destination facility..."
                onChangeText={(v) => handleChange("destinationName", v)}
                onSelect={(loc) => {
                  setFormState((prev) => ({
                    ...prev,
                    destinationName: loc.name,
                    destinationCode: loc.code || "",
                    destinationCountry: loc.country,
                    destinationCountryCode: loc.countryCode || "US",
                    destinationCoordinates: loc.coordinates,
                  }));
                  invalidateRoute();
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
                  onChange={(e) => handleChange("departureDate", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Estimated Delivery Date
                </label>
                <input
                  type="datetime-local"
                  value={formState.estimatedDeliveryDate}
                  onChange={(e) => handleChange("estimatedDeliveryDate", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
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
                  value={formState.totalPieces}
                  onChange={(v) => handleChange("totalPieces", v)}
                  placeholder="500"
                />
                <InputField
                  label="Gross Weight (KG)"
                  type="number"
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
                  onChange={(e) => handleChange("goodsDescription", e.target.value)}
                  placeholder="Describe cargo contents and packaging..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 resize-none"
                />
              </div>
            </div>

            {/* Generate Route Action — hidden once the route is computed */}
            {!hasValidRoute && (
              <div className="flex justify-end">
                <PrimaryActionButton
                  label="Generate Route"
                  icon={<ArrowDown strokeWidth={2.5} />}
                  onClick={handleGenerateRoute}
                  loading={isCalculatingRoute}
                  loadingLabel="Computing Route..."
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
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-4">
            <div className="flex items-center justify-between pb-3 px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Interactive Corridor Preview
              </h3>
              {routeSummary && (
                <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                  {routeSummary.distanceKm.toLocaleString()} km
                  {routeSummary.passages && routeSummary.passages.length > 0
                    ? ` (${routeSummary.passages.join(", ")})`
                    : ""}
                </span>
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
              height="340px"
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
              mode={mode}
              issues={milestoneIssues}
            />
          </div>
        </div>
      </form>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30",
          mono && "font-mono"
        )}
      />
    </div>
  );
}
