"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipments,
  listShipments,
  deleteShipmentRecord,
} from "@/shared/lib/firebase";
import type { TransportMode, Shipment } from "@/shared/types";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Ship,
  Plane,
  Train,
  Truck,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
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

  // Delete Shipment & Cascade Unlink across users
  const [shipmentToDelete, setShipmentToDelete] = React.useState<Shipment | null>(null);
  const [isDeletingShipment, setIsDeletingShipment] = React.useState<boolean>(false);

  const handleConfirmDelete = async () => {
    if (!shipmentToDelete) return;
    setIsDeletingShipment(true);
    try {
      await deleteShipmentRecord(shipmentToDelete.id);
      setShipments((prev) => prev.filter((s) => s.id !== shipmentToDelete.id));
      showToast(
        `Shipment ${shipmentToDelete.trackingCode} deleted and unlinked from all clients.`,
        "success"
      );
      setShipmentToDelete(null);
    } catch (err) {
      console.error("Failed to delete shipment:", err);
      showToast("Failed to delete shipment record.", "error");
    } finally {
      setIsDeletingShipment(false);
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
        {filteredShipments.map((s) => (
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

            {/* Status Badge */}
            <div>
              <span
                className={cn(
                  "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                  s.isPaused ? "text-[#BA1C20] bg-[#BA1C20]/10" : statusColor(s.status)
                )}
              >
                {s.isPaused ? "On Hold" : formatStatus(s.status)}
              </span>
            </div>

            {/* Route & ETA Grid */}
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
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <Link
                href={`/admin/shipments/${s.id}`}
                className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setShipmentToDelete(s)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#BA1C20] hover:bg-[#BA1C20]/10 transition-colors"
                title="Delete Shipment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredShipments.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl">
            {shipments.length === 0
              ? "No shipments yet. Create the first shipment to populate the console."
              : "No shipments found matching current query and filters."}
          </div>
        )}
      </div>

      {/* 2. DESKTOP SHIPMENTS TABLE (>= md) */}
      <div className="hidden md:block bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 lg:p-8 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Tracking Code</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Mode</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Route</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Status</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">ETA</th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map((s) => (
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

                {/* Route */}
                <td className="py-3.5 pr-4">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {s.originCode} → {s.destinationCode}
                  </span>
                </td>

                {/* Status */}
                <td className="py-3.5 pr-4">
                  <span
                    className={cn(
                      "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      s.isPaused ? "text-[#BA1C20] bg-[#BA1C20]/10" : statusColor(s.status)
                    )}
                  >
                    {s.isPaused ? "On Hold" : formatStatus(s.status)}
                  </span>
                </td>

                {/* ETA */}
                <td className="py-3.5 pr-4">
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {new Date(s.actualDeliveryDate || s.estimatedDeliveryDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/shipments/${s.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShipmentToDelete(s)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-[#BA1C20] hover:bg-[#BA1C20]/10 transition-colors"
                      title="Delete Shipment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredShipments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                  {shipments.length === 0
                    ? "No shipments yet. Create the first shipment to populate the console."
                    : "No shipments found matching current query and filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shipment Deletion Confirmation Modal */}
      {shipmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-black dark:text-white">
              Delete Shipment {shipmentToDelete.trackingCode}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will permanently delete the shipment from the registry and immediately wipe it from all connected client accounts.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShipmentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingShipment}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isDeletingShipment ? "Deleting..." : "Delete Everywhere"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
