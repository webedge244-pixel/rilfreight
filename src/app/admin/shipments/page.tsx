"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipments,
  updateShipmentRecord,
  listShipments,
} from "@/shared/lib/firebase";
import type { TransportMode, ShipmentStatus, Shipment } from "@/shared/types";
import {
  releaseShipmentGate,
  triggerShipmentException,
} from "@/features/tracking/services/trackingService";
import {
  Search,
  Filter,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  X,
  ExternalLink,
  Ship,
  Plane,
  Train,
  Truck,
  Plus,
  ChevronDown,
} from "lucide-react";
import { PrimaryActionButton } from "@/shared/components/primaryActionButton";

type FilterMode = "all" | TransportMode;
type TabStatus = "all" | "in_transit" | "paused_hold" | "delivered" | "exceptions";

export default function ShipmentsPage() {
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [modeFilter, setModeFilter] = React.useState<FilterMode>("all");
  const [activeTab, setActiveTab] = React.useState<TabStatus>("all");
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Filter Dropdown State
  const [isFilterOpen, setIsFilterOpen] = React.useState<boolean>(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFilterCount = (modeFilter !== "all" ? 1 : 0) + (activeTab !== "all" ? 1 : 0);

  // Exception Modal State
  const [selectedShipmentForException, setSelectedShipmentForException] = React.useState<Shipment | null>(null);
  const [exceptionReasonPreset, setExceptionReasonPreset] = React.useState<string>("Customs Inspection Hold Gate");
  const [customExceptionReason, setCustomExceptionReason] = React.useState<string>("");
  const [exceptionStatusType, setExceptionStatusType] = React.useState<ShipmentStatus>("customs_hold");
  const [isSubmittingAction, setIsSubmittingAction] = React.useState<boolean>(false);

  // 1. Subscribe to Firestore shipments collection in real time
  React.useEffect(() => {
    const unsubscribe = listenToShipments(
      100,
      (liveList) => {
        setShipments(liveList);
        setLoadError(null);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore onSnapshot error:", error);
        // The live listener failed — fall back to a one-shot read.
        listShipments(100)
          .then((list) => {
            setShipments(list);
            setLoadError(null);
          })
          .catch((fallbackError) => {
            console.error("Firestore fallback read failed:", fallbackError);
            setShipments([]);
            setLoadError(
              "Unable to reach the shipment database. Check the connection and try again."
            );
          })
          .finally(() => setIsLoading(false));
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Quick Action 1: "Release Gate"
  const handleReleaseGate = async (shipment: Shipment) => {
    try {
      setIsSubmittingAction(true);
      const updatedShipment = releaseShipmentGate(shipment);

      // 1. Update Firestore
      await updateShipmentRecord(shipment.id, {
        isPaused: false,
        status: "in_transit",
        pausedReason: "",
        pausedAtTimestamp: "",
        pausedLocationName: "",
        milestones: updatedShipment.milestones,
      });

      // 2. Update local state
      setShipments((prev) =>
        prev.map((s) => (s.id === shipment.id ? updatedShipment : s))
      );

      showToast(`Release Gate: Shipment ${shipment.trackingCode} is now in transit!`, "success");
    } catch (err: unknown) {
      console.error("Failed to release gate:", err);
      showToast(`Failed to release hold gate for ${shipment.trackingCode}`, "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Quick Action 2: Open "Trigger Exception" modal
  const openExceptionModal = (shipment: Shipment) => {
    setSelectedShipmentForException(shipment);
    setExceptionReasonPreset("Customs Inspection Hold Gate");
    setCustomExceptionReason("");
    setExceptionStatusType("customs_hold");
  };

  // Quick Action 2: Submit Exception
  const handleConfirmTriggerException = async () => {
    if (!selectedShipmentForException) return;

    const finalReason = customExceptionReason.trim()
      ? customExceptionReason.trim()
      : exceptionReasonPreset;

    try {
      setIsSubmittingAction(true);
      const updatedShipment = triggerShipmentException(
        selectedShipmentForException,
        finalReason,
        exceptionStatusType
      );

      // 1. Update Firestore
      await updateShipmentRecord(selectedShipmentForException.id, {
        isPaused: true,
        status: exceptionStatusType,
        pausedReason: finalReason,
        pausedAtTimestamp: updatedShipment.pausedAtTimestamp,
        pausedCoordinates: updatedShipment.pausedCoordinates,
      });

      // 2. Update local state
      setShipments((prev) =>
        prev.map((s) => (s.id === selectedShipmentForException.id ? updatedShipment : s))
      );

      showToast(`Exception Triggered: ${selectedShipmentForException.trackingCode} placed on hold.`, "success");
      setSelectedShipmentForException(null);
    } catch (err: unknown) {
      console.error("Failed to trigger exception:", err);
      showToast(`Failed to trigger exception for ${selectedShipmentForException.trackingCode}`, "error");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Filtering Logic
  const filteredShipments = React.useMemo(() => {
    return shipments.filter((s) => {
      // Full-text search
      const matchesSearch =
        searchQuery === "" ||
        s.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.consignmentReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.originName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.destinationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.goodsDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.conveyanceName && s.conveyanceName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Mode filter
      const matchesMode = modeFilter === "all" || s.mode === modeFilter;

      // Status Tab filter
      let matchesTab = true;
      if (activeTab === "in_transit") {
        matchesTab = s.status === "in_transit" && !s.isPaused;
      } else if (activeTab === "paused_hold") {
        matchesTab = s.isPaused === true || s.status === "customs_hold";
      } else if (activeTab === "delivered") {
        matchesTab = s.status === "delivered";
      } else if (activeTab === "exceptions") {
        matchesTab =
          s.status === "weather_delay" ||
          s.status === "customs_hold" ||
          Boolean(s.pausedReason);
      }

      return matchesSearch && matchesMode && matchesTab;
    });
  }, [shipments, searchQuery, modeFilter, activeTab]);

  // Tab counters
  const tabCounts = React.useMemo(() => {
    return {
      all: shipments.length,
      in_transit: shipments.filter((s) => s.status === "in_transit" && !s.isPaused).length,
      paused_hold: shipments.filter((s) => s.isPaused === true || s.status === "customs_hold").length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
      exceptions: shipments.filter(
        (s) => s.status === "weather_delay" || s.status === "customs_hold" || Boolean(s.pausedReason)
      ).length,
    };
  }, [shipments]);

  const modes: { label: string; value: FilterMode }[] = [
    { label: "All Modes", value: "all" },
    { label: "Ocean", value: "ocean" },
    { label: "Air", value: "air" },
    { label: "Rail", value: "rail" },
    { label: "Road", value: "road" },
  ];

  const statusOptions: { label: string; value: TabStatus }[] = [
    { label: "All", value: "all" },
    { label: "In Transit", value: "in_transit" },
    { label: "Paused / Hold", value: "paused_hold" },
    { label: "Delivered", value: "delivered" },
    { label: "Exceptions", value: "exceptions" },
  ];

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "ocean": return <Ship className="w-3.5 h-3.5" />;
      case "air": return <Plane className="w-3.5 h-3.5" />;
      case "rail": return <Train className="w-3.5 h-3.5" />;
      case "road": return <Truck className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "in_transit":
        return "text-[#0F313A] bg-[#0F313A]/10";
      case "delivered":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
      case "customs_hold":
      case "weather_delay":
        return "text-[#BA1C20] bg-[#BA1C20]/10";
      default:
        return "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Database Connection Error */}
      {loadError && (
        <div className="px-5 py-4 rounded-2xl bg-[#BA1C20]/10 text-[#BA1C20] text-sm font-semibold">
          {loadError}
        </div>
      )}

      {/* Search & Unified Filter Pill */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking code, reference, vessel, route..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
          />
        </div>

        {/* Filter Pill with Interactive Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0",
              isFilterOpen || activeFilterCount > 0
                ? "bg-[#0F313A] text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none",
                  isFilterOpen || activeFilterCount > 0
                    ? "bg-[#BA1C20] text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-black dark:text-white"
                )}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-150", isFilterOpen && "rotate-180")}
            />
          </button>

          {/* Dropdown Menu */}
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-2xl z-30 space-y-4 animate-in fade-in zoom-in-95 duration-100">
              {/* Status Section */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setActiveTab(opt.value)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                        activeTab === opt.value
                          ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-mono opacity-70">
                        {tabCounts[opt.value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transport Mode Section */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Transport Mode
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {modes.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setModeFilter(m.value)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                        modeFilter === m.value
                          ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {m.value !== "all" && modeIcon(m.value)}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Action */}
              {activeFilterCount > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("all");
                      setModeFilter("all");
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. MOBILE SHIPMENT CARDS (< md) */}
      <div className="md:hidden space-y-3.5">
        {filteredShipments.map((s) => {
          const hasHoldGate =
            s.isPaused ||
            s.status === "customs_hold" ||
            s.milestones?.some((m) => m.isHoldGate && !m.isCompleted);
          const canTriggerException = s.status !== "delivered";

          return (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              {/* Top Row: Tracking Code + Mode Pill */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/shipments/${s.id}`}
                    className="font-mono font-bold text-base text-black dark:text-white hover:text-[#BA1C20] transition-colors block"
                  >
                    {s.trackingCode}
                  </Link>
                  {s.consignmentReference && (
                    <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[200px]">
                      {s.consignmentReference}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize shrink-0">
                  {modeIcon(s.mode)}
                  <span>{s.mode}</span>
                </div>
              </div>

              {/* Status Badge & Hold Gate Notice */}
              <div>
                {s.isPaused ? (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      HOLD GATE ACTIVE
                    </span>
                    {s.pausedReason && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {s.pausedReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <span
                    className={cn(
                      "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      statusColor(s.status)
                    )}
                  >
                    {formatStatus(s.status)}
                  </span>
                )}
              </div>

              {/* Route & Shipment Meta Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Route
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {s.originCode} → {s.destinationCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    ETA
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {new Date(
                      s.actualDeliveryDate || s.estimatedDeliveryDate
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {s.conveyanceName && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Conveyance
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 truncate block">
                      {s.conveyanceName}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Weight
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {s.grossWeightKg.toLocaleString()} kg
                  </span>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/shipments/${s.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  View Details →
                </Link>
                <div className="flex items-center gap-1.5">
                  {hasHoldGate && (
                    <button
                      type="button"
                      onClick={() => handleReleaseGate(s)}
                      disabled={isSubmittingAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Release
                    </button>
                  )}
                  {canTriggerException && (
                    <button
                      type="button"
                      onClick={() => openExceptionModal(s)}
                      disabled={isSubmittingAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Exception
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredShipments.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
            {shipments.length === 0
              ? "No shipments yet. Create the first shipment to populate the console."
              : "No shipments found matching current query and filters."}
          </div>
        )}
      </div>

      {/* 2. DESKTOP SHIPMENTS TABLE (>= md) */}
      <div className="hidden md:block bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Tracking Code</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Mode</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4 hidden md:table-cell">Conveyance</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4 hidden sm:table-cell">Route</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Status</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4 hidden lg:table-cell">Weight</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">ETA</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map((s) => {
              const hasHoldGate = s.isPaused || s.status === "customs_hold" || s.milestones?.some((m) => m.isHoldGate && !m.isCompleted);
              const canTriggerException = s.status !== "delivered";

              return (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Tracking Code */}
                  <td className="py-3.5 pr-4">
                    <Link
                      href={`/admin/shipments/${s.id}`}
                      className="font-mono font-semibold text-sm text-black dark:text-white hover:text-[#BA1C20] transition-colors block"
                    >
                      {s.trackingCode}
                    </Link>
                    {s.consignmentReference && (
                      <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[140px]">
                        {s.consignmentReference}
                      </span>
                    )}
                  </td>

                  {/* Mode */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 capitalize">
                      {modeIcon(s.mode)}
                      <span>{s.mode}</span>
                    </div>
                  </td>

                  {/* Conveyance */}
                  <td className="py-3.5 pr-4 hidden md:table-cell">
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {s.conveyanceName || "—"}
                    </span>
                  </td>

                  {/* Route */}
                  <td className="py-3.5 pr-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {s.originCode} → {s.destinationCode}
                    </span>
                  </td>

                  {/* Status & Pause Gate Indicator */}
                  <td className="py-3.5 pr-4">
                    {s.isPaused ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          HOLD GATE ACTIVE
                        </span>
                        {s.pausedReason && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 max-w-[180px] truncate" title={s.pausedReason}>
                            {s.pausedReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                          statusColor(s.status)
                        )}
                      >
                        {formatStatus(s.status)}
                      </span>
                    )}
                  </td>

                  {/* Weight */}
                  <td className="py-3.5 pr-4 hidden lg:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {s.grossWeightKg.toLocaleString()} kg
                    </span>
                  </td>

                  {/* ETA */}
                  <td className="py-3.5 pr-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(s.actualDeliveryDate || s.estimatedDeliveryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>

                  {/* Quick Actions */}
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick Action 1: Release Gate */}
                      {hasHoldGate ? (
                        <button
                          type="button"
                          onClick={() => handleReleaseGate(s)}
                          disabled={isSubmittingAction}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                          title="Release Hold Gate and Resume Tracking"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Release Gate
                        </button>
                      ) : null}

                      {/* Quick Action 2: Trigger Exception */}
                      {canTriggerException ? (
                        <button
                          type="button"
                          onClick={() => openExceptionModal(s)}
                          disabled={isSubmittingAction}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                          title="Report Exception or Delay"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Trigger Exception
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredShipments.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  {shipments.length === 0
                    ? "No shipments yet. Create the first shipment to populate the console."
                    : "No shipments found matching current query and filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Exception Trigger Dialog Modal */}
      {selectedShipmentForException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-black dark:text-white">
                  Trigger Operational Exception
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShipmentForException(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <p>
                  Target Shipment: <strong className="font-mono text-black dark:text-white">{selectedShipmentForException.trackingCode}</strong>
                </p>
                <p className="text-slate-500 mt-0.5">
                  Conveyance: {selectedShipmentForException.conveyanceName} ({selectedShipmentForException.mode})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Exception Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExceptionStatusType("customs_hold")}
                    className={cn(
                      "p-3 rounded-xl text-xs font-bold uppercase tracking-wider border text-left transition-all",
                      exceptionStatusType === "customs_hold"
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    Customs Hold Gate
                  </button>
                  <button
                    type="button"
                    onClick={() => setExceptionStatusType("weather_delay")}
                    className={cn(
                      "p-3 rounded-xl text-xs font-bold uppercase tracking-wider border text-left transition-all",
                      exceptionStatusType === "weather_delay"
                        ? "bg-red-500 text-white border-red-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Customs Inspection Hold Gate">Customs Inspection Hold Gate</option>
                  <option value="Port Congestion Dwell Hold">Port Congestion Dwell Hold</option>
                  <option value="Severe Typhoon Warning — Vessel Anchored">Severe Typhoon Warning — Vessel Anchored</option>
                  <option value="Mechanical Conveyance Inspection">Mechanical Conveyance Inspection</option>
                  <option value="Border Transit Security Verification">Border Transit Security Verification</option>
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
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedShipmentForException(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTriggerException}
                disabled={isSubmittingAction}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {isSubmittingAction ? "Applying..." : "Confirm & Pause Gate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
