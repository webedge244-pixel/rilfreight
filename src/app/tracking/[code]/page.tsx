"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getShipmentByTrackingCode,
  listenToShipmentRecord,
} from "@/shared/lib/firebase";
import type { Shipment, TransportMode } from "@/shared/types";
import TrackingTimeline from "@/features/tracking/components/TrackingTimeline";
import { evaluateShipmentProgression } from "@/features/tracking/services/trackingService";
import {
  Ship,
  Plane,
  Train,
  Truck,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle2,
  MapPin,
  X,
  ArrowUpRight,
} from "lucide-react";

// Dynamically load the timeline-driven map with SSR disabled
const TimelineRouteMap = dynamic(
  () => import("@/features/tracking/components/TimelineRouteMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[620px] rounded-3xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">Mapping cleared checkpoints...</p>
      </div>
    ),
  }
);

function getModeIcon(mode: TransportMode) {
  switch (mode) {
    case "ocean":
      return <Ship className="w-4 h-4 text-[#0284c7]" />;
    case "air":
      return <Plane className="w-4 h-4 text-[#8b5cf6]" />;
    case "rail":
      return <Train className="w-4 h-4 text-[#f59e0b]" />;
    case "road":
      return <Truck className="w-4 h-4 text-[#10b981]" />;
  }
}

export default function TrackingDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 border-4 border-[#BA1C20] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
            Loading Telemetry Stream...
          </p>
        </div>
      }
    >
      <TrackingDetailContent />
    </React.Suspense>
  );
}

function TrackingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const codeParam = React.useMemo(() => {
    const raw = Array.isArray(params?.code) ? params.code[0] : (params?.code as string);
    return raw ? decodeURIComponent(raw).trim() : "";
  }, [params]);

  const uidParam = React.useMemo(() => {
    return searchParams ? searchParams.get("uid") : null;
  }, [searchParams]);

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [showManifestModal, setShowManifestModal] = React.useState<boolean>(false);

  // Automatically mark user as connected when they open a tracking link with ?uid=...
  React.useEffect(() => {
    if (!uidParam) return;
    fetch("/api/tracking/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: uidParam }),
    }).catch((err) => {
      console.warn("Connection ping failed:", err);
    });
  }, [uidParam]);

  // Fetch shipment from Firestore with demo fallback
  React.useEffect(() => {
    if (!codeParam) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function loadShipment() {
      try {
        // The tracking code is the shipment's document id, so this resolves
        // with a single point read.
        const found = await getShipmentByTrackingCode(codeParam);

        if (isMounted) {
          if (found) {
            const { updatedShipment, hasChanged } = evaluateShipmentProgression(found);
            if (hasChanged && typeof window !== "undefined") {
              fetch("/api/tracking/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: found.trackingCode }),
              }).catch((err) => console.warn("Background tracking sync failed:", err));
            }
            setShipment(updatedShipment);

            if (typeof window !== "undefined") {
              try {
                const raw = localStorage.getItem("rilfreight_recently_tracked");
                const existing = raw
                  ? (JSON.parse(raw) as Array<{ code: string; origin: string }>).filter(
                      (item) => item.code !== found.trackingCode && item.origin !== "Unknown Origin"
                    )
                  : [];
                const newItem = {
                  code: found.trackingCode,
                  mode: found.mode,
                  origin: `${found.originName} (${found.originCode})`,
                  destination: `${found.destinationName} (${found.destinationCode})`,
                  timestamp: Date.now(),
                };
                localStorage.setItem(
                  "rilfreight_recently_tracked",
                  JSON.stringify([newItem, ...existing].slice(0, 5))
                );
              } catch {
                // Ignore localStorage write failures
              }
            }
          } else if (!found && typeof window !== "undefined") {
            // If shipment is not found (e.g. was deleted by admin), purge it from local cache
            try {
              const raw = localStorage.getItem("rilfreight_recently_tracked");
              if (raw) {
                const existing = JSON.parse(raw) as Array<{ code: string }>;
                const cleaned = existing.filter(
                  (item) => item.code.toUpperCase() !== codeParam.toUpperCase()
                );
                localStorage.setItem("rilfreight_recently_tracked", JSON.stringify(cleaned));
              }
            } catch {
              // Ignore localStorage failures
            }
            setShipment(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Firestore lookup failed:", err);
        if (isMounted) {
          setShipment(null);
          setIsLoading(false);
        }
      }
    }

    loadShipment();

    return () => {
      isMounted = false;
    };
  }, [codeParam]);

  // Real-time synchronization listener when shipment document ID exists
  React.useEffect(() => {
    if (!shipment?.id) return;

    const unsubscribe = listenToShipmentRecord(
      shipment.id,
      (incoming) => {
        if (incoming) {
          const { updatedShipment } = evaluateShipmentProgression(incoming);
          setShipment(updatedShipment);
        }
      },
      (err) => {
        console.warn("Live tracking subscription error:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [shipment?.id]);

  // Periodic progression re-evaluation in case milestone time arrives while user is on page
  React.useEffect(() => {
    if (!shipment?.id || shipment.status === "delivered" || shipment.isPaused) return;

    const checkProgression = () => {
      if (typeof document !== "undefined" && document.hidden) return; // Save CPU when tab is in background
      setShipment((current) => {
        if (!current || current.status === "delivered" || current.isPaused) return current;
        const { updatedShipment, hasChanged } = evaluateShipmentProgression(current);
        if (hasChanged) {
          if (typeof window !== "undefined") {
            fetch("/api/tracking/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: current.trackingCode }),
            }).catch((err) => console.warn("Background tracking sync failed:", err));
          }
          return updatedShipment;
        }
        return current;
      });
    };

    const interval = setInterval(checkProgression, 30000);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", checkProgression);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", checkProgression);
      }
    };
  }, [shipment?.id, shipment?.status, shipment?.isPaused]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tracking/${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-[#BA1C20] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
          Querying Global Tracking Registry...
        </p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-16 px-4">
        <div className="max-w-xl mx-auto text-center bg-white dark:bg-slate-900 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-[#BA1C20] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Shipment Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            No live shipment matched tracking reference <code className="font-mono text-black dark:text-white font-bold">{codeParam}</code>. This shipment record no longer exists or has been removed from the registry.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. RIL-8492-3019-US"
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BA1C20]"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Track
            </button>
          </form>
        </div>
      </div>
    );
  }

  const formatStatus = (s: string) => s.replace(/_/g, " ").toUpperCase();

  const isDelivered = shipment.status === "delivered";
  const isGroundMode = shipment.mode === "rail" || shipment.mode === "road";
  const etaDate = shipment.actualDeliveryDate || shipment.estimatedDeliveryDate;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      {/* Full-Width Edge-to-Edge Telemetry Status Header (No border radius, extends to screen edges) */}
      <section className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Navigation Breadcrumbs & Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/tracking"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:hover:text-white transition-colors"
              >
                ← Search Portal
              </Link>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-mono font-semibold text-slate-400">
                Live Transit Monitor
              </span>
            </div>
          </div>

          {/* Telemetry Status Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white block">
                {shipment.trackingCode}
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                Conveyance: <strong className="text-slate-700 dark:text-slate-300">{shipment.conveyanceName}</strong>
                {shipment.voyageNumber ? ` | Voyage: ${shipment.voyageNumber}` : ""}
              </p>
            </div>

            {/* Estimated Delivery / ETA Countdown */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isDelivered ? "Delivered At" : "Estimated Arrival (ETA)"}
              </p>
              <p className="text-sm font-bold text-black dark:text-white">
                {new Date(etaDate).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Route Overview Vector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Origin Port</p>
                <p className="text-sm font-bold text-black dark:text-white">{shipment.originName}</p>
                <p className="text-xs text-slate-500">{shipment.originCountry} ({shipment.originCode})</p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:justify-end">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-semibold">Destination Port</p>
                <p className="text-sm font-bold text-black dark:text-white">{shipment.destinationName}</p>
                <p className="text-xs text-slate-500">{shipment.destinationCountry} ({shipment.destinationCode})</p>
              </div>
              <MapPin className="w-5 h-5 text-[#BA1C20] shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Page Content (Bento Grid: Map, Manifest & Milestones) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Map Card (7 cols) */}
          <div className="lg:col-span-7">
            <div className="relative w-full rounded-3xl overflow-hidden">
              {/* Floating Header directly on top of map */}
              <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
                <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                    {isGroundMode ? "Timeline Checkpoints" : "Timeline Checkpoint Route"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isGroundMode
                      ? "Recorded checkpoints marked as each timeline event clears"
                      : "Path built from cleared checkpoints, pinned at the last event"}
                  </p>
                </div>
                <div className="hidden sm:block bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-300 shadow-sm">
                  Timeline Synced
                </div>
              </div>

              {/* Interactive Vector Map */}
              <TimelineRouteMap
                mode={shipment.mode}
                milestones={shipment.milestones}
                origin={{
                  name: shipment.originName,
                  code: shipment.originCode,
                  country: shipment.originCountry,
                  coordinates: shipment.originCoordinates,
                }}
                destination={{
                  name: shipment.destinationName,
                  code: shipment.destinationCode,
                  country: shipment.destinationCountry,
                  coordinates: shipment.destinationCoordinates,
                }}
                waypoints={shipment.waypoints}
                routeCoordinates={shipment.routeCoordinates}
                paused={shipment.isPaused}
                pausedCoordinates={shipment.pausedCoordinates}
                vehicleTitle={shipment.conveyanceName}
                vehicleSubtitle={
                  shipment.voyageNumber
                    ? `Voyage ${shipment.voyageNumber}`
                    : shipment.conveyanceIdentifier || undefined
                }
                fitPadding={{ top: 104, bottom: 280, left: 56, right: 56 }}
                legendClassName="bottom-[42%] left-3"
                height="620px"
                className="border border-slate-200 dark:border-slate-800 shadow-inner"
              />

              {/* Cargo Specifications Manifest Overlay (Bottom 40% of Map, flush to bottom & sides, rounded-t-3xl) */}
              <div className="absolute bottom-0 left-0 right-0 z-[400] h-[40%] rounded-t-3xl rounded-b-none border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    CARGO MANIFEST
                  </h3>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                    {shipment.consignmentReference}
                  </span>
                </div>

                {/* Structured metrics on main background with clean vertical hairlines */}
                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 py-3 border-y border-slate-200/70 dark:border-slate-800/70 text-xs">
                  <div className="pr-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Conveyance
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                      {shipment.conveyanceName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                      {shipment.voyageNumber ? `Voyage ${shipment.voyageNumber}` : shipment.conveyanceIdentifier ? `ID: ${shipment.conveyanceIdentifier}` : "Active Transit"}
                    </p>
                  </div>

                  <div className="px-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Gross Weight
                    </span>
                    <p className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {shipment.grossWeightKg.toLocaleString()} <span className="text-xs font-semibold text-slate-500 font-sans">kg</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                      {shipment.volumeCbm ? `${shipment.volumeCbm} CBM` : "Verified Scale"}
                    </p>
                  </div>

                  <div className="pl-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Total Pieces
                    </span>
                    <p className="text-sm sm:text-base font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {shipment.totalPieces} <span className="text-xs font-semibold text-slate-500 font-sans">units</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {shipment.goodsDescription || "General Cargo"}
                    </p>
                  </div>
                </div>

                {/* Signature RIL Freight CTA Button (inspired by home page) */}
                <button
                  type="button"
                  onClick={() => setShowManifestModal(true)}
                  className="group w-full inline-flex items-center justify-between bg-[#0F313A] hover:bg-[#BA1C20] text-white rounded-2xl pl-6 pr-2.5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
                >
                  <span>View Full Manifest Details</span>
                  <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center transition-all duration-300 group-hover:bg-white/25 group-hover:rotate-45">
                    <ArrowUpRight className="w-4 h-4 text-white stroke-[2.5]" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar: Checkpoint Milestone Timeline (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <TrackingTimeline shipment={shipment} />
          </div>
        </div>
      </div>

      {/* Fixed Position Popup Modal for Full Cargo Manifest (Clean unified document canvas) */}
      {showManifestModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  CARGO MANIFEST SPECIFICATIONS
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Consignment Reference: <strong className="text-slate-800 dark:text-slate-200">{shipment.consignmentReference}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManifestModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close manifest"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Conveyance & Transit */}
            <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                CONVEYANCE & TRANSIT INFORMATION
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Conveyance Name</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{shipment.conveyanceName}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Identifier / IMO</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{shipment.conveyanceIdentifier || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Voyage / Flight No</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{shipment.voyageNumber || "—"}</p>
                </div>
              </div>
            </div>

            {/* Section 2: Weight, Quantity & Equipment */}
            <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                WEIGHT, QUANTITY & EQUIPMENT
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gross Weight</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">{shipment.grossWeightKg.toLocaleString()} kg</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Quantity</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">{shipment.totalPieces} units</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Volume</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">{shipment.volumeCbm ? `${shipment.volumeCbm} CBM` : "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Container Number</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{shipment.containerNumber || "Breakbulk"}</p>
                </div>
              </div>
            </div>

            {/* Section 3: Cargo Description & Consignee */}
            <div className="space-y-3 pb-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                CARGO DESCRIPTION & CONSIGNEE
              </h4>
              <div className="space-y-2.5 pt-1">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {shipment.goodsDescription || "Standard commercial freight shipment."}
                </p>
                {shipment.clientName && (
                  <p className="text-xs text-slate-500">
                    Consignee / Client: <strong className="text-slate-800 dark:text-slate-200">{shipment.clientName}</strong>
                  </p>
                )}
                {shipment.sealNumber && (
                  <p className="text-xs text-slate-500 font-mono">
                    Security Seal: <strong className="text-slate-800 dark:text-slate-200">{shipment.sealNumber}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowManifestModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#0F313A] hover:bg-[#BA1C20] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
