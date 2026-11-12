"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getShipmentByTrackingCode,
  getShipmentRecord,
  listenToShipmentRecord,
} from "@/shared/lib/firebase";
import { DEMO_SHIPMENTS } from "@/shared/lib/demoData";
import type { Shipment, TransportMode } from "@/shared/types";
import TrackingTimeline from "@/features/tracking/components/TrackingTimeline";
import {
  Ship,
  Plane,
  Train,
  Truck,
  AlertTriangle,
  ArrowRight,
  Clock,
  Package,
  FileText,
  Weight,
  Layers,
  Search,
  CheckCircle2,
} from "lucide-react";

// Dynamically load LiveTrackingMap with SSR disabled to prevent Leaflet window reference errors
const LiveTrackingMap = dynamic(
  () => import("@/features/tracking/components/LiveTrackingMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl bg-slate-900 border border-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium tracking-wide">Initializing Global Telemetry & Satellite Maps...</p>
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

  const codeParam = React.useMemo(() => {
    const raw = Array.isArray(params?.code) ? params.code[0] : (params?.code as string);
    return raw ? decodeURIComponent(raw).trim() : "";
  }, [params]);

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

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
        // 1. Try finding by tracking code (case-insensitive / uppercase)
        let found = await getShipmentByTrackingCode(codeParam.toUpperCase());

        // 2. Try raw tracking code
        if (!found && codeParam !== codeParam.toUpperCase()) {
          found = await getShipmentByTrackingCode(codeParam);
        }

        // 3. Try document ID
        if (!found) {
          found = await getShipmentRecord(codeParam);
        }

        // 4. Fallback to demo shipments
        if (!found) {
          const clean = codeParam.toLowerCase();
          const demoMatch = DEMO_SHIPMENTS.find(
            (s) =>
              s.trackingCode.toLowerCase() === clean ||
              s.id.toLowerCase() === clean ||
              s.consignmentReference.toLowerCase() === clean
          );
          if (demoMatch) {
            found = demoMatch;
          }
        }

        if (isMounted) {
          setShipment(found);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Firestore lookup failed, checking local demo datasets:", err);
        const demoMatch = DEMO_SHIPMENTS.find(
          (s) =>
            s.trackingCode.toLowerCase() === codeParam.toLowerCase() ||
            s.id.toLowerCase() === codeParam.toLowerCase()
        );
        if (isMounted) {
          setShipment(demoMatch || null);
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
      (updatedShipment) => {
        if (updatedShipment) {
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
        <div className="max-w-xl mx-auto text-center bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-[#BA1C20] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Shipment Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            No live shipment matched tracking reference <code className="font-mono text-black dark:text-white font-bold">{codeParam}</code>.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. RIL-8492-3019-US"
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#BA1C20]"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Track
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Try a verified sample shipment:
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_SHIPMENTS.slice(0, 3).map((demo) => (
                <Link
                  key={demo.id}
                  href={`/tracking/${demo.trackingCode}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {demo.trackingCode} ({demo.mode})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatStatus = (s: string) => s.replace(/_/g, " ").toUpperCase();

  const isDelivered = shipment.status === "delivered";
  const etaDate = shipment.actualDeliveryDate || shipment.estimatedDeliveryDate;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
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

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              Telemetry Synchronized
            </span>
          </div>
        </div>

        {/* Telemetry Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white">
                  {shipment.trackingCode}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {getModeIcon(shipment.mode)} {shipment.mode}
                </span>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                    shipment.isPaused
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                      : isDelivered
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-[#0F313A]/10 text-[#0F313A] dark:bg-sky-950 dark:text-sky-300"
                  }`}
                >
                  {formatStatus(shipment.status)}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">
                Conveyance: <strong className="text-slate-700 dark:text-slate-300">{shipment.conveyanceName}</strong>
                {shipment.voyageNumber ? ` | Voyage: ${shipment.voyageNumber}` : ""}
              </p>
            </div>

            {/* Estimated Delivery / ETA Countdown */}
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
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
          </div>

          {/* Route Overview Vector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                A
              </div>
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
              <div className="w-8 h-8 rounded-full bg-[#BA1C20] text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                B
              </div>
            </div>
          </div>
        </div>

        {/* Operational Pause / Hold Gate Alert Banner */}
        {shipment.isPaused && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 rounded-3xl p-5 shadow-lg flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                Operational Hold Gate Active — Simulation Paused
              </h4>
              <p className="text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed">
                {shipment.pausedReason || "This shipment has been held by port authorities or customs officials. Tracking telemetry will resume once the administrative gate is released."}
              </p>
              {shipment.pausedLocationName && (
                <p className="text-[11px] font-mono font-semibold text-amber-800 dark:text-amber-400 pt-1">
                  Paused Location: {shipment.pausedLocationName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bento Grid: 2/3 Map and 1/3 Manifest & Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Map Card */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                    Live Geodesic Trajectory
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time AIS / ADS-B vessel positioning & corridor partition
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>GPS Lat/Lon Tracking</span>
                </div>
              </div>

              {/* Interactive Leaflet Map */}
              <LiveTrackingMap shipment={shipment} height="520px" />
            </div>
          </div>

          {/* Sidebar: Cargo Manifest & Milestone Timeline */}
          <div className="lg:col-span-4 space-y-6">
            {/* Cargo Specifications Manifest Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <Package className="w-4 h-4 text-[#BA1C20]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                  Cargo Specifications Manifest
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                    Conveyance & Identification
                  </span>
                  <p className="font-bold text-black dark:text-white mt-0.5">
                    {shipment.conveyanceName}
                  </p>
                  {shipment.conveyanceIdentifier && (
                    <p className="font-mono text-slate-500 text-[11px]">
                      ID: {shipment.conveyanceIdentifier}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                      Consignment Ref
                    </span>
                    <p className="font-mono font-bold text-black dark:text-white mt-0.5">
                      {shipment.consignmentReference}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                      Gross Weight
                    </span>
                    <p className="font-mono font-bold text-black dark:text-white mt-0.5">
                      {shipment.grossWeightKg.toLocaleString()} kg
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                      Total Pieces
                    </span>
                    <p className="font-mono font-bold text-black dark:text-white mt-0.5">
                      {shipment.totalPieces} units
                    </p>
                  </div>
                  {shipment.volumeCbm && (
                    <div>
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                        Volume
                      </span>
                      <p className="font-mono font-bold text-black dark:text-white mt-0.5">
                        {shipment.volumeCbm} CBM
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                    Goods Description
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
                    {shipment.goodsDescription}
                  </p>
                </div>

                {shipment.clientName && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                      Consignee / Client
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {shipment.clientName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Checkpoint Timeline */}
            <TrackingTimeline shipment={shipment} />
          </div>
        </div>
      </div>
    </div>
  );
}
